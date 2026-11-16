import Fastify from "fastify";
import cors from "@fastify/cors";
import {randomUUID} from "node:crypto";
import type {AppConfig} from "./config.js";
import {registerPlacementRoutes} from "./placement.js";
import {registerAuthRoutes,type OtpDeliveryAdapter} from "./auth.js";
import {registerSubscriptionRoutes} from "./subscriptions.js";
import {registerGabrooConversationRoutes,type GabrooConversationProvider} from "./gabroo-conversations.js";
import type {Pool} from "pg";
export async function buildApp(config:AppConfig,databaseCheck:()=>Promise<boolean>,pool?:Pool,otpDelivery?:OtpDeliveryAdapter,gabrooProvider?:GabrooConversationProvider){
 const app=Fastify({logger:config.NODE_ENV!=="test",genReqId:()=>randomUUID(),requestIdHeader:"x-request-id"});
 await app.register(cors,{origin:config.corsOrigins,credentials:true});
 app.get("/api/v1/health",async(_q,r)=>r.code(200).send({status:"ok",request_id:r.request.id}));
 app.get("/api/v1/ready",async(_q,r)=>{let ok=false;try{ok=await databaseCheck();}catch{ok=false;}return r.code(ok?200:503).send({status:ok?"ok":"degraded",checks:{database:ok?"ok":"unavailable"},request_id:r.request.id});});
 await registerPlacementRoutes(app,pool,config);
 if(pool){await registerAuthRoutes(app,pool,config,otpDelivery);await registerSubscriptionRoutes(app,pool,config);await registerGabrooConversationRoutes(app,pool,config,gabrooProvider);}
 app.setNotFoundHandler(async(_q,r)=>r.code(404).send({error:{code:"NOT_FOUND",message:"The requested resource was not found.",request_id:r.request.id}}));
 app.setErrorHandler(async(e,q,r)=>{q.log.error({err:e},"Unhandled request error");return r.code(500).send({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred.",request_id:q.id}});});
 return app;
}
