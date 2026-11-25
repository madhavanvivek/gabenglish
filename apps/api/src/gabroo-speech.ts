import type {FastifyInstance} from "fastify";
import {z} from "zod";
import {createHash,randomBytes} from "node:crypto";
import type {Pool} from "pg";
import type {AppConfig} from "./config.js";
import {authenticateLearner} from "./auth.js";
import {getActiveSubscriptionEntitlement} from "./subscriptions.js";
import type {GabrooSpeechSynthesisProvider} from "./gabroo-speech-synthesis-provider.js";
import {GabrooSpeechQuotaExceededError,reserveGabrooSpeechUsage} from "./gabroo-speech-usage.js";
import type {GabrooSpeechAlignmentProvider} from "./gabroo-speech-alignment-provider.js";
import {runGabrooSpeechAlignment} from "./gabroo-speech-alignment-provider.js";
import {createGabrooSynthesizedAudioIdentity} from "./gabroo-audio-identity.js";
import {measureGabrooMp3DurationMs} from "./gabroo-mp3-metadata.js";

const activeSpeechLearners=new Set<string>();
const activeAlignmentLearners=new Set<string>();
const GABROO_ALIGNMENT_TIMEOUT_MS=12_000;
const alignmentRequestSchema=z.object({
 audio_base64:z.string().min(4).max(16_777_216),text:z.string().trim().min(1).max(4_000),
 audio_id:z.string().regex(/^[a-f0-9]{64}$/),audio_sha256:z.string().regex(/^[a-f0-9]{64}$/),
 text_sha256:z.string().regex(/^[a-f0-9]{64}$/),duration_ms:z.number().int().positive().max(600_000),
 language:z.enum(["ml","en","mixed"])
}).strict();
const CANONICAL_BASE64=/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const MAX_ALIGNMENT_AUDIO_BYTES=12*1024*1024;

const speechRequestSchema=z.object({
 text:z.string().trim().min(1).max(4_000),
 speed:z.number().min(0.75).max(1.5)
}).strict();

function sendError(reply:any,requestId:string,status:number,code:string,message:string){
 return reply.code(status).send({error:{code,message,request_id:requestId}});
}


async function synthesizeAndSend(
 request:any,
 reply:any,
 learnerId:string,
 text:string,
 speed:number,
 provider:GabrooSpeechSynthesisProvider,
 pool:Pool,
 config:AppConfig
){
 if(activeSpeechLearners.has(learnerId))return sendError(reply,request.id,429,"SPEECH_REQUEST_IN_PROGRESS","Please wait for Gabroo to finish preparing the current reply.");
 activeSpeechLearners.add(learnerId);
 const controller=new AbortController();
 const onAborted=()=>controller.abort();
 const onResponseClosed=()=>{if(!reply.raw.writableEnded)controller.abort();release();};
 let released=false;
 let streaming=false;
 const release=()=>{if(released)return;released=true;activeSpeechLearners.delete(learnerId);request.raw.removeListener("aborted",onAborted);reply.raw.removeListener("close",onResponseClosed);};
 request.raw.once("aborted",onAborted);
 reply.raw.once("close",onResponseClosed);
 try{
  await reserveGabrooSpeechUsage({pool,userId:learnerId,characters:[...text].length,dailyLimit:config.GABROO_TTS_DAILY_CHARACTER_LIMIT,monthlyLimit:config.GABROO_TTS_MONTHLY_CHARACTER_LIMIT});
  const input={text,speed,signal:controller.signal};
  if(provider.synthesizeStream){
   const result=await provider.synthesizeStream(input);
   if(controller.signal.aborted){result.audio.destroy();return;}
   reply.header("content-type",result.contentType);
   if(result.contentLength!==undefined)reply.header("content-length",String(result.contentLength));
   reply.header("cache-control","private, no-store");
   reply.header("x-content-type-options","nosniff");
   result.audio.once("error",(error)=>request.log.error({request_id:request.id,error},"Gabroo audio stream failed"));
   result.audio.once("close",release);
   result.audio.once("end",release);
   reply.raw.once("finish",release);
   streaming=true;
   return reply.send(result.audio);
  }
  const result=await provider.synthesize(input);
  if(controller.signal.aborted)return;
  reply.header("content-type",result.contentType);
  reply.header("content-length",String(result.audio.byteLength));
  if(result.durationMs!==undefined){
   // The exact audio fingerprint is also its alignment audio ID. The one-time
   // ticket ID remains a separate transport identity on mobile.
   const audioSha256=createHash("sha256").update(result.audio).digest("hex");
   reply.header("x-gabroo-audio-id",audioSha256);
   reply.header("x-gabroo-audio-duration-ms",String(result.durationMs));
   reply.header("x-gabroo-audio-sha256",audioSha256);
   reply.header("x-gabroo-text-sha256",createHash("sha256").update(text,"utf8").digest("hex"));
  }
  reply.header("cache-control","private, no-store");
  reply.header("x-content-type-options","nosniff");
  return reply.send(Buffer.from(result.audio));
 }catch(error){
  if(error instanceof GabrooSpeechQuotaExceededError){
   const period=error.period;
   return sendError(reply,request.id,429,period==="day"?"SPEECH_DAILY_QUOTA_EXCEEDED":"SPEECH_MONTHLY_QUOTA_EXCEEDED",period==="day"?"You have reached the daily Gabroo speech allowance. Please try again tomorrow.":"You have reached the monthly Gabroo speech allowance. Your allowance will reset next month.");
  }
  if(controller.signal.aborted)return;
  request.log.error({request_id:request.id},"Gabroo speech synthesis failed");
  return sendError(reply,request.id,502,"SPEECH_SYNTHESIS_FAILED","Gabroo could not prepare speech just now. Please try again.");
 }finally{
  if(!streaming||reply.raw.writableEnded)release();
 }
}

