import Fastify from "fastify";
import cors from "@fastify/cors";
import {randomUUID} from "node:crypto";
import type {AppConfig} from "./config.js";
import {registerPlacementRoutes} from "./placement.js";
import {registerAuthRoutes,type OtpDeliveryAdapter} from "./auth.js";
import {registerSubscriptionRoutes} from "./subscriptions.js";
import {registerAdminRoutes} from "./admin.js";
import {registerGabrooConversationRoutes,type GabrooConversationProvider} from "./gabroo-conversations.js";
import {registerGabrooMemoryRoutes} from "./gabroo-memory.js";
import {registerGabrooVocabularyRoutes} from "./gabroo-vocabulary.js";
import {registerLearningRoutes} from "./learning.js";
import {registerGabrooRecognitionRoutes} from "./gabroo-recognition.js";
import type {GabrooSpeechRecognitionProvider} from "@gabenglish/contracts";
import {registerGabrooSpeechRoutes} from "./gabroo-speech.js";
import {registerGabrooRealtimeSessionRoutes} from "./gabroo-realtime-sessions.js";
import type {GabrooSpeechSynthesisProvider} from "./gabroo-speech-synthesis-provider.js";
import type {Pool} from "pg";
export async function buildApp(config:AppConfig,databaseCheck:()=>Promise<boolean>,pool?:Pool,otpDelivery?:OtpDeliveryAdapter,gabrooProvider?:GabrooConversationProvider,gabrooRecognitionProvider?:GabrooSpeechRecognitionProvider,gabrooSpeechProvider?:GabrooSpeechSynthesisProvider){
 const app=Fastify({logger:config.NODE_ENV!=="test"?{redact:{paths:["req.url","req.headers.authorization","req.headers.cookie"],censor:"[REDACTED]"}}:false,genReqId:()=>randomUUID(),requestIdHeader:"x-request-id"});
 await app.register(cors,{origin:config.corsOrigins,credentials:true});
 app.get("/api/v1/health",async(_q,r)=>r.code(200).send({status:"ok",request_id:r.request.id}));
 app.get("/api/v1/ready",async(_q,r)=>{let ok=false;try{ok=await databaseCheck();}catch{ok=false;}return r.code(ok?200:503).send({status:ok?"ok":"degraded",checks:{database:ok?"ok":"unavailable"},capabilities:{gabroo_conversation:gabrooProvider?"configured":"unconfigured",gabroo_recognition:gabrooRecognitionProvider?"configured":"unconfigured",gabroo_speech:gabrooSpeechProvider?"configured":"unconfigured"},request_id:r.request.id});});
 await registerPlacementRoutes(app,pool,config);
 if(pool){await registerAuthRoutes(app,pool,config,otpDelivery);await registerSubscriptionRoutes(app,pool,config);await registerAdminRoutes(app,pool,config);await registerGabrooConversationRoutes(app,pool,config,gabrooProvider);await registerGabrooRecognitionRoutes(app,pool,config,gabrooRecognitionProvider);await registerGabrooSpeechRoutes(app,pool,config,gabrooSpeechProvider);await registerGabrooRealtimeSessionRoutes(app,pool,config);await registerGabrooMemoryRoutes(app,pool,config);await registerGabrooVocabularyRoutes(app,pool,config);await registerLearningRoutes(app,pool,config);}
 app.setNotFoundHandler(async(_q,r)=>r.code(404).send({error:{code:"NOT_FOUND",message:"The requested resource was not found.",request_id:r.request.id}}));
 app.setErrorHandler(async(e,q,r)=>{
  const code=(e as {code?:string}).code;
  if(code==="FST_ERR_CTP_INVALID_MEDIA_TYPE")return r.code(415).send({error:{code:"INVALID_AUDIO",message:"This media type is not supported.",request_id:q.id}});
  if(code==="FST_ERR_CTP_BODY_TOO_LARGE")return r.code(413).send({error:{code:"AUDIO_TOO_LARGE",message:"The request body exceeds the permitted size.",request_id:q.id}});
  q.log.error({err:e},"Unhandled request error");
  return r.code(500).send({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred.",request_id:q.id}});
 });
 return app;
}
