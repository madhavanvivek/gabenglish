import type {FastifyInstance} from "fastify";
import {z} from "zod";
import {createHash,randomBytes} from "node:crypto";
import type {Pool} from "pg";
import type {AppConfig} from "./config.js";
import {authenticateLearner} from "./auth.js";
import {getActiveSubscriptionEntitlement} from "./subscriptions.js";
import type {GabrooSpeechSynthesisProvider} from "./gabroo-speech-synthesis-provider.js";

const activeSpeechLearners=new Set<string>();

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
 provider:GabrooSpeechSynthesisProvider
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
  reply.header("cache-control","private, no-store");
  reply.header("x-content-type-options","nosniff");
  return reply.send(Buffer.from(result.audio));
 }catch(error){
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
 provider?:GabrooSpeechSynthesisProvider
){
 app.get("/api/v1/gabroo/speech/status",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return sendError(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account to check Gabroo speech availability.");
  const entitlement=await getActiveSubscriptionEntitlement(pool,learner.id);
  if(!entitlement)return sendError(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active Gabenglish subscription is required to use Gabroo speech.");
  return {available:Boolean(provider),formats:provider?["audio/mpeg"]:[],speed:{minimum:0.75,maximum:1.5}};
 });


 app.post("/api/v1/gabroo/speech/playback-ticket",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return sendError(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account to prepare Gabroo audio.");
  const entitlement=await getActiveSubscriptionEntitlement(pool,learner.id);
  if(!entitlement)return sendError(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active Gabenglish subscription is required to use Gabroo speech.");
  const parsed=speechRequestSchema.safeParse(request.body);
  if(!parsed.success)return sendError(reply,request.id,400,"VALIDATION_ERROR","Please provide text and a speaking speed between 0.75× and 1.5×.");
  if(!provider)return sendError(reply,request.id,503,"PROVIDER_UNAVAILABLE","Gabroo's approved speech voice is not configured yet.");
  await pool.query("DELETE FROM gabroo_speech_playback_tickets WHERE expires_at < now() - interval '5 minutes'");
  const token=randomBytes(32).toString("hex");
  const digest=createHash("sha256").update(token).digest("hex");
  const result=await pool.query<{expires_at:Date|string}>(
   "WITH learner_lock AS MATERIALIZED (SELECT pg_advisory_xact_lock(hashtextextended($2::text, 0))), superseded AS (UPDATE gabroo_speech_playback_tickets SET consumed_at=now() WHERE user_id=$2 AND consumed_at IS NULL AND EXISTS (SELECT 1 FROM learner_lock) RETURNING token_digest) INSERT INTO gabroo_speech_playback_tickets(token_digest,user_id,speech_text,speech_speed,expires_at) SELECT $1,$2,$3,$4,now()+interval '60 seconds' FROM (SELECT count(*) AS invalidated FROM superseded) AS completed RETURNING expires_at",
   [digest,learner.id,parsed.data.text,parsed.data.speed]
  );
  const expiresAt=result.rows[0]?.expires_at;
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
  return synthesizeAndSend(request,reply,ticket.user_id,ticket.speech_text,Number(ticket.speech_speed),provider);
 });

 app.post("/api/v1/gabroo/speech",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return sendError(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account to hear Gabroo speech.");
  const entitlement=await getActiveSubscriptionEntitlement(pool,learner.id);
  if(!entitlement)return sendError(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active Gabenglish subscription is required to use Gabroo speech.");
  const parsed=speechRequestSchema.safeParse(request.body);
  if(!parsed.success)return sendError(reply,request.id,400,"VALIDATION_ERROR","Please provide text and a speaking speed between 0.75× and 1.5×.");
  if(!provider)return sendError(reply,request.id,503,"PROVIDER_UNAVAILABLE","Gabroo's approved speech voice is not configured yet.");
  return synthesizeAndSend(request,reply,learner.id,parsed.data.text,parsed.data.speed,provider);
 });
}
