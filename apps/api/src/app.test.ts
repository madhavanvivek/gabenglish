import {createHmac} from "node:crypto";
import {describe,it,expect} from "vitest";
import {buildApp} from "./app.js";
import {loadConfig} from "./config.js";

function learnerAuthHeader(secret:string){
 const payload=Buffer.from(JSON.stringify({
  sub:"00000000-0000-4000-8000-000000000001",
  sid:"00000000-0000-4000-8000-000000000002",
  exp:Math.floor(Date.now()/1000)+300,
  iss:"gabenglish-api",
  aud:"gabenglish-app"
 })).toString("base64url");
 const signature=createHmac("sha256",secret).update(payload).digest("base64url");
 return "Bearer "+payload+"."+signature;
}
function recognitionPool(hasEntitlement:boolean){
 return {query:async(sql:string)=>{
  if(sql.includes("FROM users u JOIN refresh_sessions")){
   return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
  }
  if(sql.includes("active_subscription_entitlements")){
   return {rows:hasEntitlement?[{id:"entitlement-1"}]:[]};
  }
  return {rows:[]};
 }} as any;
}

describe("API foundation",()=>{
 it("serves liveness",async()=>{const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>false);const r=await app.inject({method:"GET",url:"/api/v1/health"});expect(r.statusCode).toBe(200);expect(r.json().status).toBe("ok");await app.close();});
 it("reports ready when database check passes",async()=>{const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true);const r=await app.inject({method:"GET",url:"/api/v1/ready"});expect(r.statusCode).toBe(200);await app.close();});
 it("returns 503 when database is unavailable",async()=>{const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>false);const r=await app.inject({method:"GET",url:"/api/v1/ready"});expect(r.statusCode).toBe(503);await app.close();});
 it("rejects unsupported Gabroo audio media types",async()=>{
  const pool={query:async()=>({rows:[]})} as any;
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const r=await app.inject({method:"POST",url:"/api/v1/gabroo/recognition",headers:{"content-type":"application/octet-stream"},payload:Buffer.from([1,2,3])});
  expect(r.statusCode).toBe(415);
  await app.close();
 });
 it("requires an authenticated learner to inspect Gabroo recognition availability",async()=>{
  const pool={query:async()=>({rows:[]})} as any;
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const r=await app.inject({method:"GET",url:"/api/v1/gabroo/recognition/status"});
  expect(r.statusCode).toBe(401);
  expect(r.json().error.code).toBe("VERIFIED_ACCOUNT_REQUIRED");
  await app.close();
 });

 it("returns a validated recognition readiness response to a paid learner",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const app=await buildApp(config,async()=>true,recognitionPool(true));
  const r=await app.inject({method:"GET",url:"/api/v1/gabroo/recognition/status",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
  expect(r.statusCode).toBe(200);
  expect(r.json()).toEqual({
   available:false,
   max_audio_bytes:10*1024*1024,
   supported_mime_types:["audio/mp4","audio/m4a","audio/wav","audio/x-wav","audio/webm","audio/ogg"],
   supported_languages:["ml-IN","en-IN","ml-en"],
   transcript_review_required:true
  });
  await app.close();
 });
 it("does not expose recognition readiness to a free learner",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const app=await buildApp(config,async()=>true,recognitionPool(false));
  const r=await app.inject({method:"GET",url:"/api/v1/gabroo/recognition/status",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
  expect(r.statusCode).toBe(403);
  expect(r.json().error.code).toBe("PAID_SUBSCRIPTION_REQUIRED");
  await app.close();
 });
 it("reports recognition availability only when a provider is injected",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const provider={transcribe:async()=>({text:"hello",languageDetected:"en" as const})};
  const app=await buildApp(config,async()=>true,recognitionPool(true),undefined,undefined,provider);
  const r=await app.inject({method:"GET",url:"/api/v1/gabroo/recognition/status",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
  expect(r.statusCode).toBe(200);
  expect(r.json().available).toBe(true);
  await app.close();
 });

 it("requires an authenticated learner for supported Gabroo audio",async()=>{
  const pool={query:async()=>({rows:[]})} as any;
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const r=await app.inject({method:"POST",url:"/api/v1/gabroo/recognition",headers:{"content-type":"audio/mp4","x-gabroo-consent":"true"},payload:Buffer.from([1,2,3])});
  expect(r.statusCode).toBe(401);
  expect(r.json().error.code).toBe("VERIFIED_ACCOUNT_REQUIRED");
  await app.close();
 });
 it("enforces the 10 MB audio upload limit before route processing",async()=>{
  const pool={query:async()=>({rows:[]})} as any;
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const payload=Buffer.alloc(10*1024*1024+1);
  const r=await app.inject({method:"POST",url:"/api/v1/gabroo/recognition",headers:{"content-type":"audio/mp4","x-gabroo-consent":"true"},payload});
  expect(r.statusCode).toBe(413);
  await app.close();
 });

 it("returns only the learner's selected learning direction from the paid catalog",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const queries:Array<{sql:string;values:unknown[]|undefined}>=[];
  const pool={query:async(sql:string,values?:unknown[])=>{
   queries.push({sql,values});
   if(sql.includes("FROM users u JOIN refresh_sessions")){
    return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   }
   if(sql.includes("active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   if(sql.includes("FROM user_preferences"))return {rows:[{learning_direction:"en_to_ml"}]};
   if(sql.includes("FROM courses c")&&sql.includes("LEFT JOIN lesson_versions"))return {rows:[]};
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  const response=await app.inject({method:"GET",url:"/api/v1/learning/courses",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
  expect(response.statusCode).toBe(200);
  expect(response.json().learning_direction).toBe("en_to_ml");
  expect(response.json().target_language).toBe("ml");
  expect(response.json().courses).toEqual([]);
  const catalogQuery=queries.find(query=>query.sql.includes("FROM courses c")&&query.sql.includes("LEFT JOIN lesson_versions"));
  expect(catalogQuery?.values).toEqual(["en_to_ml"]);
  expect(catalogQuery?.sql).toContain("c.learning_direction=$1");
  expect(catalogQuery?.sql).toContain("lv.educator_review_status='approved'");
  await app.close();
 });
});
