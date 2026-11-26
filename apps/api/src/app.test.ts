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

 it("serves a published lesson without leaking authoring answer keys",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const authoredContent={schema_version:1,blocks:[{
   type:"exercise",id:"greeting",instruction:"Choose a greeting",prompt:"You meet someone in the morning.",
   response_type:"single_choice",options:[{id:"morning",label:"Good morning"},{id:"night",label:"Good night"}],
   correct_option_id:"morning",correct_feedback:"Exactly right.",rubric:{internal_note:"not for learners"}
  }]};
  const pool={query:async(sql:string)=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   if(sql.includes("FROM lessons l JOIN modules m"))return {rows:[{
    course_id:"00000000-0000-4000-8000-000000000010",learning_direction:"ml_to_en",source_language:"ml",target_language:"en",support_language:"ml",
    lesson_id:"00000000-0000-4000-8000-000000000020",slug:"morning-greetings",title:"Morning greetings",
    version_id:"00000000-0000-4000-8000-000000000030",version_number:1,content:authoredContent,
    script_mode:"latin",register:"everyday",dialect_scope:null,romanisation:null,
    progress_status:null,progress_percent:null,progress_updated_at:null
   }]};
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  const response=await app.inject({method:"GET",url:"/api/v1/learning/lessons/00000000-0000-4000-8000-000000000020",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
  expect(response.statusCode).toBe(200);
  expect(response.json().lesson.content.blocks[0]).toEqual({
   type:"exercise",id:"greeting",instruction:"Choose a greeting",prompt:"You meet someone in the morning.",
   response_type:"single_choice",options:[{id:"morning",label:"Good morning"},{id:"night",label:"Good night"}]
  });
  expect(JSON.stringify(response.json())).not.toContain("correct_option_id");
  expect(JSON.stringify(response.json())).not.toContain("internal_note");
  expect(response.json().progress).toBeNull();
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


 it("blocks anonymous and free learners from every paid learning endpoint",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const app=await buildApp(config,async()=>true,recognitionPool(false));
  const lessonId="00000000-0000-4000-8000-000000000020";
  const headers={authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)};
  const requests=[
   {method:"GET" as const,url:"/api/v1/learning/courses"},
   {method:"GET" as const,url:"/api/v1/learning/lessons/"+lessonId},
   {method:"POST" as const,url:"/api/v1/learning/lessons/"+lessonId+"/progress",payload:{progress_percent:25}},
   {method:"POST" as const,url:"/api/v1/learning/lessons/"+lessonId+"/exercises/greeting/attempts",payload:{response:"hello"}},
   {method:"GET" as const,url:"/api/v1/learning/lessons/"+lessonId+"/exercises/greeting/attempts"}
  ];
  try{
   for(const request of requests){
    const anonymous=await app.inject(request);
    expect(anonymous.statusCode,request.url+" should reject anonymous access").toBe(401);
    const free=await app.inject({...request,headers});
    expect(free.statusCode,request.url+" should reject free-tier access").toBe(403);
    expect(free.json().error.code).toBe("PAID_SUBSCRIPTION_REQUIRED");
   }
  }finally{await app.close();}
 });

 it("rejects malformed lesson and exercise references before querying learning content",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const queries:string[]=[];
  const pool={query:async(sql:string)=>{
   queries.push(sql);
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  const headers={authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)};
  try{
   const invalidLesson=await app.inject({method:"GET",url:"/api/v1/learning/lessons/not-a-uuid",headers});
   expect(invalidLesson.statusCode).toBe(400);
   expect(invalidLesson.json().error.code).toBe("INVALID_LESSON_ID");
   const invalidProgress=await app.inject({method:"POST",url:"/api/v1/learning/lessons/not-a-uuid/progress",headers,payload:{progress_percent:50}});
   expect(invalidProgress.statusCode).toBe(400);
   expect(invalidProgress.json().error.code).toBe("INVALID_LESSON_ID");
   const invalidExercise=await app.inject({method:"POST",url:"/api/v1/learning/lessons/00000000-0000-4000-8000-000000000020/exercises/bad%20id/attempts",headers,payload:{response:"hello"}});
   expect(invalidExercise.statusCode).toBe(400);
   expect(invalidExercise.json().error.code).toBe("INVALID_EXERCISE_REFERENCE");
   expect(queries.some(sql=>sql.includes("FROM lessons l JOIN modules m"))).toBe(false);
  }finally{await app.close();}
 });


 it("returns only the authenticated learner's attempts for the current published lesson version",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const learnerId="00000000-0000-4000-8000-000000000001";
  const lessonId="00000000-0000-4000-8000-000000000020";
  const versionId="00000000-0000-4000-8000-000000000021";
  const attemptQuery:{sql:string;values?:unknown[]}[]=[];
  const pool={query:async(sql:string,values?:unknown[])=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:learnerId,email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   if(sql.includes("SELECT lv.id AS version_id,c.learning_direction,lv.content"))return {rows:[{version_id:versionId,learning_direction:"ml_to_en",content:{schema_version:1,blocks:[{type:"exercise",id:"greeting",instruction:"Choose",prompt:"Morning",response_type:"single_choice",options:[{id:"morning",label:"Good morning"},{id:"night",label:"Good night"}]}]}}]};
   if(sql.includes("FROM learner_exercise_attempts")){attemptQuery.push({sql,values});return {rows:[{response:"morning",is_correct:true,feedback:"Correct.",attempted_at:new Date("2026-11-26T10:00:00Z")}]};}
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  try{
   const response=await app.inject({method:"GET",url:"/api/v1/learning/lessons/"+lessonId+"/exercises/greeting/attempts",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
   expect(response.statusCode).toBe(200);
   expect(response.json()).toMatchObject({lesson_id:lessonId,exercise_id:"greeting",learning_direction:"ml_to_en",attempts:[{response:"morning",is_correct:true,feedback:"Correct."}]});
   expect(attemptQuery).toHaveLength(1);
   expect(attemptQuery[0]?.values).toEqual([learnerId,lessonId,versionId,"ml_to_en","greeting"]);
   expect(attemptQuery[0]?.sql).toContain("LIMIT 20");
  }finally{await app.close();}
 });

 it("does not query exercise history for an unpublished or unknown exercise",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const queries:string[]=[];
  const pool={query:async(sql:string)=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   if(sql.includes("SELECT lv.id AS version_id,c.learning_direction,lv.content"))return {rows:[{version_id:"00000000-0000-4000-8000-000000000021",learning_direction:"ml_to_en",content:{schema_version:1,blocks:[{type:"text",body:"Hello"}]}}]};
   queries.push(sql);return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  try{
   const response=await app.inject({method:"GET",url:"/api/v1/learning/lessons/00000000-0000-4000-8000-000000000020/exercises/missing/attempts",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
   expect(response.statusCode).toBe(404);
   expect(response.json().error.code).toBe("EXERCISE_NOT_FOUND");
   expect(queries.some(sql=>sql.includes("FROM learner_exercise_attempts"))).toBe(false);
  }finally{await app.close();}
 });


 it("returns a direction-scoped course progress overview for the authenticated learner",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const learnerId="00000000-0000-4000-8000-000000000001";
  const queries:{sql:string;values?:unknown[]}[]=[];
  const pool={query:async(sql:string,values?:unknown[])=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:learnerId,email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   if(sql.includes("SELECT learning_direction FROM user_preferences"))return {rows:[{learning_direction:"ml_to_en"}]};
   if(sql.includes("COUNT(l.id)::int AS total_lessons")){queries.push({sql,values});return {rows:[
    {course_id:"course-1",course_code:"A1",course_title:"Everyday English",course_description:"Start speaking",total_lessons:4,started_lessons:2,completed_lessons:1,progress_percent:"37.50",last_activity_at:new Date("2026-11-26T10:00:00Z")},
    {course_id:"course-2",course_code:"A2",course_title:"Confident English",course_description:null,total_lessons:2,started_lessons:0,completed_lessons:0,progress_percent:"0.00",last_activity_at:null}
   ]};}
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  try{
   const response=await app.inject({method:"GET",url:"/api/v1/progress/overview",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
   expect(response.statusCode).toBe(200);
   expect(response.json()).toMatchObject({learning_direction:"ml_to_en",summary:{total_courses:2,total_lessons:6,started_lessons:2,completed_lessons:1,progress_percent:25},courses:[{id:"course-1",progress_percent:37.5},{id:"course-2",progress_percent:0}]});
   expect(queries).toHaveLength(1);
   expect(queries[0]?.values).toEqual([learnerId,"ml_to_en"]);
   expect(queries[0]?.sql).toContain("educator_review_status='approved'");
  }finally{await app.close();}
 });

 it("requires authentication and an active subscription for course progress",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const pool={query:async(sql:string)=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("active_subscription_entitlements"))return {rows:[]};
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  try{
   const anonymous=await app.inject({method:"GET",url:"/api/v1/progress/overview"});
   expect(anonymous.statusCode).toBe(401);
   const free=await app.inject({method:"GET",url:"/api/v1/progress/overview",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
   expect(free.statusCode).toBe(403);
   expect(free.json().error.code).toBe("PAID_SUBSCRIPTION_REQUIRED");
  }finally{await app.close();}
 });


 it("returns only the authenticated learner's due vocabulary",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const learnerId="00000000-0000-4000-8000-000000000001";
  const dueQueries:{sql:string;values?:unknown[]}[]=[];
  const pool={query:async(sql:string,values?:unknown[])=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:learnerId,email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   if(sql.includes("SELECT learning_direction FROM user_preferences"))return {rows:[{learning_direction:"ml_to_en"}]};
   if(sql.includes("FROM learner_vocabulary_items")&&sql.includes("due_at<=now()")){dueQueries.push({sql,values});return {rows:[{id:"vocab-1",source_term:"വെള്ളം",target_term:"water",interval_days:1}]};}
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  try{
   const response=await app.inject({method:"GET",url:"/api/v1/vocabulary/review?limit=10",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
   expect(response.statusCode).toBe(200);
   expect(response.json()).toMatchObject({learning_direction:"ml_to_en",items:[{id:"vocab-1",source_term:"വെള്ളം",target_term:"water"}]});
   expect(dueQueries[0]?.values).toEqual([learnerId,"ml_to_en",10]);
   expect(dueQueries[0]?.sql).toContain("user_id=$1");
  }finally{await app.close();}
 });

 it("saves vocabulary only against a published lesson in the selected direction",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const learnerId="00000000-0000-4000-8000-000000000001";
  const inserts:unknown[][]=[];
  const pool={query:async(sql:string,values?:unknown[])=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:learnerId,email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   if(sql.includes("SELECT learning_direction FROM user_preferences"))return {rows:[{learning_direction:"ml_to_en"}]};
   if(sql.includes("SELECT l.id AS lesson_id,lv.id AS version_id"))return {rows:[{lesson_id:"lesson-1",version_id:"version-1"}]};
   if(sql.includes("INSERT INTO learner_vocabulary_items")){inserts.push(values??[]);return {rows:[{id:"vocab-1",source_term:"വെള്ളം",target_term:"water",status:"active"}]};}
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  try{
   const response=await app.inject({method:"POST",url:"/api/v1/vocabulary",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)},payload:{source_term:" വെള്ളം ",target_term:" water ",lesson_id:"00000000-0000-4000-8000-000000000020"}});
   expect(response.statusCode).toBe(201);
   expect(response.json().item).toMatchObject({id:"vocab-1",source_term:"വെള്ളം",target_term:"water"});
   expect(inserts[0]).toEqual([learnerId,"ml_to_en","വെള്ളം","water",null,"lesson-1","version-1"]);
  }finally{await app.close();}
 });


 it("schedules a successful vocabulary review and records its history atomically",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const learnerId="00000000-0000-4000-8000-000000000001";
  const clientQueries:{sql:string;values?:unknown[]}[]=[];
  const client={query:async(sql:string,values?:unknown[])=>{
   clientQueries.push({sql,values});
   if(sql.includes("SELECT interval_days,ease_factor"))return {rows:[{interval_days:1,ease_factor:"2.50",repetitions:1,lapses:0}]};
   if(sql.includes("UPDATE learner_vocabulary_items"))return {rows:[{id:"00000000-0000-4000-8000-000000000099",source_term:"വെള്ളം",target_term:"water",interval_days:6,repetitions:2,lapses:0}]};
   return {rows:[]};
  },release:()=>{}};
  const pool={query:async(sql:string)=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:learnerId,email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   if(sql.includes("SELECT learning_direction FROM user_preferences"))return {rows:[{learning_direction:"ml_to_en"}]};
   return {rows:[]};
  },connect:async()=>client} as any;
  const app=await buildApp(config,async()=>true,pool);
  try{
   const response=await app.inject({method:"POST",url:"/api/v1/vocabulary/00000000-0000-4000-8000-000000000099/review",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)},payload:{rating:"good"}});
   expect(response.statusCode).toBe(200);
   expect(response.json()).toMatchObject({item:{id:"00000000-0000-4000-8000-000000000099",interval_days:6,repetitions:2},review:{rating:"good",next_interval_days:6}});
   expect(clientQueries.map(query=>query.sql.split(" ")[0])).toEqual(["BEGIN","SELECT","UPDATE","INSERT","COMMIT"]);
   expect(clientQueries[3]?.values).toEqual(["00000000-0000-4000-8000-000000000099",learnerId,"good",1,6]);
  }finally{await app.close();}
 });

 it("rejects vocabulary review for another learner's item",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const learnerId="00000000-0000-4000-8000-000000000001";
  const clientQueries:string[]=[];
  const client={query:async(sql:string)=>{clientQueries.push(sql);if(sql.includes("SELECT interval_days"))return {rows:[]};return {rows:[]};},release:()=>{}};
  const pool={query:async(sql:string)=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:learnerId,email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   if(sql.includes("SELECT learning_direction FROM user_preferences"))return {rows:[{learning_direction:"ml_to_en"}]};
   return {rows:[]};
  },connect:async()=>client} as any;
  const app=await buildApp(config,async()=>true,pool);
  try{
   const response=await app.inject({method:"POST",url:"/api/v1/vocabulary/00000000-0000-4000-8000-000000000099/review",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)},payload:{rating:"good"}});
   expect(response.statusCode).toBe(404);
   expect(response.json().error.code).toBe("VOCABULARY_NOT_FOUND");
   expect(clientQueries).toContain("ROLLBACK");
   expect(clientQueries.some(sql=>sql.includes("UPDATE learner_vocabulary_items"))).toBe(false);
  }finally{await app.close();}
 });


 it("lists the authenticated learner's vocabulary collection for the selected direction",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const learnerId="00000000-0000-4000-8000-000000000001";
  const collectionQueries:{sql:string;values?:unknown[]}[]=[];
  const pool={query:async(sql:string,values?:unknown[])=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:learnerId,email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   if(sql.includes("SELECT learning_direction FROM user_preferences"))return {rows:[{learning_direction:"en_to_ml"}]};
   if(sql.includes("FROM learner_vocabulary_items")&&sql.includes("ORDER BY CASE WHEN status='active'")){
    collectionQueries.push({sql,values});
    return {rows:[
     {id:"active-word",source_term:"hello",target_term:"നമസ്കാരം",status:"active"},
     {id:"archived-word",source_term:"goodbye",target_term:"വിട",status:"archived"}
    ]};
   }
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  try{
   const response=await app.inject({method:"GET",url:"/api/v1/vocabulary",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
   expect(response.statusCode).toBe(200);
   expect(response.json()).toMatchObject({learning_direction:"en_to_ml",items:[{id:"active-word",status:"active"},{id:"archived-word",status:"archived"}]});
   expect(collectionQueries).toHaveLength(1);
   expect(collectionQueries[0]?.values).toEqual([learnerId,"en_to_ml"]);
   expect(collectionQueries[0]?.sql).toContain("LIMIT 200");
  }finally{await app.close();}
 });

 it("returns direction-scoped vocabulary review analytics for the authenticated learner",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const learnerId="00000000-0000-4000-8000-000000000001";
  const analyticsQueries:{sql:string;values?:unknown[]}[]=[];
  const pool={query:async(sql:string,values?:unknown[])=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:learnerId,email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   if(sql.includes("SELECT learning_direction FROM user_preferences"))return {rows:[{learning_direction:"en_to_ml"}]};
   if(sql.includes("WITH item_stats AS")){analyticsQueries.push({sql,values});return {rows:[{active_items:12,due_items:3,reviewed_last_7_days:20,positive_ratings_last_7_days:16,again_ratings_last_7_days:4,practice_days_last_7_days:5}]};}
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  try{
   const response=await app.inject({method:"GET",url:"/api/v1/vocabulary/stats",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
   expect(response.statusCode).toBe(200);
   expect(response.json()).toMatchObject({learning_direction:"en_to_ml",stats:{active_items:12,due_items:3,reviewed_last_7_days:20,positive_ratings_last_7_days:16,again_ratings_last_7_days:4,practice_days_last_7_days:5}});
   expect(analyticsQueries).toHaveLength(1);
   expect(analyticsQueries[0]?.values).toEqual([learnerId,"en_to_ml"]);
   expect(analyticsQueries[0]?.sql).toContain("r.user_id=$1 AND i.user_id=$1");
   expect(analyticsQueries[0]?.sql).toContain("i.learning_direction=$2");
   expect(analyticsQueries[0]?.sql).toContain("FROM learner_vocabulary_items WHERE user_id=$1 AND learning_direction=$2");
   expect(analyticsQueries[0]?.sql).toContain("r.reviewed_at>=now()-interval '7 days'");
  }finally{await app.close();}
 });

 it("requires authentication and an active subscription for vocabulary analytics",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const pool={query:async(sql:string)=>{
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:"00000000-0000-4000-8000-000000000001",email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("active_subscription_entitlements"))return {rows:[]};
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  try{
   const anonymous=await app.inject({method:"GET",url:"/api/v1/vocabulary/stats"});
   expect(anonymous.statusCode).toBe(401);
   const free=await app.inject({method:"GET",url:"/api/v1/vocabulary/stats",headers:{authorization:learnerAuthHeader(config.AUTH_TOKEN_SECRET)}});
   expect(free.statusCode).toBe(403);
   expect(free.json().error.code).toBe("PAID_SUBSCRIPTION_REQUIRED");
  }finally{await app.close();}
 });

});
