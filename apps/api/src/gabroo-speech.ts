import type {FastifyInstance} from "fastify";
import {z} from "zod";
import type {Pool} from "pg";
import type {AppConfig} from "./config.js";
import {authenticateLearner} from "./auth.js";
import {getActiveSubscriptionEntitlement} from "./subscriptions.js";
import type {GabrooSpeechSynthesisProvider} from "./gabroo-speech-synthesis-provider.js";

const speechRequestSchema=z.object({
 text:z.string().trim().min(1).max(4_000),
 speed:z.number().min(0.75).max(1.5)
}).strict();

function sendError(reply:any,requestId:string,status:number,code:string,message:string){
 return reply.code(status).send({error:{code,message,request_id:requestId}});
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

 app.post("/api/v1/gabroo/speech",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return sendError(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account to hear Gabroo speech.");
  const entitlement=await getActiveSubscriptionEntitlement(pool,learner.id);
  if(!entitlement)return sendError(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active Gabenglish subscription is required to use Gabroo speech.");
  const parsed=speechRequestSchema.safeParse(request.body);
  if(!parsed.success)return sendError(reply,request.id,400,"VALIDATION_ERROR","Please provide text and a speaking speed between 0.75× and 1.5×.");
  if(!provider)return sendError(reply,request.id,503,"PROVIDER_UNAVAILABLE","Gabroo's approved speech voice is not configured yet.");
  const controller=new AbortController();
  const onAborted=()=>controller.abort();
  const onResponseClosed=()=>{if(!reply.raw.writableEnded)controller.abort();};
  request.raw.once("aborted",onAborted);
  reply.raw.once("close",onResponseClosed);
  try{
   const result=await provider.synthesize({...parsed.data,signal:controller.signal});
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
   request.raw.removeListener("aborted",onAborted);
   reply.raw.removeListener("close",onResponseClosed);
  }
 });
}
