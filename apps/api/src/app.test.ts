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

function insightsPool(){
 const queryOriginal=async(sql:string)=>{
  if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
  if(sql.includes("active_subscription_entitlements"))return {rows:[{id:"entitlement-1",plan_code:"monthly"}]};
  if(sql.includes("SELECT learning_direction FROM user_preferences"))return {rows:[{learning_direction:"ml_to_en"}]};
  if(sql.includes("FROM learner_exercise_attempts"))return {rows:[
   {skill_key:"grammar",attempt_count:6,correct_count:3,accuracy:"0.50"},
   {skill_key:"vocabulary",attempt_count:4,correct_count:4,accuracy:"1.00"}
  ]};
  if(sql.includes("FROM gabroo_learner_memory"))return {rows:[{saved_phrase_count:2}]};
  return {rows:[]};
 };
 const pool:any={query:queryOriginal,queryOriginal};return pool;
}

describe("Gabroo learning insights",()=>{
 it("returns learner-scoped exercise evidence and saved practice phrase count",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const app=await buildApp(config,async()=>true,insightsPool());
  const response=await app.inject({method:"GET",url:"/api/v1/gabroo/learning-insights",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({learning_direction:"ml_to_en",skill_areas:[
   {skill_key:"grammar",attempt_count:6,correct_count:3,accuracy:0.5,evidence_status:"practice_opportunity"},
   {skill_key:"vocabulary",attempt_count:4,correct_count:4,accuracy:1,evidence_status:"building_evidence"}
  ],saved_practice_phrases:2,interpretation:{minimum_evidence_for_coaching:5}});
  await app.close();
 });
 it("does not expose personalised insights to a free learner",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const pool=insightsPool();
  pool.query=async(sql:string,...args:any[])=>sql.includes("active_subscription_entitlements")?{rows:[]}:pool.queryOriginal(sql,...args);
  const app=await buildApp(config,async()=>true,pool);
  const response=await app.inject({method:"GET",url:"/api/v1/gabroo/learning-insights",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
  expect(response.statusCode).toBe(403);
  expect(response.json().error.code).toBe("PAID_SUBSCRIPTION_REQUIRED");
  await app.close();
 });
});

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

 it("persists a learner-selected stage separately for each learning direction",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  let direction:"ml_to_en"|"en_to_ml"="ml_to_en";
  const stages=new Map<string,{stage:number;stage_source:string;updated_at:Date}>();
  const pool={query:async(sql:string,values?:unknown[])=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("SELECT learning_direction FROM user_preferences"))return {rows:[{learning_direction:direction}]};
   if(sql.includes("SELECT stage,stage_source,updated_at FROM learner_learning_stages")){
    const saved=stages.get(String(values?.[1]));return {rows:saved?[saved]:[]};
   }
   if(sql.includes("INSERT INTO learner_learning_stages")){
    const saved={stage:Number(values?.[2]),stage_source:"learner_selected",updated_at:new Date()};
    stages.set(String(values?.[1]),saved);return {rows:[saved]};
   }
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  const headers={authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)};
  const selected=await app.inject({method:"PUT",url:"/api/v1/learning/stage",headers,payload:{stage:4}});
  expect(selected.statusCode).toBe(200);
  expect(selected.json()).toMatchObject({learning_direction:"ml_to_en",stage:4,stage_source:"learner_selected",stage_status:"confirmed"});
  const sameDirection=await app.inject({method:"GET",url:"/api/v1/learning/stage",headers});
  expect(sameDirection.json().stage).toBe(4);
  direction="en_to_ml";
  const otherDirection=await app.inject({method:"GET",url:"/api/v1/learning/stage",headers});
  expect(otherDirection.json()).toMatchObject({learning_direction:"en_to_ml",stage:null,stage_status:"not_selected"});
  direction="ml_to_en";
  const restored=await app.inject({method:"GET",url:"/api/v1/learning/stage",headers});
  expect(restored.json().stage).toBe(4);
  await app.close();
 });

 it("returns a learner-scoped vocabulary review queue from published content",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const calls:string[]=[];
  const pool={query:async(sql:string,values?:unknown[])=>{
   calls.push(sql);
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("FROM active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   if(sql.includes("SELECT learning_direction FROM user_preferences"))return {rows:[{learning_direction:"ml_to_en"}]};
   if(sql.includes("FROM lessons l")&&sql.includes("learner_vocabulary_reviews"))return {rows:[{lesson_id:"00000000-0000-4000-8000-000000000002",lesson_title:"Greetings",lesson_version_id:"00000000-0000-4000-8000-000000000003",vocabulary_item_id:"greeting_hello",term:"hello",meaning:"നമസ്കാരം",pronunciation:null,example:"Hello, how are you?",due_at:new Date(),repetitions:0,interval_days:0}]};
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  const response=await app.inject({method:"GET",url:"/api/v1/learning/vocabulary/reviews",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({learning_direction:"ml_to_en",due_count:1,items:[{vocabulary_item_id:"greeting_hello",term:"hello",meaning:"നമസ്കാരം"}]});
  expect(calls.some(sql=>sql.includes("educator_review_status='approved'"))).toBe(true);
  await app.close();
 });
 it("persists a learner recall rating against the current published vocabulary version",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const statements:string[]=[];
  const dueAt=new Date(Date.now()+24*60*60*1000);
  const pool={query:async(sql:string)=>{
   statements.push(sql);
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("FROM active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   if(sql.includes("SELECT learning_direction FROM user_preferences"))return {rows:[{learning_direction:"ml_to_en"}]};
   if(sql.includes("SELECT lv.id AS lesson_version_id"))return {rows:[{lesson_version_id:"00000000-0000-4000-8000-000000000003"}]};
   if(sql.includes("SELECT repetitions,interval_days,ease_factor"))return {rows:[]};
   if(sql.includes("INSERT INTO learner_vocabulary_reviews"))return {rows:[{due_at:dueAt,repetitions:1,interval_days:1,ease_factor:"2.60"}]};
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  const response=await app.inject({method:"POST",url:"/api/v1/learning/lessons/00000000-0000-4000-8000-000000000002/vocabulary/greeting_hello/review",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)},payload:{rating:4}});
  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({vocabulary_item_id:"greeting_hello",rating:4,schedule:{repetitions:1,interval_days:1,ease_factor:2.6}});
  expect(statements.some(sql=>sql.includes("ON CONFLICT(user_id,learning_direction,lesson_version_id,vocabulary_item_id)"))).toBe(true);
  await app.close();
 });
 it("returns only the learner's recent vocabulary review events from current published content",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const reviewedAt=new Date("2026-11-25T10:00:00.000Z");
  const pool={query:async(sql:string)=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("FROM active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   if(sql.includes("SELECT learning_direction FROM user_preferences"))return {rows:[{learning_direction:"ml_to_en"}]};
   if(sql.includes("FROM learner_vocabulary_review_history"))return {rows:[{lesson_id:"00000000-0000-4000-8000-000000000002",lesson_title:"Greetings",vocabulary_item_id:"greeting_hello",term:"Hello",rating:4,repetitions:2,interval_days:3,due_at:new Date("2026-11-28T10:00:00.000Z"),reviewed_at:reviewedAt}]};
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  const response=await app.inject({method:"GET",url:"/api/v1/learning/vocabulary/history?limit=10",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({learning_direction:"ml_to_en",items:[{vocabulary_item_id:"greeting_hello",term:"Hello",rating:4,repetitions:2,interval_days:3,reviewed_at:reviewedAt.toISOString()}],policy:{only_current_published_versions:true,recall_ratings_are_self_reported:true}});
  await app.close();
 });
 it("rejects invalid vocabulary review history limits",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const pool={query:async(sql:string)=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("FROM active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  const response=await app.inject({method:"GET",url:"/api/v1/learning/vocabulary/history?limit=0",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
  expect(response.statusCode).toBe(400);
  expect(response.json().error.code).toBe("VALIDATION_ERROR");
  await app.close();
 });
 it("returns learner vocabulary retention counts from current published content",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const pool={query:async(sql:string)=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("FROM active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   if(sql.includes("SELECT learning_direction FROM user_preferences"))return {rows:[{learning_direction:"ml_to_en"}]};
   if(sql.includes("WITH eligible AS"))return {rows:[{total_words:18,reviewed_words:10,mastered_words:4,developing_words:6,due_words:7,last_reviewed_at:new Date()}]};
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  const response=await app.inject({method:"GET",url:"/api/v1/learning/vocabulary/summary",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({learning_direction:"ml_to_en",summary:{total_words:18,reviewed_words:10,mastered_words:4,developing_words:6,due_words:7},policy:{mastery_is_a_review_schedule_signal_not_a_fluency_score:true}});
  await app.close();
 });
 it("rejects invalid vocabulary recall ratings before writing",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const pool={query:async(sql:string)=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("FROM active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  const response=await app.inject({method:"POST",url:"/api/v1/learning/lessons/00000000-0000-4000-8000-000000000002/vocabulary/greeting_hello/review",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)},payload:{rating:6}});
  expect(response.statusCode).toBe(400);
  expect(response.json().error.code).toBe("VALIDATION_ERROR");
  await app.close();
 });

});
