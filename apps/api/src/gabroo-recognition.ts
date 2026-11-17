import type {FastifyInstance,FastifyRequest} from "fastify";
import type {Pool} from "pg";
import {
 GABROO_AUDIO_MAX_BYTES,
 GABROO_AUDIO_MIME_TYPES,\n GABROO_RECOGNITION_LANGUAGES,
 GabrooRecognitionError,
 gabrooRecognitionLanguageSchema,
 type GabrooSpeechRecognitionProvider
} from "@gabenglish/contracts";
import type {AppConfig} from "./config.js";
import {authenticateLearner} from "./auth.js";
import {getActiveSubscriptionEntitlement} from "./subscriptions.js";
import {recognizeGabrooAudio} from "./gabroo-recognition-service.js";

function sendError(reply:any,requestId:string,status:number,code:string,message:string){
 return reply.code(status).send({error:{code,message,request_id:requestId}});
}

function headerValue(request:FastifyRequest,name:string):string|undefined{
 const value=request.headers[name];
 return typeof value==="string"?value:undefined;
}

export async function registerGabrooRecognitionRoutes(
 app:FastifyInstance,
 pool:Pool,
 config:AppConfig,
 provider?:GabrooSpeechRecognitionProvider
){
 // Audio is parsed as an in-memory Buffer only. Fastify enforces the limit
 // while reading the request; this route never writes the bytes to disk.
 app.addContentTypeParser([...GABROO_AUDIO_MIME_TYPES],{
  parseAs:"buffer",
  bodyLimit:GABROO_AUDIO_MAX_BYTES
 },(_request,body,done)=>{
  done(null,body);
 });


 app.get("/api/v1/gabroo/recognition/status",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return sendError(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account to check Gabroo voice availability.");
  const entitlement=await getActiveSubscriptionEntitlement(pool,learner.id);
  if(!entitlement)return sendError(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active Gabenglish subscription is required to use Gabroo voice recognition.");
  return {
   available:Boolean(provider),
   max_audio_bytes:GABROO_AUDIO_MAX_BYTES,
   supported_mime_types:GABROO_AUDIO_MIME_TYPES,
   supported_languages:GABROO_RECOGNITION_LANGUAGES,
   transcript_review_required:true
  };
 });

 app.post("/api/v1/gabroo/recognition",{
  bodyLimit:GABROO_AUDIO_MAX_BYTES
 },async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return sendError(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account to use Gabroo voice recognition.");
  const entitlement=await getActiveSubscriptionEntitlement(pool,learner.id);
  if(!entitlement)return sendError(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active Gabenglish subscription is required to use Gabroo voice recognition.");

  if(headerValue(request,"x-gabroo-consent")!=="true"){
   return sendError(reply,request.id,400,"CONSENT_REQUIRED","Please confirm that you want this recording processed for speech recognition.");
  }
  if(!provider)return sendError(reply,request.id,503,"PROVIDER_UNAVAILABLE","Speech recognition is not configured yet. Your recording was not processed.");

  const mimeType=headerValue(request,"content-type")?.split(";")[0]?.trim().toLowerCase();
  if(!mimeType||!GABROO_AUDIO_MIME_TYPES.includes(mimeType as typeof GABROO_AUDIO_MIME_TYPES[number])){
   return sendError(reply,request.id,415,"INVALID_AUDIO","This audio format is not supported.");
  }
  const languageHeader=headerValue(request,"x-gabroo-language")??"ml-en";
  const language=gabrooRecognitionLanguageSchema.safeParse(languageHeader);
  if(!language.success)return sendError(reply,request.id,400,"INVALID_AUDIO","Please select a supported recognition language.");

  const body=request.body;
  if(!Buffer.isBuffer(body)||body.byteLength===0){
   return sendError(reply,request.id,400,"INVALID_AUDIO","The audio recording is empty or invalid.");
  }
  if(body.byteLength>GABROO_AUDIO_MAX_BYTES){
   return sendError(reply,request.id,413,"AUDIO_TOO_LARGE","The audio recording exceeds the 10 MB limit.");
  }

  const controller=new AbortController();
  const onAborted=()=>controller.abort();
  request.raw.once("aborted",onAborted);
  try{
   const transcript=await recognizeGabrooAudio({
    audio:new Uint8Array(body.buffer,body.byteOffset,body.byteLength),
    metadata:{mimeType:mimeType as typeof GABROO_AUDIO_MIME_TYPES[number],sizeBytes:body.byteLength,language:language.data},
    consentGranted:true,
    provider,
    signal:controller.signal
   });
   return {transcript,review_required:true,request_id:request.id};
  }catch(error){
   if(error instanceof GabrooRecognitionError){
    const status=error.code==="CONSENT_REQUIRED"?400:
     error.code==="INVALID_AUDIO"?400:
     error.code==="AUDIO_TOO_LARGE"?413:
     error.code==="INVALID_TIMEOUT"?500:503;
    const message=error.code==="PROVIDER_TIMEOUT"?"Speech recognition took too long. Please try again.":
     error.code==="PROVIDER_UNAVAILABLE"?"Speech recognition is not configured yet.":
     error.code==="AUDIO_TOO_LARGE"?"The audio recording exceeds the 10 MB limit.":
     error.code==="INVALID_AUDIO"?"The audio recording is invalid or unsupported.":
     "Speech recognition is temporarily unavailable. Please try again.";
    return sendError(reply,request.id,status,error.code,message);
   }
   request.log.error({request_id:request.id},"Gabroo recognition request failed");
   return sendError(reply,request.id,503,"PROVIDER_FAILED","Speech recognition is temporarily unavailable. Please try again.");
  }finally{
   request.raw.removeListener("aborted",onAborted);
  }
 });
}