export async function registerGabrooSpeechRoutes(
 app:FastifyInstance,
 pool:Pool,
 config:AppConfig,
 provider?:GabrooSpeechSynthesisProvider,
 alignmentProvider?:GabrooSpeechAlignmentProvider
){
 app.get("/api/v1/gabroo/speech/usage",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return sendError(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account to view Gabroo speech usage.");
  const entitlement=await getActiveSubscriptionEntitlement(pool,learner.id);
  if(!entitlement)return sendError(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active Gabenglish subscription is required to view Gabroo speech usage.");
  const result=await pool.query<{bucket_type:"day"|"month";characters_used:string;requests_count:string;bucket_start:string}>(
   "SELECT bucket_type,characters_used::text,requests_count::text,bucket_start::text FROM gabroo_speech_usage_buckets WHERE user_id=$1 AND ((bucket_type='day' AND bucket_start=timezone('Asia/Kolkata',now())::date) OR (bucket_type='month' AND bucket_start=date_trunc('month',timezone('Asia/Kolkata',now()))::date))",
   [learner.id]
  );
  const usage={day:{characters_used:0,requests_count:0,character_limit:config.GABROO_TTS_DAILY_CHARACTER_LIMIT},month:{characters_used:0,requests_count:0,character_limit:config.GABROO_TTS_MONTHLY_CHARACTER_LIMIT}};
  for(const row of result.rows){
   const target=usage[row.bucket_type];
   target.characters_used=Number(row.characters_used);
   target.requests_count=Number(row.requests_count);
  }
  return {timezone:"Asia/Kolkata",usage:{
   day:{...usage.day,characters_remaining:Math.max(0,usage.day.character_limit-usage.day.characters_used)},
   month:{...usage.month,characters_remaining:Math.max(0,usage.month.character_limit-usage.month.characters_used)}
  }};
 });

 app.get("/api/v1/gabroo/speech/status",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return sendError(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account to check Gabroo speech availability.");
  const entitlement=await getActiveSubscriptionEntitlement(pool,learner.id);
  if(!entitlement)return sendError(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active Gabenglish subscription is required to use Gabroo speech.");
  const available=config.GABROO_TTS_ENABLED&&Boolean(provider);
  return {
   available,
   formats:available?["audio/mpeg"]:[],
   speed:{minimum:0.75,maximum:1.5},
   capabilities:{speech_synthesis:available,character_alignment:Boolean(alignmentProvider),phoneme_alignment:Boolean(alignmentProvider),live_avatar_renderer:false}
  };
 });


 app.post("/api/v1/gabroo/speech/alignment",{bodyLimit:17*1024*1024},async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return sendError(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account to align Gabroo audio.");
  const entitlement=await getActiveSubscriptionEntitlement(pool,learner.id);
  if(!entitlement)return sendError(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active Gabenglish subscription is required to use Gabroo alignment.");
  if(!alignmentProvider)return sendError(reply,request.id,503,"ALIGNMENT_PROVIDER_UNAVAILABLE","Gabroo phoneme alignment is not configured yet.");
  const parsed=alignmentRequestSchema.safeParse(request.body);
  if(!parsed.success)return sendError(reply,request.id,400,"INVALID_ALIGNMENT_REQUEST","The audio alignment request is invalid.");
  if(!CANONICAL_BASE64.test(parsed.data.audio_base64))return sendError(reply,request.id,400,"INVALID_ALIGNMENT_AUDIO","The supplied audio is not valid base64.");
  const audio=Buffer.from(parsed.data.audio_base64,"base64");
  if(audio.byteLength===0||audio.byteLength>MAX_ALIGNMENT_AUDIO_BYTES||audio.toString("base64")!==parsed.data.audio_base64)
   return sendError(reply,request.id,400,"INVALID_ALIGNMENT_AUDIO","The supplied audio is empty, malformed, or exceeds 12 MiB.");
  let measuredDuration:number;
  try{measuredDuration=measureGabrooMp3DurationMs(audio);}catch{return sendError(reply,request.id,400,"INVALID_ALIGNMENT_AUDIO","The supplied audio is not a valid measured MP3.");}
  if(Math.abs(measuredDuration-parsed.data.duration_ms)>1)
   return sendError(reply,request.id,400,"ALIGNMENT_DURATION_MISMATCH","The supplied duration does not match the exact MP3 bytes.");
  const identity=createGabrooSynthesizedAudioIdentity({audio,text:parsed.data.text,durationMs:measuredDuration,audioId:parsed.data.audio_id});
  if(identity.audio_sha256!==parsed.data.audio_sha256||identity.audio_sha256!==parsed.data.audio_id||identity.text_sha256!==parsed.data.text_sha256)
   return sendError(reply,request.id,400,"ALIGNMENT_IDENTITY_MISMATCH","The supplied audio or text identity does not match the exact content.");
  if(activeAlignmentLearners.has(learner.id))return sendError(reply,request.id,429,"ALIGNMENT_REQUEST_IN_PROGRESS","Please wait for Gabroo to finish aligning the current audio.");
  activeAlignmentLearners.add(learner.id);
  const controller=new AbortController(),onAborted=()=>controller.abort();
  let timedOut=false;
  const timeout=setTimeout(()=>{timedOut=true;controller.abort();},GABROO_ALIGNMENT_TIMEOUT_MS);
  request.raw.once("aborted",onAborted);
  try{
   const result=await runGabrooSpeechAlignment(alignmentProvider,{audio,text:parsed.data.text,language:parsed.data.language,identity,signal:controller.signal});
   if(controller.signal.aborted)return;
   reply.header("cache-control","private, no-store");
   return {alignment:result};
  }catch{
   if(request.raw.aborted)return;
   if(timedOut)return sendError(reply,request.id,504,"ALIGNMENT_TIMEOUT","Gabroo audio alignment took too long. Please try again.");
   if(controller.signal.aborted)return;
   request.log.warn({request_id:request.id},"Gabroo alignment provider rejected or failed the request");
   return sendError(reply,request.id,502,"ALIGNMENT_FAILED","Gabroo could not align this audio. Please try again.");
  }finally{
   clearTimeout(timeout);
   request.raw.removeListener("aborted",onAborted);
   activeAlignmentLearners.delete(learner.id);
  }
 });
 app.post("/api/v1/gabroo/speech/playback-ticket",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return sendError(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account to prepare Gabroo audio.");
  const entitlement=await getActiveSubscriptionEntitlement(pool,learner.id);
  if(!entitlement)return sendError(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active Gabenglish subscription is required to use Gabroo speech.");
  const parsed=speechRequestSchema.safeParse(request.body);
  if(!parsed.success)return sendError(reply,request.id,400,"VALIDATION_ERROR","Please provide text and a speaking speed between 0.75× and 1.5×.");
  if(!config.GABROO_TTS_ENABLED)return sendError(reply,request.id,503,"SPEECH_TEMPORARILY_DISABLED","Gabroo speech is temporarily unavailable. Please try again later.");
  if(!provider)return sendError(reply,request.id,503,"PROVIDER_UNAVAILABLE","Gabroo speech is not configured on the server yet.");
  try{
   await pool.query("DELETE FROM gabroo_speech_playback_tickets WHERE ctid IN (SELECT ctid FROM gabroo_speech_playback_tickets WHERE expires_at < now() - interval '5 minutes' ORDER BY expires_at ASC LIMIT 500)");
  }catch(error){
   request.log.warn({request_id:request.id,error},"Gabroo playback ticket cleanup skipped; issuance will continue");
  }
  const token=randomBytes(32).toString("hex");
  const digest=createHash("sha256").update(token).digest("hex");
  const ticketClient=await pool.connect();
  let expiresAt:Date|string|undefined;
  try{
   await ticketClient.query("BEGIN");
   // Acquire the per-learner lock in its own statement so the following
   // UPDATE receives a fresh READ COMMITTED snapshot after any lock wait.
   await ticketClient.query("SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))",[learner.id]);
   await ticketClient.query(
    "UPDATE gabroo_speech_playback_tickets SET consumed_at=now() WHERE user_id=$1 AND consumed_at IS NULL",
    [learner.id]
   );
   const result=await ticketClient.query<{expires_at:Date|string}>(
    "INSERT INTO gabroo_speech_playback_tickets(token_digest,user_id,speech_text,speech_speed,expires_at) VALUES($1,$2,$3,$4,now()+interval '60 seconds') RETURNING expires_at",
    [digest,learner.id,parsed.data.text,parsed.data.speed]
   );
   expiresAt=result.rows[0]?.expires_at;
   if(!expiresAt)throw new Error("Playback ticket insert returned no expiry");
   await ticketClient.query("COMMIT");
  }catch(error){
   await ticketClient.query("ROLLBACK");
   throw error;
  }finally{
   ticketClient.release();
  }
  if(!expiresAt)return sendError(reply,request.id,500,"PLAYBACK_TICKET_FAILED","Gabroo audio could not be prepared. Please try again.");
  return reply.code(201).send({
   playback_url:"/api/v1/gabroo/speech/playback/"+token,
   expires_at:new Date(expiresAt).toISOString(),
   method:"GET",
   headers:{accept:"audio/mpeg"}
  });
 });

 app.get("/api/v1/gabroo/speech/playback/:ticket",async(request,reply)=>{
  const params=request.params as {ticket?:string};
  if(!params.ticket||!/^[0-9a-f]{64}$/.test(params.ticket))
   return sendError(reply,request.id,404,"PLAYBACK_TICKET_INVALID","This Gabroo audio link is invalid or has expired.");
  if(!config.GABROO_TTS_ENABLED)return sendError(reply,request.id,503,"SPEECH_TEMPORARILY_DISABLED","Gabroo speech is temporarily unavailable. Please try again later.");
  if(!provider)return sendError(reply,request.id,503,"PROVIDER_UNAVAILABLE","Gabroo's approved speech voice is not configured yet.");
  const digest=createHash("sha256").update(params.ticket).digest("hex");
  const consumed=await pool.query<{user_id:string;speech_text:string;speech_speed:number|string}>(
   "UPDATE gabroo_speech_playback_tickets SET consumed_at=now() WHERE token_digest=$1 AND consumed_at IS NULL AND expires_at>now() RETURNING user_id,speech_text,speech_speed",
   [digest]
  );
  const ticket=consumed.rows[0];
  if(!ticket)return sendError(reply,request.id,404,"PLAYBACK_TICKET_INVALID","This Gabroo audio link is invalid, expired, or already used.");
  const entitlement=await getActiveSubscriptionEntitlement(pool,ticket.user_id);
  if(!entitlement)return sendError(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active Gabenglish subscription is required to use Gabroo speech.");
  return synthesizeAndSend(request,reply,ticket.user_id,ticket.speech_text,Number(ticket.speech_speed),provider,pool,config);
 });

 app.post("/api/v1/gabroo/speech",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return sendError(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account to hear Gabroo speech.");
  const entitlement=await getActiveSubscriptionEntitlement(pool,learner.id);
  if(!entitlement)return sendError(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active Gabenglish subscription is required to use Gabroo speech.");
  const parsed=speechRequestSchema.safeParse(request.body);
  if(!parsed.success)return sendError(reply,request.id,400,"VALIDATION_ERROR","Please provide text and a speaking speed between 0.75× and 1.5×.");
  if(!config.GABROO_TTS_ENABLED)return sendError(reply,request.id,503,"SPEECH_TEMPORARILY_DISABLED","Gabroo speech is temporarily unavailable. Please try again later.");
  if(!provider)return sendError(reply,request.id,503,"PROVIDER_UNAVAILABLE","Gabroo's approved speech voice is not configured yet.");
  return synthesizeAndSend(request,reply,learner.id,parsed.data.text,parsed.data.speed,provider,pool,config);
 });
}
