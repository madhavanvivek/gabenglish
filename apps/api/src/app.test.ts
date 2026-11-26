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

 it("requires an authenticated learner for Gabroo speech status",async()=>{
  const pool={query:async()=>({rows:[]})} as any;
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const r=await app.inject({method:"GET",url:"/api/v1/gabroo/speech/status"});
  expect(r.statusCode).toBe(401);
  expect(r.json().error.code).toBe("VERIFIED_ACCOUNT_REQUIRED");
  await app.close();
 });
 it("keeps Gabroo speech generation unavailable until a provider is configured",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const app=await buildApp(config,async()=>true,recognitionPool(true));
  const r=await app.inject({method:"POST",url:"/api/v1/gabroo/speech",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET),"x-gabroo-consent":"true"},payload:{text:"hello",language:"en",speech_rate:1}});
  expect(r.statusCode).toBe(503);
  expect(r.json().error.code).toBe("PROVIDER_UNAVAILABLE");
  await app.close();
 });
 it("requires explicit consent before invoking the configured Gabroo speech provider",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  let calls=0;
  const provider={generate:async()=>{calls+=1;return {}; }};
  const app=await buildApp(config,async()=>true,recognitionPool(true),undefined,undefined,undefined,provider);
  const r=await app.inject({method:"POST",url:"/api/v1/gabroo/speech",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)},payload:{text:"hello",language:"en",speech_rate:1}});
  expect(r.statusCode).toBe(400);
  expect(r.json().error.code).toBe("CONSENT_REQUIRED");
  expect(calls).toBe(0);
  await app.close();
 });
 it("does not expose Gabroo speech status to a free learner",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const app=await buildApp(config,async()=>true,recognitionPool(false));
  const r=await app.inject({method:"GET",url:"/api/v1/gabroo/speech/status",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
  expect(r.statusCode).toBe(403);
  expect(r.json().error.code).toBe("PAID_SUBSCRIPTION_REQUIRED");
  await app.close();
 });
 it("returns a validated speech asset to a paid learner after explicit consent",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  let received:{text:string;language:string;speechRate:number}|undefined;
  const provider={generate:async(input:{text:string;language:"ml"|"en";speechRate:number;signal:AbortSignal})=>{
   received={text:input.text,language:input.language,speechRate:input.speechRate};
   return {
    playbackTicketId:"ticket-1",audioId:"audio-1",audioSha256:"a".repeat(64),measuredDurationMs:1000,
    alignmentAudioSha256:"a".repeat(64),alignmentDurationMs:1000,
    uri:"https://cdn.example.test/audio.mp3?signature=opaque",expiresAt:"2030-01-01T00:00:00.000Z",
    timeline:{audio_id:"audio-1",duration_ms:1000,visemes:[],expressions:[],gestures:[]}
   };
  }};
  const app=await buildApp(config,async()=>true,recognitionPool(true),undefined,undefined,undefined,provider);
  const r=await app.inject({method:"POST",url:"/api/v1/gabroo/speech",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET),"x-gabroo-consent":"true"},payload:{text:"  നമസ്കാരം!  ",language:"ml",speech_rate:1}});
  expect(r.statusCode).toBe(200);
  expect(r.json().speech_asset.audioId).toBe("audio-1");
  expect(received).toEqual({text:"നമസ്കാരം!",language:"ml",speechRate:1});
  await app.close();
 });
 it("rejects malformed Gabroo speech requests before provider invocation",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  let calls=0;
  const provider={generate:async()=>{calls+=1;return {};}};
  const app=await buildApp(config,async()=>true,recognitionPool(true),undefined,undefined,undefined,provider);
  const r=await app.inject({method:"POST",url:"/api/v1/gabroo/speech",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET),"x-gabroo-consent":"true"},payload:{text:" ",language:"ml",speech_rate:1}});
  expect(r.statusCode).toBe(400);
  expect(r.json().error.code).toBe("INVALID_SPEECH_REQUEST");
  expect(calls).toBe(0);
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

 it("returns only the learner's selected learning direction and saved course progress",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const queries:Array<{sql:string;values:unknown[]|undefined}>=[];
  const pool={query:async(sql:string,values?:unknown[])=>{
   queries.push({sql,values});
   if(sql.includes("FROM users u JOIN refresh_sessions")){
    return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   }
   if(sql.includes("active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   if(sql.includes("FROM user_preferences"))return {rows:[{learning_direction:"en_to_ml"}]};
   if(sql.includes("FROM courses c")&&sql.includes("LEFT JOIN lesson_versions"))return {rows:[{
    course_id:"course-1",course_code:"ml-basics",course_title:"Malayalam Basics",course_description:null,course_sort:1,
    learning_direction:"en_to_ml",source_language:"en",target_language:"ml",support_language:"en",
    course_progress_percent:"37.50",course_completed_lessons:3,course_total_lessons:8,
    practice_attempts:7,practice_exercises_attempted:3,practice_correct_attempts:5,practice_exercises_to_review:1,
    module_id:"module-1",module_title:"First steps",module_sort:1,lesson_id:"lesson-1",lesson_slug:"hello",lesson_title:"Say hello",lesson_sort:1,
    lesson_version_id:"version-2",lesson_version_number:2,lesson_progress_status:"in_progress",lesson_progress_percent:"50.00",
    script_mode:"standard",register:null,dialect_scope:null,romanisation:null
   }]};
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  const response=await app.inject({method:"GET",url:"/api/v1/learning/courses",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
  expect(response.statusCode).toBe(200);
  expect(response.json().learning_direction).toBe("en_to_ml");
  expect(response.json().target_language).toBe("ml");
  expect(response.json().courses).toMatchObject([{
   id:"course-1",progress:{progress_percent:37.5,completed_lessons:3,total_lessons:8},practice:{attempts:7,exercises_attempted:3,correct_attempts:5,exercises_to_review:1},
   modules:[{id:"module-1",lessons:[{id:"lesson-1",version_id:"version-2",progress:{status:"in_progress",progress_percent:50}}]}]
  }]);
  const catalogQuery=queries.find(query=>query.sql.includes("FROM courses c")&&query.sql.includes("LEFT JOIN lesson_versions"));
  expect(catalogQuery?.values).toEqual(["en_to_ml","00000000-0000-4000-8000-000000000001"]);
  expect(catalogQuery?.sql).toContain("c.learning_direction=$1");
  expect(catalogQuery?.sql).toContain("p.user_id=$2");
  expect(catalogQuery?.sql).toContain("lp.user_id=$2");
  expect(catalogQuery?.sql).toContain("lp.lesson_version_id=lv.id");
  expect(catalogQuery?.sql).toContain("a.lesson_version_id");
  expect(catalogQuery?.sql).toContain("DISTINCT ON (lesson_id,exercise_id)");
  expect(catalogQuery?.sql).toContain("ORDER BY lesson_id,exercise_id,attempted_at DESC,id DESC");
  expect(catalogQuery?.sql).toContain("exercises_to_review");
  expect(catalogQuery?.sql).toContain("a.user_id=$2");
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

 it("fails closed when a published lesson contains duplicate exercise identifiers",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  let inserts=0;
  let historyReads=0;
  const exercise={type:"exercise",id:"duplicate",instruction:"Choose",prompt:"Pick one",response_type:"single_choice",options:[{id:"a",label:"A"},{id:"b",label:"B"}],correct_option_id:"a"};
  const content={schema_version:1,blocks:[exercise,{...exercise,prompt:"A second question"}]};
  const pool={query:async(sql:string)=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   if(sql.includes("FROM lessons l JOIN modules m")&&sql.includes("JOIN courses c"))return {rows:[{course_id:"course-1",learning_direction:"ml_to_en",version_id:"version-1",content}]};
   if(sql.includes("INSERT INTO learner_exercise_attempts")){inserts+=1;return {rows:[]};}
   if(sql.includes("FROM learner_exercise_attempts")&&sql.includes("WHERE user_id=$1 AND lesson_id=$2")){historyReads+=1;return {rows:[]};}
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  const headers={authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)};
  const submitted=await app.inject({method:"POST",url:"/api/v1/learning/lessons/00000000-0000-4000-8000-000000000003/exercises/duplicate/attempts",headers,payload:{lesson_version_id:"version-1",submission_id:"00000000-0000-4000-8000-000000000009",response:"a"}});
  expect(submitted.statusCode).toBe(503);
  expect(submitted.json().error.code).toBe("EXERCISE_CONTENT_AMBIGUOUS");
  const history=await app.inject({method:"GET",url:"/api/v1/learning/lessons/00000000-0000-4000-8000-000000000003/exercises/duplicate/attempts",headers});
  expect(history.statusCode).toBe(503);
  expect(history.json().error.code).toBe("EXERCISE_CONTENT_AMBIGUOUS");
  expect(inserts).toBe(0);
  expect(historyReads).toBe(0);
  await app.close();
 });

 it("rejects exercise attempts submitted against a stale lesson version",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  let inserts=0;
  const content={schema_version:1,blocks:[{type:"exercise",id:"exercise-1",instruction:"Choose",prompt:"Pick one",response_type:"single_choice",options:[{id:"a",label:"A"},{id:"b",label:"B"}],correct_option_id:"a"}]};
  const pool={query:async(sql:string)=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   if(sql.includes("FROM lessons l JOIN modules m")&&sql.includes("JOIN courses c"))return {rows:[{course_id:"course-1",learning_direction:"ml_to_en",version_id:"version-current",content}]};
   if(sql.includes("INSERT INTO learner_exercise_attempts")){inserts+=1;return {rows:[]};}
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  const response=await app.inject({method:"POST",url:"/api/v1/learning/lessons/00000000-0000-4000-8000-000000000003/exercises/exercise-1/attempts",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)},payload:{lesson_version_id:"version-old",submission_id:"00000000-0000-4000-8000-000000000009",response:"a"}});
  expect(response.statusCode).toBe(409);
  expect(response.json().error.code).toBe("LESSON_VERSION_CHANGED");
  expect(inserts).toBe(0);
  await app.close();
 });

 it("returns the original result for an exact exercise retry and rejects key reuse",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const lessonId="00000000-0000-4000-8000-000000000003";
  const versionId="00000000-0000-4000-8000-000000000004";
  const submissionId="00000000-0000-4000-8000-000000000009";
  const content={schema_version:1,blocks:[{type:"exercise",id:"exercise-1",instruction:"Choose",prompt:"Pick one",response_type:"single_choice",options:[{id:"a",label:"A"},{id:"b",label:"B"}],correct_option_id:"a"}]};
  let stored:{lesson_id:string;lesson_version_id:string;exercise_id:string;response:string;is_correct:boolean;feedback:string}|null=null;
  let inserts=0;
  const pool={query:async(sql:string,values:unknown[]=[]):Promise<any>=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   if(sql.includes("FROM learner_exercise_attempts WHERE user_id=$1 AND submission_id=$2"))return {rows:stored?[stored]:[]};
   if(sql.includes("FROM lessons l JOIN modules m")&&sql.includes("JOIN courses c"))return {rows:[{course_id:"course-1",learning_direction:"ml_to_en",version_id:versionId,content}]};
   if(sql.includes("INSERT INTO learner_exercise_attempts")){
    inserts+=1;
    stored={lesson_id:lessonId,lesson_version_id:versionId,exercise_id:"exercise-1",response:String(values[6]),is_correct:true,feedback:"Good work. Your answer is correct."};
    return {rows:[{id:"attempt-1"}],rowCount:1};
   }
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  const headers={authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)};
  const url=`/api/v1/learning/lessons/${lessonId}/exercises/exercise-1/attempts`;
  const payload={lesson_version_id:versionId,submission_id:submissionId,response:"a"};
  const first=await app.inject({method:"POST",url,headers,payload});
  const retry=await app.inject({method:"POST",url,headers,payload});
  const conflict=await app.inject({method:"POST",url,headers,payload:{...payload,response:"b"}});
  expect(first.statusCode).toBe(200);
  expect(retry.statusCode).toBe(200);
  expect(retry.json()).toEqual(first.json());
  expect(conflict.statusCode).toBe(409);
  expect(conflict.json().error.code).toBe("SUBMISSION_ID_CONFLICT");
  expect(inserts).toBe(1);
  await app.close();
 });

 it("returns only validated learner-safe published lesson detail",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const lessonId="00000000-0000-4000-8000-000000000003";
  const versionId="00000000-0000-4000-8000-000000000004";
  const pool={query:async(sql:string)=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   if(sql.includes("FROM lessons l JOIN modules m"))return {rows:[{course_id:"course-1",learning_direction:"ml_to_en",source_language:"ml",target_language:"en",support_language:"ml",lesson_id:lessonId,slug:"greetings",title:"Greetings",version_id:versionId,version_number:2,content:{schema_version:1,blocks:[{type:"text",heading:"Say hello",body:"Learn a friendly greeting."}]},script_mode:"native_with_optional_romanisation",register:"informal",dialect_scope:"Kerala Malayalam",romanisation:null,progress_status:"in_progress",progress_percent:"25",progress_updated_at:new Date("2026-11-26T04:00:00.000Z")}]};
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  const response=await app.inject({method:"GET",url:`/api/v1/learning/lessons/${lessonId}`,headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({lesson:{id:lessonId,version_id:versionId,version:2,learning_direction:"ml_to_en",target_language:"en",content:{schema_version:1,blocks:[{type:"text",heading:"Say hello",body:"Learn a friendly greeting."}]}},progress:{status:"in_progress",progress_percent:25}});
  await app.close();
 });

 it("fails closed when published lesson content is not learner-safe",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const pool={query:async(sql:string)=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   if(sql.includes("FROM lessons l JOIN modules m"))return {rows:[{course_id:"course-1",learning_direction:"ml_to_en",source_language:"ml",target_language:"en",support_language:"ml",lesson_id:"00000000-0000-4000-8000-000000000003",slug:"broken",title:"Broken lesson",version_id:"version-1",version_number:1,content:{schema_version:1,blocks:[]},script_mode:"romanized",register:null,dialect_scope:null,romanisation:null,progress_status:null,progress_percent:null,progress_updated_at:null}]};
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  const response=await app.inject({method:"GET",url:"/api/v1/learning/lessons/00000000-0000-4000-8000-000000000003",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
  expect(response.statusCode).toBe(503);
  expect(response.json().error.code).toBe("LESSON_CONTENT_UNAVAILABLE");
  await app.close();
 });

 it("returns exercise history only for the current published lesson version",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const historyQueries:Array<{sql:string;values:unknown[]}>=[];
  const attempt={id:"attempt-1",lesson_version_id:"version-current",response:"hello",is_correct:true,feedback:"Correct",attempted_at:new Date("2026-11-26T04:00:00.000Z")};
  const exercise={type:"exercise",id:"exercise-1",instruction:"Choose",prompt:"Pick one",response_type:"single_choice",options:[{id:"a",label:"A"},{id:"b",label:"B"}],correct_option_id:"a"};
  const pool={query:async(sql:string,values?:unknown[])=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   if(sql.includes("FROM lessons l JOIN modules m")&&sql.includes("JOIN courses c"))return {rows:[{learning_direction:"ml_to_en",version_id:"version-current",content:{schema_version:1,blocks:[exercise]}}]};
   if(sql.includes("FROM learner_exercise_attempts")){historyQueries.push({sql,values:values??[]});return {rows:[attempt]};}
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  const response=await app.inject({method:"GET",url:"/api/v1/learning/lessons/00000000-0000-4000-8000-000000000003/exercises/exercise-1/attempts",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({lesson_id:"00000000-0000-4000-8000-000000000003",exercise_id:"exercise-1",current_version_id:"version-current",attempts:[{id:"attempt-1",lesson_version_id:"version-current",response:"hello",correct:true}]});
  expect(historyQueries[0]?.sql).toContain("lesson_version_id=$5");
  expect(historyQueries[0]?.values).toEqual(["00000000-0000-4000-8000-000000000001","00000000-0000-4000-8000-000000000003","exercise-1","ml_to_en","version-current"]);
  await app.close();
 });

 it("rejects malformed lesson progress before opening a database transaction",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  let connectCalls=0;
  const pool=recognitionPool(true) as any;
  pool.connect=async()=>{connectCalls+=1;throw new Error("transaction must not start for invalid input");};
  const app=await buildApp(config,async()=>true,pool);
  const url="/api/v1/learning/lessons/00000000-0000-4000-8000-000000000003/progress";
  const headers={authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)};
  for(const payload of [
   {progress_percent:12.5},
   {progress_percent:-1},
   {progress_percent:101},
   {progress_percent:"50"},
   {progress_percent:50,lesson_id:"another-lesson"},
   {}
  ]){
   const response=await app.inject({method:"POST",url,headers,payload});
   expect(response.statusCode).toBe(400);
   expect(response.json().error.code).toBe("VALIDATION_ERROR");
  }
  expect(connectCalls).toBe(0);
  await app.close();
 });

 it("rejects progress from a lesson version that is no longer published",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const statements:string[]=[];
  const client={
   query:async(sql:string)=>{
    statements.push(sql);
    if(sql.includes("FOR UPDATE OF c FOR SHARE OF l,lv")){
     return {rows:[{course_id:"course-1",direction:"ml_to_en",version_id:"version-4"}]};
    }
    return {rows:[]};
   },
   release:()=>{}
  };
  const pool=recognitionPool(true) as any;
  pool.connect=async()=>client;
  const app=await buildApp(config,async()=>true,pool);
  const response=await app.inject({
   method:"POST",
   url:"/api/v1/learning/lessons/00000000-0000-4000-8000-000000000003/progress",
   headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)},
   payload:{lesson_version_id:"version-3",progress_percent:60}
  });
  expect(response.statusCode).toBe(409);
  expect(response.json().error.code).toBe("LESSON_VERSION_CHANGED");
  expect(statements).toContain("ROLLBACK");
  expect(statements.some(sql=>sql.includes("INSERT INTO learner_lesson_progress"))).toBe(false);
  await app.close();
 });

 it("saves lesson progress and returns the updated course aggregate in one transaction",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const statements:Array<{sql:string;values:unknown[]|undefined}>=[];
  const client={
   query:async(sql:string,values?:unknown[])=>{
    statements.push({sql,values});
    if(sql.includes("FOR UPDATE OF c FOR SHARE OF l,lv")){
     return {rows:[{course_id:"course-1",direction:"ml_to_en",version_id:"version-3"}]};
    }
    if(sql.includes("INSERT INTO learner_lesson_progress")){
     return {rows:[{status:"in_progress",progress_percent:"60",updated_at:new Date("2026-11-26T05:00:00.000Z")}]};
    }
    if(sql.includes("SELECT COALESCE(AVG(COALESCE(p.progress_percent,0))")){
     return {rows:[{average:"30.00",total:4,completed:1}]};
    }
    return {rows:[]};
   },
   release:()=>{}
  };
  const pool=recognitionPool(true) as any;
  pool.connect=async()=>client;
  const app=await buildApp(config,async()=>true,pool);
  const response=await app.inject({
   method:"POST",
   url:"/api/v1/learning/lessons/00000000-0000-4000-8000-000000000003/progress",
   headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)},
   payload:{lesson_version_id:"version-3",progress_percent:60}
  });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({
   lesson_id:"00000000-0000-4000-8000-000000000003",
   learning_direction:"ml_to_en",
   progress:{status:"in_progress",progress_percent:60},
   course_progress:{progress_percent:30,completed_lessons:1,total_lessons:4}
  });
  expect(statements[0]?.sql).toBe("BEGIN");
  expect(statements.some(item=>item.sql.includes("FOR UPDATE OF c FOR SHARE OF l,lv"))).toBe(true);
  expect(statements.some(item=>item.sql.includes("FOR UPDATE OF c"))).toBe(true);
  expect(statements.some(item=>item.sql.includes("ON CONFLICT(user_id,lesson_id,lesson_version_id,learning_direction)"))).toBe(true);
  expect(statements.some(item=>item.sql.includes("GREATEST(learner_lesson_progress.progress_percent,EXCLUDED.progress_percent)"))).toBe(true);
  expect(statements.some(item=>item.sql.includes("status=EXCLUDED.status")&&item.sql.includes("progress_percent=EXCLUDED.progress_percent"))).toBe(true);
  const aggregateQuery=statements.find(item=>item.sql.includes("SELECT COALESCE(AVG(COALESCE(p.progress_percent,0))"));
  expect(aggregateQuery?.sql).toContain("lv.id=l.current_published_version_id");
  expect(aggregateQuery?.sql).toContain("p.lesson_version_id=lv.id");
  expect(aggregateQuery?.sql).toContain("l.status='published'");
  expect(aggregateQuery?.sql).toContain("lv.status='published'");
  expect(statements.some(item=>item.sql.includes("ELSE NULL END"))).toBe(true);
  expect(statements.some(item=>item.sql.includes("learner_lesson_progress.status='completed'"))).toBe(true);
  expect(statements.some(item=>item.sql==="COMMIT")).toBe(true);
  expect(statements.some(item=>item.sql==="ROLLBACK")).toBe(false);
  await app.close();
 });

});
