import {createHash,createHmac} from "node:crypto";
import {request as httpRequest} from "node:http";
import {Readable} from "node:stream";
import {describe,it,expect} from "vitest";
import {buildApp} from "./app.js";
import {loadConfig} from "./config.js";
import {createGabrooSynthesizedAudioIdentity} from "./gabroo-audio-identity.js";
import {measureGabrooMp3DurationMs} from "./gabroo-mp3-metadata.js";

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
 },connect:async()=>({query:async(sql:string)=>({rowCount:sql.includes("INSERT INTO gabroo_speech_usage_buckets")?1:0,rows:[]}),release:()=>{}})} as any;
}

describe("API foundation",()=>{
 it("serves liveness",async()=>{const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>false);const r=await app.inject({method:"GET",url:"/api/v1/health"});expect(r.statusCode).toBe(200);expect(r.json().status).toBe("ok");expect(r.json().capabilities).toBeUndefined();await app.close();});
 it("reports ready when database check passes",async()=>{const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true);const r=await app.inject({method:"GET",url:"/api/v1/ready"});expect(r.statusCode).toBe(200);expect(r.json().capabilities).toEqual({gabroo_conversation:"unconfigured",gabroo_recognition:"unconfigured",gabroo_realtime_recognition:"unconfigured",gabroo_speech:"unconfigured",gabroo_alignment:"unconfigured"});await app.close();});
 it("returns 503 when database is unavailable",async()=>{const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>false);const r=await app.inject({method:"GET",url:"/api/v1/ready"});expect(r.statusCode).toBe(503);await app.close();});
 it("requires an authenticated learner to inspect Gabroo speech availability",async()=>{
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,recognitionPool(true));
  const response=await app.inject({method:"GET",url:"/api/v1/gabroo/speech/status"});
  expect(response.statusCode).toBe(401);
  expect(response.json().error.code).toBe("VERIFIED_ACCOUNT_REQUIRED");
  await app.close();
 });
 it("returns zeroed India-local Gabroo speech usage to a paid learner",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const app=await buildApp(config,async()=>true,recognitionPool(true));
  const response=await app.inject({method:"GET",url:"/api/v1/gabroo/speech/usage",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({timezone:"Asia/Kolkata",usage:{
   day:{characters_used:0,requests_count:0,character_limit:10_000,characters_remaining:10_000},
   month:{characters_used:0,requests_count:0,character_limit:100_000,characters_remaining:100_000}
  }});
  await app.close();
 });
 it("does not expose Gabroo speech usage to a free learner",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const app=await buildApp(config,async()=>true,recognitionPool(false));
  const response=await app.inject({method:"GET",url:"/api/v1/gabroo/speech/usage",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
  expect(response.statusCode).toBe(403);
  await app.close();
 });
 it("reports speech as unavailable when the operational kill switch is off",async()=>{
  const config=loadConfig({NODE_ENV:"test",GABROO_TTS_ENABLED:"false"});
  const provider={synthesize:async()=>({audio:new Uint8Array([1]),contentType:"audio/mpeg" as const})};
  const app=await buildApp(config,async()=>true,recognitionPool(true),undefined,undefined,undefined,provider);
  const status=await app.inject({method:"GET",url:"/api/v1/gabroo/speech/status",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
  expect(status.statusCode).toBe(200);
  expect(status.json()).toEqual({available:false,formats:[],speed:{minimum:0.75,maximum:1.5},capabilities:{speech_synthesis:false,character_alignment:false,phoneme_alignment:false,live_avatar_renderer:false}});
  const speech=await app.inject({method:"POST",url:"/api/v1/gabroo/speech",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)},payload:{text:"Hello Gabroo",speed:1}});
  expect(speech.statusCode).toBe(503);
  expect(speech.json().error.code).toBe("SPEECH_TEMPORARILY_DISABLED");
  const ticket=await app.inject({method:"POST",url:"/api/v1/gabroo/speech/playback-ticket",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)},payload:{text:"Hello Gabroo",speed:1}});
  expect(ticket.statusCode).toBe(503);
  expect(ticket.json().error.code).toBe("SPEECH_TEMPORARILY_DISABLED");
  const readiness=await app.inject({method:"GET",url:"/api/v1/ready"});
  expect(readiness.json().capabilities.gabroo_speech).toBe("disabled");
  await app.close();
 });
 it("reports speech availability and supported controls to a paid learner without a provider",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const app=await buildApp(config,async()=>true,recognitionPool(true));
  const response=await app.inject({method:"GET",url:"/api/v1/gabroo/speech/status",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({available:false,formats:[],speed:{minimum:0.75,maximum:1.5},capabilities:{speech_synthesis:false,character_alignment:false,phoneme_alignment:false,live_avatar_renderer:false}});
  await app.close();
 });
 it("reports only the configured MP3 capability and supported speed range to a paid learner",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const provider={synthesize:async()=>({audio:new Uint8Array([1]),contentType:"audio/mpeg" as const})};
  const app=await buildApp(config,async()=>true,recognitionPool(true),undefined,undefined,undefined,provider);
  const response=await app.inject({method:"GET",url:"/api/v1/gabroo/speech/status",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({available:true,formats:["audio/mpeg"],speed:{minimum:0.75,maximum:1.5},capabilities:{speech_synthesis:true,character_alignment:false,phoneme_alignment:false,live_avatar_renderer:false}});
  await app.close();
 });
 it("does not expose Gabroo speech to a free learner",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const app=await buildApp(config,async()=>true,recognitionPool(false));
  const response=await app.inject({method:"GET",url:"/api/v1/gabroo/speech/status",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
  expect(response.statusCode).toBe(403);
  expect(response.json().error.code).toBe("PAID_SUBSCRIPTION_REQUIRED");
  await app.close();
 });
 it("synthesizes speech for a paid learner using the requested speed",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  let captured:{text:string;speed:number}|undefined;
  const provider={synthesize:async(input:{text:string;speed:number;signal:AbortSignal})=>{
   captured={text:input.text,speed:input.speed};
   return {audio:new Uint8Array([1,2,3]),contentType:"audio/mpeg" as const};
  }};
  const app=await buildApp(config,async()=>true,recognitionPool(true),undefined,undefined,undefined,provider);
  const response=await app.inject({method:"POST",url:"/api/v1/gabroo/speech",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)},payload:{text:"നമസ്കാരം! Let's practise.",speed:0.9}});
  expect(response.statusCode).toBe(200);
  expect(response.headers["content-type"]).toContain("audio/mpeg");
  expect(response.headers["cache-control"]).toBe("private, no-store");
  expect(response.rawPayload).toEqual(Buffer.from([1,2,3]));
  expect(captured).toEqual({text:"നമസ്കാരം! Let's practise.",speed:0.9});
  await app.close();
 });

 it("keeps alignment unavailable unless a real provider is injected",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const app=await buildApp(config,async()=>true,recognitionPool(true));
  const response=await app.inject({method:"POST",url:"/api/v1/gabroo/speech/alignment",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)},payload:{}});
  expect(response.statusCode).toBe(503);
  expect(response.json().error.code).toBe("ALIGNMENT_PROVIDER_UNAVAILABLE");
  await app.close();
 });
 it("validates exact MP3 and transcript identity before requesting phoneme alignment",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const audio=Buffer.alloc(834);
  for(let offset=0;offset<audio.length;offset+=417)audio.set([0xff,0xfb,0x90,0x00],offset);
  const text="ഹായ് Gabroo!";
  const durationMs=measureGabrooMp3DurationMs(audio);
  const identity=createGabrooSynthesizedAudioIdentity({audio,text,durationMs,audioId:createHash("sha256").update(audio).digest("hex")});
  let calls=0;
  const provider={align:async(input:any)=>{
   calls++;
   return {kind:"phoneme" as const,alignment:{audio_id:input.identity.audio_id,audio_sha256:input.identity.audio_sha256,duration_ms:input.identity.duration_ms,phonemes:[{phoneme:"m",start_ms:0,end_ms:Math.min(20,input.identity.duration_ms)}]}};
  }};
  const app=await buildApp(config,async()=>true,recognitionPool(true),undefined,undefined,undefined,undefined,undefined,provider);
  const headers={authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)};
  const payload={audio_base64:audio.toString("base64"),text,audio_id:identity.audio_id,audio_sha256:identity.audio_sha256,text_sha256:identity.text_sha256,duration_ms:durationMs,language:"mixed"};
  const valid=await app.inject({method:"POST",url:"/api/v1/gabroo/speech/alignment",headers,payload});
  expect(valid.statusCode).toBe(200);
  expect(valid.json().alignment.kind).toBe("phoneme");
  expect(calls).toBe(1);
  const altered=await app.inject({method:"POST",url:"/api/v1/gabroo/speech/alignment",headers,payload:{...payload,text:"മാറ്റിയ വാചകം"}});
  expect(altered.statusCode).toBe(400);
  expect(altered.json().error.code).toBe("ALIGNMENT_IDENTITY_MISMATCH");
  expect(calls).toBe(1);
  await app.close();
 });
 it("rejects unsupported Gabroo speech speed and does not call the provider",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  let calls=0;
  const provider={synthesize:async()=>{calls++;return {audio:new Uint8Array([1]),contentType:"audio/mpeg" as const};}};
  const app=await buildApp(config,async()=>true,recognitionPool(true),undefined,undefined,undefined,provider);
  const response=await app.inject({method:"POST",url:"/api/v1/gabroo/speech",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)},payload:{text:"hello",speed:2}});
  expect(response.statusCode).toBe(400);
  expect(response.json().error.code).toBe("VALIDATION_ERROR");
  expect(calls).toBe(0);
  await app.close();
 });
 it("allows only one concurrent Gabroo speech synthesis request per learner",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  let begin!:()=>void;let finish!:()=>void;
  const started=new Promise<void>(resolve=>{begin=resolve;});
  const gate=new Promise<void>(resolve=>{finish=resolve;});
  const provider={synthesize:async()=>{
   begin();
   await gate;
   return {audio:new Uint8Array([1,2,3]),contentType:"audio/mpeg" as const};
  }};
  const app=await buildApp(config,async()=>true,recognitionPool(true),undefined,undefined,undefined,provider);
  const headers={authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)};
  const first=app.inject({method:"POST",url:"/api/v1/gabroo/speech",headers,payload:{text:"First reply",speed:1}});
  await started;
  const second=await app.inject({method:"POST",url:"/api/v1/gabroo/speech",headers,payload:{text:"Overlapping reply",speed:1}});
  expect(second.statusCode).toBe(429);
  expect(second.json().error.code).toBe("SPEECH_REQUEST_IN_PROGRESS");
  finish();
  const firstResponse=await first;
  expect(firstResponse.statusCode).toBe(200);
  const retry=await app.inject({method:"POST",url:"/api/v1/gabroo/speech",headers,payload:{text:"Next reply",speed:1}});
  expect(retry.statusCode).toBe(200);
  await app.close();
 });
 it("reports realtime recognition separately from uploaded-audio recognition",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const provider={transcribe:async()=>({text:"hello",languageDetected:"en" as const})};
  const app=await buildApp(config,async()=>true,undefined,undefined,undefined,undefined,undefined,provider);
  const response=await app.inject({method:"GET",url:"/api/v1/ready"});
  expect(response.json().capabilities.gabroo_recognition).toBe("unconfigured");
  expect(response.json().capabilities.gabroo_realtime_recognition).toBe("configured");
  await app.close();
 });

 it("reports Gabroo speech capability only when a synthesis provider is injected",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const provider={synthesize:async()=>({audio:new Uint8Array([1]),contentType:"audio/mpeg" as const})};
  const app=await buildApp(config,async()=>true,undefined,undefined,undefined,undefined,provider);
  const response=await app.inject({method:"GET",url:"/api/v1/ready"});
  expect(response.json().capabilities.gabroo_speech).toBe("configured");
  await app.close();
 });

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

 it("transcribes a consented recording and returns it only for learner review",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  let received:{mimeType:string;language:string;bytes:number}|undefined;
  const provider={transcribe:async(input:{audio:Uint8Array;mimeType:string;language:string;signal:AbortSignal})=>{
   received={mimeType:input.mimeType,language:input.language,bytes:input.audio.byteLength};
   return {text:"എനിക്ക് ഇംഗ്ലീഷ് പഠിക്കണം",languageDetected:"ml" as const};
  }};
  const app=await buildApp(config,async()=>true,recognitionPool(true),undefined,undefined,provider);
  const response=await app.inject({method:"POST",url:"/api/v1/gabroo/recognition",headers:{
   authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET),
   "content-type":"audio/mp4",
   "x-gabroo-consent":"true",
   "x-gabroo-language":"ml-IN"
  },payload:Buffer.from([1,2,3,4])});
  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({transcript:{text:"എനിക്ക് ഇംഗ്ലീഷ് പഠിക്കണം",languageDetected:"ml"},review_required:true});
  expect(response.json().request_id).toBeTruthy();
  expect(received).toEqual({mimeType:"audio/mp4",language:"ml-IN",bytes:4});
  await app.close();
 });
 it("does not send a recording to the provider without explicit consent",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  let calls=0;
  const provider={transcribe:async()=>{calls++;return {text:"hello",languageDetected:"en" as const};}};
  const app=await buildApp(config,async()=>true,recognitionPool(true),undefined,undefined,provider);
  const response=await app.inject({method:"POST",url:"/api/v1/gabroo/recognition",headers:{
   authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET),
   "content-type":"audio/mp4"
  },payload:Buffer.from([1,2,3])});
  expect(response.statusCode).toBe(400);
  expect(response.json().error.code).toBe("CONSENT_REQUIRED");
  expect(calls).toBe(0);
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

 it("serves public subscription prices from the persisted offer rules",async()=>{
  const pool={query:async(sql:string)=>{
   if(sql.includes("FROM subscription_offer_rules"))return {rows:[
    {plan_code:"monthly",currency:"INR",standard_amount_minor:"9900",discount_basis_points:2020,enabled:true,starts_at:null,ends_at:null,version:3},
    {plan_code:"yearly",currency:"INR",standard_amount_minor:"118800",discount_basis_points:3274,enabled:true,starts_at:null,ends_at:null,version:2}
   ]};
   return {rows:[]};
  }} as any;
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const response=await app.inject({method:"GET",url:"/api/v1/subscriptions/prices"});
  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({
   currency:"INR",
   prices:[
    {plan_code:"monthly",billing_days:30,standard_amount_minor:9900,discount_amount_minor:2000,payable_amount_minor:7900,offer_applied:true,offer_version:3},
    {plan_code:"yearly",billing_days:360,standard_amount_minor:118800,discount_amount_minor:38900,payable_amount_minor:79900,offer_applied:true,offer_version:2}
   ]
  });
  await app.close();
 });

 it("creates an authenticated, short-lived subscription price quote without granting access",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const inserted:{sql:string;values:unknown[]|undefined}[]=[];
  const pool={query:async(sql:string,values?:unknown[])=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("FROM subscription_offer_rules"))return {rows:[
    {plan_code:"monthly",currency:"INR",standard_amount_minor:"9900",discount_basis_points:2020,enabled:true,starts_at:null,ends_at:null,version:4},
    {plan_code:"yearly",currency:"INR",standard_amount_minor:"118800",discount_basis_points:3274,enabled:true,starts_at:null,ends_at:null,version:2}
   ]};
   inserted.push({sql,values});
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  const response=await app.inject({method:"POST",url:"/api/v1/subscriptions/checkout/quote",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)},payload:{plan_code:"monthly"}});
  expect(response.statusCode).toBe(201);
  expect(response.json()).toMatchObject({
   plan_code:"monthly",currency:"INR",standard_amount_minor:9900,discount_amount_minor:2000,
   payable_amount_minor:7900,offer_version:4,payment_required:true,access_granted:false
  });
  expect(new Date(response.json().expires_at).getTime()-new Date(response.json().quoted_at).getTime()).toBe(15*60*1000);
  expect(inserted).toHaveLength(1);
  expect(inserted[0]?.sql).toContain("INSERT INTO subscription_checkout_quotes");
  expect(inserted[0]?.values?.slice(2,9)).toEqual(["monthly","INR",9900,2000,7900,2020,4]);
  await app.close();
 });
 it("requires a verified learner before creating a subscription quote",async()=>{
  const pool={query:async()=>({rows:[]})} as any;
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const response=await app.inject({method:"POST",url:"/api/v1/subscriptions/checkout/quote",payload:{plan_code:"monthly"}});
  expect(response.statusCode).toBe(401);
  expect(response.json().error.code).toBe("VERIFIED_ACCOUNT_REQUIRED");
  await app.close();
 });

 it("fails closed when subscription offer configuration is incomplete",async()=>{
  const pool={query:async()=>({rows:[]})} as any;
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const response=await app.inject({method:"GET",url:"/api/v1/subscriptions/prices"});
  expect(response.statusCode).toBe(503);
  expect(response.json().error.code).toBe("SUBSCRIPTION_PRICING_UNAVAILABLE");
  await app.close();
 });

 it("aborts synthesis and releases the learner slot when the client disconnects",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  let started!:()=>void;
  let aborted!:()=>void;
  const synthesisStarted=new Promise<void>(resolve=>{started=resolve;});
  const synthesisAborted=new Promise<void>(resolve=>{aborted=resolve;});
  let calls=0;
  const provider={synthesize:async(input:{signal:AbortSignal})=>{
   calls++;
   if(calls>1)return {audio:new Uint8Array([7,8,9]),contentType:"audio/mpeg" as const};
   started();
   return new Promise<never>((_resolve,reject)=>{
    const cancel=()=>{aborted();reject(new Error("cancelled by client"));};
    if(input.signal.aborted)cancel();
    else input.signal.addEventListener("abort",cancel,{once:true});
   });
  }};
  const app=await buildApp(config,async()=>true,recognitionPool(true),undefined,undefined,undefined,provider);
  await app.listen({host:"127.0.0.1",port:0});
  const address=app.server.address();
  if(!address||typeof address==="string")throw new Error("Expected a TCP listener");
  const client=httpRequest({host:"127.0.0.1",port:address.port,path:"/api/v1/gabroo/speech",method:"POST",headers:{
   authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET),
   "content-type":"application/json"
  }});
  client.on("error",()=>undefined);
  client.end(JSON.stringify({text:"Please speak",speed:1}));
  await synthesisStarted;
  client.destroy();
  await expect(synthesisAborted).resolves.toBeUndefined();
  const retry=await app.inject({method:"POST",url:"/api/v1/gabroo/speech",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)},payload:{text:"A fresh reply",speed:1}});
  expect(retry.statusCode).toBe(200);
  expect(calls).toBe(2);
  await app.close();
 });

 it("cancels a live playback stream and releases the learner slot after a client disconnect",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  let started!:()=>void;
  let streamClosed!:()=>void;
  const synthesisStarted=new Promise<void>(resolve=>{started=resolve;});
  const audioStreamClosed=new Promise<void>(resolve=>{streamClosed=resolve;});
  let calls=0;
  const provider={
   synthesize:async()=>({audio:new Uint8Array([1]),contentType:"audio/mpeg" as const}),
   synthesizeStream:async()=>{
    calls++;
    if(calls>1)return {audio:Readable.from([Buffer.from([7,8,9])]),contentType:"audio/mpeg" as const};
    const audio=new Readable({read(){}});
    audio.once("close",()=>streamClosed());
    started();
    return {audio,contentType:"audio/mpeg" as const};
   }
  };
  const app=await buildApp(config,async()=>true,recognitionPool(true),undefined,undefined,undefined,provider);
  await app.listen({host:"127.0.0.1",port:0});
  const address=app.server.address();
  if(!address||typeof address==="string")throw new Error("Expected a TCP listener");
  const client=httpRequest({host:"127.0.0.1",port:address.port,path:"/api/v1/gabroo/speech",method:"POST",headers:{
   authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET),
   "content-type":"application/json"
  }});
  client.on("error",()=>undefined);
  client.end(JSON.stringify({text:"Stream this reply",speed:1}));
  await synthesisStarted;
  client.destroy();
  await expect(audioStreamClosed).resolves.toBeUndefined();
  const retry=await app.inject({method:"POST",url:"/api/v1/gabroo/speech",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)},payload:{text:"A fresh streamed reply",speed:1}});
  expect(retry.statusCode).toBe(200);
  expect(retry.rawPayload).toEqual(Buffer.from([7,8,9]));
  expect(calls).toBe(2);
  await app.close();
 });

 it("releases the learner slot after a provider stream fails",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  let failedStreamClosed!:()=>void;
  const streamClosed=new Promise<void>(resolve=>{failedStreamClosed=resolve;});
  let calls=0;
  const provider={
   synthesize:async()=>({audio:new Uint8Array([1]),contentType:"audio/mpeg" as const}),
   synthesizeStream:async()=>{
    calls++;
    if(calls>1)return {audio:Readable.from([Buffer.from([9,8,7])]),contentType:"audio/mpeg" as const};
    const audio=new Readable({read(){this.destroy(new Error("simulated provider stream failure"));}});
    audio.once("close",()=>failedStreamClosed());
    return {audio,contentType:"audio/mpeg" as const};
   }
  };
  const app=await buildApp(config,async()=>true,recognitionPool(true),undefined,undefined,undefined,provider);
  await app.listen({host:"127.0.0.1",port:0});
  const address=app.server.address();
  if(!address||typeof address==="string")throw new Error("Expected a TCP listener");
  const client=httpRequest({host:"127.0.0.1",port:address.port,path:"/api/v1/gabroo/speech",method:"POST",headers:{
   authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET),
   "content-type":"application/json"
  }});
  client.on("error",()=>undefined);
  client.end(JSON.stringify({text:"This stream will fail",speed:1}));
  await expect(streamClosed).resolves.toBeUndefined();
  await new Promise<void>(resolve=>client.once("close",()=>resolve()));
  const retry=await app.inject({method:"POST",url:"/api/v1/gabroo/speech",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)},payload:{text:"A recovered reply",speed:1}});
  expect(retry.statusCode).toBe(200);
  expect(retry.rawPayload).toEqual(Buffer.from([9,8,7]));
  expect(calls).toBe(2);
  await app.close();
 });

 it("rejects expired playback tickets without invoking speech synthesis",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  let updateSql="";
  let providerCalls=0;
  const pool={query:async(sql:string)=>{
   if(sql.includes("UPDATE gabroo_speech_playback_tickets")){
    updateSql=sql;
    return {rows:[]};
   }
   return {rows:[]};
  }} as any;
  const provider={
   synthesize:async()=>{providerCalls++;return {audio:new Uint8Array([1]),contentType:"audio/mpeg" as const};},
   synthesizeStream:async()=>{providerCalls++;return {audio:Readable.from([Buffer.from([1])]),contentType:"audio/mpeg" as const};}
  };
  const app=await buildApp(config,async()=>true,pool,undefined,undefined,undefined,provider);
  const response=await app.inject({method:"GET",url:"/api/v1/gabroo/speech/playback/"+"a".repeat(64),headers:{accept:"audio/mpeg"}});
  expect(response.statusCode).toBe(404);
  expect(response.json().error.code).toBe("PLAYBACK_TICKET_INVALID");
  expect(updateSql).toContain("expires_at>now()");
  expect(updateSql).toContain("consumed_at IS NULL");
  expect(providerCalls).toBe(0);
  await app.close();
 });

 it("issues a short-lived opaque playback ticket and allows exactly one native GET",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  let stored:{digest:string;userId:string;text:string;speed:number;consumed:boolean}|undefined;
  let ticketIssueSql="";
  let ticketCleanupSql="";
  const ticketTransactionSql:string[]=[];
  const handleQuery=async(sql:string,values?:unknown[])=>{
   if(sql.includes("INSERT INTO gabroo_speech_usage_buckets"))return {rows:[{characters_used: String(values?.[1]??0)}],rowCount:1};
   if(sql.startsWith("DELETE FROM gabroo_speech_playback_tickets")){ticketCleanupSql=sql;throw new Error("simulated cleanup outage");}
   if(["BEGIN","COMMIT","ROLLBACK"].includes(sql)||sql.includes("pg_advisory_xact_lock")||sql.includes("SET consumed_at=now() WHERE user_id=")||sql.includes("INSERT INTO gabroo_speech_playback_tickets"))ticketTransactionSql.push(sql);
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   if(sql.includes("INSERT INTO gabroo_speech_playback_tickets")){
    ticketIssueSql=sql;
    stored={digest:String(values?.[0]),userId:String(values?.[1]),text:String(values?.[2]),speed:Number(values?.[3]),consumed:false};
    return {rows:[{expires_at:new Date(Date.now()+60_000)}]};
   }
   if(sql.includes("UPDATE gabroo_speech_playback_tickets")){
    if(sql.includes("SET consumed_at=now() WHERE user_id=")){
     if(stored)stored.consumed=true;
     return {rows:[]};
    }
    if(!stored||stored.digest!==values?.[0]||stored.consumed)return {rows:[]};
    stored.consumed=true;
    return {rows:[{user_id:stored.userId,speech_text:stored.text,speech_speed:stored.speed}]};
   }
   return {rows:[]};
  };
  const pool={query:handleQuery,connect:async()=>({
   query:async(sql:string,values?:unknown[])=>handleQuery(sql,values),
   release:()=>undefined
  })} as any;
  const synthesized:Array<{text:string;speed:number}>=[];
  const provider={
   synthesize:async()=>({audio:new Uint8Array([4,5,6]),contentType:"audio/mpeg" as const}),
   synthesizeStream:async(input:{text:string;speed:number;signal:AbortSignal})=>{
    synthesized.push({text:input.text,speed:input.speed});
    return {audio:Readable.from([Buffer.from([4,5]),Buffer.from([6])]),contentType:"audio/mpeg" as const};
   }
  };
  const app=await buildApp(config,async()=>true,pool,undefined,undefined,undefined,provider);
  const headers={authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)};
  const phrase="നമസ്കാരം! Let's practise speaking.";
  const created=await app.inject({method:"POST",url:"/api/v1/gabroo/speech/playback-ticket",headers,payload:{text:phrase,speed:0.85}});
  expect(created.statusCode).toBe(201);
  expect(ticketCleanupSql).toContain("ORDER BY expires_at ASC LIMIT 500");
  expect(ticketCleanupSql).toContain("expires_at < now() - interval '5 minutes'");
  expect(ticketIssueSql).toContain("INSERT INTO gabroo_speech_playback_tickets");
  expect(ticketIssueSql).toContain("VALUES($1,$2,$3,$4,now()+interval '60 seconds')");
  expect(ticketIssueSql).not.toContain("WITH learner_lock");
  expect(ticketTransactionSql.slice(0,5).map(sql=>sql==="BEGIN"?"BEGIN":sql.includes("pg_advisory_xact_lock")?"LOCK":sql.includes("SET consumed_at=now() WHERE user_id=")?"SUPERSEDE":sql.includes("INSERT INTO gabroo_speech_playback_tickets")?"INSERT":sql)).toEqual(["BEGIN","LOCK","SUPERSEDE","INSERT","COMMIT"]);
  const ticket=created.json();
  expect(ticket.method).toBe("GET");
  expect(ticket.expires_at).toBeTruthy();
  expect(ticket.playback_url).toMatch(/^\/api\/v1\/gabroo\/speech\/playback\/[0-9a-f]{64}$/);
  expect(ticket.playback_url).not.toContain(phrase);
  expect(stored).toMatchObject({userId:"00000000-0000-4000-8000-000000000001",text:phrase,speed:0.85,consumed:false});
  const audio=await app.inject({method:"GET",url:ticket.playback_url,headers:{accept:"audio/mpeg"}});
  expect(audio.statusCode).toBe(200);
  expect(audio.headers["content-type"]).toContain("audio/mpeg");
  expect(audio.rawPayload).toEqual(Buffer.from([4,5,6]));
  expect(synthesized).toEqual([{text:phrase,speed:0.85}]);
  const replay=await app.inject({method:"GET",url:ticket.playback_url,headers:{accept:"audio/mpeg"}});
  expect(replay.statusCode).toBe(404);
  expect(replay.json().error.code).toBe("PLAYBACK_TICKET_INVALID");
  expect(synthesized).toHaveLength(1);
  await app.close();
 });

 it("rolls back failed playback-ticket inserts and always releases the transaction client",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const transactionSql:string[]=[];
  let released=false;
  const handleQuery=async(sql:string)=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   return {rows:[]};
  };
  const client={
   query:async(sql:string)=>{
    transactionSql.push(sql);
    if(sql.includes("INSERT INTO gabroo_speech_playback_tickets"))throw new Error("simulated insert failure");
    return {rows:[]};
   },
   release:()=>{released=true;}
  };
  const pool={query:handleQuery,connect:async()=>client} as any;
  const provider={synthesize:async()=>({audio:new Uint8Array([1]),contentType:"audio/mpeg" as const})};
  const app=await buildApp(config,async()=>true,pool,undefined,undefined,undefined,provider);
  const response=await app.inject({
   method:"POST",url:"/api/v1/gabroo/speech/playback-ticket",
   headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)},
   payload:{text:"Hello Gabroo",speed:1}
  });
  expect(response.statusCode).toBe(500);
  expect(transactionSql.map(sql=>sql==="BEGIN"?"BEGIN":sql==="COMMIT"?"COMMIT":sql==="ROLLBACK"?"ROLLBACK":sql.includes("pg_advisory_xact_lock")?"LOCK":sql.includes("SET consumed_at=now() WHERE user_id=")?"SUPERSEDE":"INSERT"))
   .toEqual(["BEGIN","LOCK","SUPERSEDE","INSERT","ROLLBACK"]);
  expect(released).toBe(true);
  await app.close();
 });

});
