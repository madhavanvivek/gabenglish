import {afterAll,beforeAll,describe,expect,it} from "vitest";
import {Pool} from "pg";
import {mkdtemp,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {randomUUID} from "node:crypto";
import {buildApp} from "./app.js";
import {loadConfig} from "./config.js";
import {runMigrations} from "./migrate.js";
import {activateVerifiedSubscriptionPayment} from "./subscription-entitlements.js";

const databaseUrl=process.env.DATABASE_URL;
const integration=databaseUrl?describe:describe.skip;
const pool=databaseUrl?new Pool({connectionString:databaseUrl}):undefined;
let migrationApplied=false;

async function createVerifiedTestSession(app:Awaited<ReturnType<typeof buildApp>>,email:string,pool:Pool){
 const password="TestOnlyPassword!2026";
 const registered=await app.inject({method:"POST",url:"/api/v1/auth/register",payload:{email,password}});
 if(registered.statusCode!==201)throw new Error("Test account registration failed: "+registered.statusCode);
 const userId=registered.json().user.id as string;
 await pool.query("UPDATE users SET email_verified_at=now() WHERE id=$1",[userId]);
 return registered.json().access_token as string;
}

integration("PostgreSQL placement session integration",()=>{
 beforeAll(async()=>{
  if(!pool)return;
  await runMigrations(pool);
  migrationApplied=true;
 });
 afterAll(async()=>{
  if(pool){
   await pool.query("DELETE FROM placement_sessions");
   await pool.end();
  }
 });
 it("records migrations and safely re-runs without changing applied schema",async()=>{
  if(!pool||!migrationApplied)return;
  await runMigrations(pool);
  const result=await pool.query<{version:string}>("SELECT version FROM schema_migrations ORDER BY version");
  expect(result.rows.map(row=>row.version)).toEqual(["0001_initial_foundation.sql","0002_placement_sessions.sql","0003_auth_login_throttling.sql","0004_passwordless_otp.sql","0005_placement_owner.sql","0006_free_diagnostic_reports.sql","0007_gabroo_speech_rate.sql","0008_verified_subscription_entitlements.sql","0009_gabroo_conversations.sql"]);
 });
 it("creates a fail-closed verified subscription entitlement ledger with only monthly and yearly terms",async()=>{
  if(!pool||!migrationApplied)return;
  const constraints=await pool.query<{constraint_name:string;check_clause:string}>(`
   SELECT c.conname AS constraint_name,pg_get_constraintdef(c.oid) AS check_clause
   FROM pg_constraint c
   JOIN pg_class t ON t.oid=c.conrelid
   WHERE t.relname IN ('subscription_plans','regional_prices','subscription_entitlements')
  `);
  expect(constraints.rows.some(row=>row.constraint_name==="subscription_plans_initial_terms_chk"&&row.check_clause.includes("monthly")&&row.check_clause.includes("yearly"))).toBe(true);
  expect(constraints.rows.some(row=>row.constraint_name==="regional_prices_initial_terms_chk"&&row.check_clause.includes("month")&&row.check_clause.includes("year"))).toBe(true);
  const view=await pool.query<{count:string}>("SELECT count(*)::text AS count FROM active_subscription_entitlements");
  expect(Number(view.rows[0]?.count??0)).toBe(0);
  const columns=await pool.query<{column_name:string;is_nullable:string}>(`
   SELECT column_name,is_nullable FROM information_schema.columns
   WHERE table_name='subscription_entitlements'
  `);
  expect(columns.rows.find(row=>row.column_name==="verified_payment_at")?.is_nullable).toBe("NO");
  expect(columns.rows.find(row=>row.column_name==="provider_event_id")?.is_nullable).toBe("NO");
 });
 it("returns free subscription access by default and requires a verified learner session",async()=>{
  if(!pool||!migrationApplied)return;
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const email="subscription-free-"+randomUUID()+"@example.test";
  try{
   const anonymous=await app.inject({method:"GET",url:"/api/v1/subscriptions/current"});
   expect(anonymous.statusCode).toBe(401);
   const token=await createVerifiedTestSession(app,email,pool);
   const current=await app.inject({method:"GET",url:"/api/v1/subscriptions/current",headers:{authorization:"Bearer "+token}});
   expect(current.statusCode).toBe(200);
   expect(current.json()).toEqual({access:"free",active:false,entitlement:null});
  }finally{
   await pool.query("DELETE FROM users WHERE email_normalized=$1",[email]);
   await app.close();
  }
 });
 it("activates only a verified, price-matched payment and is idempotent",async()=>{
  if(!pool||!migrationApplied)return;
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const email="subscription-activation-"+randomUUID()+"@example.test";
  let userId:string|undefined,planId:string|undefined,priceId:string|undefined,subscriptionId:string|undefined,paymentId:string|undefined,renewalPaymentId:string|undefined;
  try{
   const token=await createVerifiedTestSession(app,email,pool);
   const me=await app.inject({method:"GET",url:"/api/v1/auth/me",headers:{authorization:"Bearer "+token}});
   userId=me.json().user.id;
   const plan=await pool.query<{id:string}>("INSERT INTO subscription_plans(code,name,entitlements) VALUES('monthly','Monthly',jsonb_build_object('gabroo_companion',true)) RETURNING id");
   planId=plan.rows[0]!.id;
   const price=await pool.query<{id:string}>("INSERT INTO regional_prices(plan_id,country_code,currency,billing_interval,amount_minor) VALUES($1,'IN','INR','month',9900) RETURNING id",[planId]);
   priceId=price.rows[0]!.id;
   const subscription=await pool.query<{id:string}>("INSERT INTO subscriptions(user_id,plan_id,regional_price_id,status) VALUES($1,$2,$3,'pending') RETURNING id",[userId,planId,priceId]);
   subscriptionId=subscription.rows[0]!.id;
   const payment=await pool.query<{id:string}>("INSERT INTO payment_transactions(subscription_id,provider_code,provider_payment_ref,provider_event_id,amount_minor,currency,status) VALUES($1,'test-provider',$2,$3,9900,'INR','succeeded') RETURNING id",[subscriptionId,"pay-"+randomUUID(),"evt-"+randomUUID()]);
   paymentId=payment.rows[0]!.id;
   await expect(activateVerifiedSubscriptionPayment(pool,paymentId)).rejects.toMatchObject({code:"PAYMENT_NOT_VERIFIED"});
   await pool.query("UPDATE payment_transactions SET verified_at=now() WHERE id=$1",[paymentId]);
   const activated=await activateVerifiedSubscriptionPayment(pool,paymentId);
   expect(activated.idempotent).toBe(false);
   expect(new Date(activated.period_end).getTime()-new Date(activated.period_start).getTime()).toBe(30*24*60*60*1000);
   const replay=await activateVerifiedSubscriptionPayment(pool,paymentId);
   expect(replay.idempotent).toBe(true);
   expect(replay.entitlement_id).toBe(activated.entitlement_id);
   const renewal=await pool.query<{id:string}>("INSERT INTO payment_transactions(subscription_id,provider_code,provider_payment_ref,provider_event_id,amount_minor,currency,status,verified_at) VALUES($1,'test-provider',$2,$3,9900,'INR','succeeded',now()) RETURNING id",[subscriptionId,"pay-"+randomUUID(),"evt-"+randomUUID()]);
   renewalPaymentId=renewal.rows[0]!.id;
   const renewed=await activateVerifiedSubscriptionPayment(pool,renewalPaymentId);
   expect(new Date(renewed.period_start).getTime()).toBe(new Date(activated.period_end).getTime());
   expect(new Date(renewed.period_end).getTime()-new Date(renewed.period_start).getTime()).toBe(30*24*60*60*1000);
   const status=await app.inject({method:"GET",url:"/api/v1/subscriptions/current",headers:{authorization:"Bearer "+token}});
   expect(status.statusCode).toBe(200);
   expect(status.json().access).toBe("paid");
   const subscriptionRow=await pool.query<{status:string}>("SELECT status FROM subscriptions WHERE id=$1",[subscriptionId]);
   expect(subscriptionRow.rows[0]?.status).toBe("active");
  }finally{
   if(subscriptionId)await pool.query("DELETE FROM subscription_entitlements WHERE subscription_id=$1",[subscriptionId]);
   if(paymentId)await pool.query("DELETE FROM payment_transactions WHERE id=$1",[paymentId]);
   if(renewalPaymentId)await pool.query("DELETE FROM payment_transactions WHERE id=$1",[renewalPaymentId]);
   if(subscriptionId)await pool.query("DELETE FROM subscriptions WHERE id=$1",[subscriptionId]);
   if(priceId)await pool.query("DELETE FROM regional_prices WHERE id=$1",[priceId]);
   if(planId)await pool.query("DELETE FROM subscription_plans WHERE id=$1",[planId]);
   if(userId)await pool.query("DELETE FROM users WHERE id=$1",[userId]);
   await app.close();
  }
 });

 it("creates the Gabroo conversation schema and gates paid chat before writing data",async()=>{
  if(!pool||!migrationApplied)return;
  const columns=await pool.query<{column_name:string}>("SELECT column_name FROM information_schema.columns WHERE table_name='gabroo_conversations'");
  expect(columns.rows.map(row=>row.column_name)).toContain("user_id");
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const email="gabroo-free-"+randomUUID()+"@example.test";
  try{
   const anonymous=await app.inject({method:"POST",url:"/api/v1/gabroo/conversations",payload:{}});
   expect(anonymous.statusCode).toBe(401);
   const token=await createVerifiedTestSession(app,email,pool);
   const headers={authorization:"Bearer "+token};
   const denied=await app.inject({method:"POST",url:"/api/v1/gabroo/conversations",headers,payload:{}});
   expect(denied.statusCode).toBe(403);
   expect(denied.json().error.code).toBe("PAID_SUBSCRIPTION_REQUIRED");
   const count=await pool.query<{count:string}>("SELECT count(*)::text AS count FROM gabroo_conversations WHERE user_id=(SELECT id FROM users WHERE email_normalized=$1)",[email]);
   expect(count.rows[0]?.count).toBe("0");
   const history=await app.inject({method:"GET",url:"/api/v1/gabroo/conversations",headers});
   expect(history.statusCode).toBe(403);
  }finally{
   await pool.query("DELETE FROM users WHERE email_normalized=$1",[email]);
   await app.close();
  }
 });

 it("persists paid Gabroo turns atomically and enforces conversation ownership",async()=>{
  if(!pool||!migrationApplied)return;
  const email="gabroo-paid-"+randomUUID()+"@example.test";
  const otherEmail="gabroo-other-"+randomUUID()+"@example.test";
  let userId:string|undefined,otherUserId:string|undefined,planId:string|undefined,priceId:string|undefined,subscriptionId:string|undefined,paymentId:string|undefined;
  let providerCalls=0;let receivedMode:string|undefined;
  const provider={reply:async(input:{mode:string;history:Array<{role:"user"|"assistant";content:string}>})=>{
   providerCalls++;receivedMode=input.mode;
   expect(input.history.at(-1)?.role).toBe("user");
   return {content:"That sounds interesting. What happened next?"};
  }};
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool,undefined,provider);
  try{
   const token=await createVerifiedTestSession(app,email,pool);
   const otherToken=await createVerifiedTestSession(app,otherEmail,pool);
   userId=(await pool.query<{id:string}>("SELECT id FROM users WHERE email_normalized=$1",[email])).rows[0]!.id;
   otherUserId=(await pool.query<{id:string}>("SELECT id FROM users WHERE email_normalized=$1",[otherEmail])).rows[0]!.id;
   const plan=await pool.query<{id:string}>("INSERT INTO subscription_plans(code,name,entitlements) VALUES('monthly','Monthly Gabroo test',jsonb_build_object('gabroo_companion',true)) RETURNING id");
   planId=plan.rows[0]!.id;
   const price=await pool.query<{id:string}>("INSERT INTO regional_prices(plan_id,country_code,currency,billing_interval,amount_minor) VALUES($1,'IN','INR','month',9900) RETURNING id",[planId]);
   priceId=price.rows[0]!.id;
   const subscription=await pool.query<{id:string}>("INSERT INTO subscriptions(user_id,plan_id,regional_price_id,status) VALUES($1,$2,$3,'pending') RETURNING id",[userId,planId,priceId]);
   subscriptionId=subscription.rows[0]!.id;
   const payment=await pool.query<{id:string}>("INSERT INTO payment_transactions(subscription_id,provider_code,provider_payment_ref,provider_event_id,amount_minor,currency,status,verified_at) VALUES($1,'test-provider',$2,$3,9900,'INR','succeeded',now()) RETURNING id",[subscriptionId,"gabroo-pay-"+randomUUID(),"gabroo-evt-"+randomUUID()]);
   paymentId=payment.rows[0]!.id;
   await activateVerifiedSubscriptionPayment(pool,paymentId);
   const headers={authorization:"Bearer "+token};
   const created=await app.inject({method:"POST",url:"/api/v1/gabroo/conversations",headers,payload:{mode:"gentle_correction",support_language:"ml"}});
   expect(created.statusCode).toBe(201);
   const conversationId=created.json().conversation.id as string;
   const changed=await app.inject({method:"PATCH",url:"/api/v1/gabroo/conversations/"+conversationId,headers,payload:{mode:"free_flow"}});
   expect(changed.statusCode).toBe(200);expect(changed.json().conversation.mode).toBe("free_flow");
   const sent=await app.inject({method:"POST",url:"/api/v1/gabroo/conversations/"+conversationId+"/messages",headers,payload:{message:"I went to the beach yesterday."}});
   expect(sent.statusCode).toBe(200);
   expect(sent.json().messages).toHaveLength(2);
   expect(sent.json().messages.map((message:{role:string})=>message.role)).toEqual(["user","assistant"]);
   expect(providerCalls).toBe(1);expect(receivedMode).toBe("free_flow");
   const read=await app.inject({method:"GET",url:"/api/v1/gabroo/conversations/"+conversationId,headers});
   expect(read.statusCode).toBe(200);
   expect(read.json().messages).toHaveLength(2);
   const otherRead=await app.inject({method:"GET",url:"/api/v1/gabroo/conversations/"+conversationId,headers:{authorization:"Bearer "+otherToken}});
   expect(otherRead.statusCode).toBe(404);
   const otherDelete=await app.inject({method:"DELETE",url:"/api/v1/gabroo/conversations/"+conversationId,headers:{authorization:"Bearer "+otherToken}});
   expect(otherDelete.statusCode).toBe(404);
   const deleted=await app.inject({method:"DELETE",url:"/api/v1/gabroo/conversations/"+conversationId,headers});
   expect(deleted.statusCode).toBe(204);
   const afterDelete=await pool.query("SELECT id FROM gabroo_conversations WHERE id=$1",[conversationId]);
   expect(afterDelete.rows).toHaveLength(0);
  }finally{
   if(subscriptionId)await pool.query("DELETE FROM subscription_entitlements WHERE subscription_id=$1",[subscriptionId]);
   if(paymentId)await pool.query("DELETE FROM payment_transactions WHERE id=$1",[paymentId]);
   if(subscriptionId)await pool.query("DELETE FROM subscriptions WHERE id=$1",[subscriptionId]);
   if(priceId)await pool.query("DELETE FROM regional_prices WHERE id=$1",[priceId]);
   if(planId)await pool.query("DELETE FROM subscription_plans WHERE id=$1",[planId]);
   if(userId)await pool.query("DELETE FROM users WHERE id=$1",[userId]);
   if(otherUserId)await pool.query("DELETE FROM users WHERE id=$1",[otherUserId]);
   await app.close();
  }
 });
 it("rejects edits to an already-applied migration checksum",async()=>{
  if(!pool||!migrationApplied)return;
  const directory=await mkdtemp(join(tmpdir(),"gabenglish-migrations-"));
  try{
   await writeFile(join(directory,"0001_initial_foundation.sql"),"SELECT 1;");
   await expect(runMigrations(pool,directory)).rejects.toThrow("Applied migration checksum mismatch: 0001_initial_foundation.sql");
  }finally{
   await rm(directory,{recursive:true,force:true});
  }
 });
 it("registers a learner, authenticates, rotates and revokes refresh sessions",async()=>{
  if(!pool||!migrationApplied)return;
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const email="learner-"+randomUUID()+"@example.test";
  const password="SafeLearnerPassword!2026";
  try{
   const registered=await app.inject({method:"POST",url:"/api/v1/auth/register",payload:{email,password,display_name:"Anu"}});
   expect(registered.statusCode).toBe(201);
   const account=registered.json();
   expect(account.user.email).toBe(email);
   expect(account.email_verified).toBe(false);
   expect(account.access_token).toBeTruthy();
   expect(account.refresh_token).toBeTruthy();
   const stored=await pool.query<{password_hash:string;email_verified_at:Date|null}>("SELECT password_hash,email_verified_at FROM users WHERE email_normalized=$1",[email]);
   expect(stored.rows[0]?.password_hash).not.toBe(password);
   expect(stored.rows[0]?.password_hash.startsWith("scrypt$")).toBe(true);
   expect(stored.rows[0]?.email_verified_at).toBeNull();

   const login=await app.inject({method:"POST",url:"/api/v1/auth/login",payload:{email,password}});
   expect(login.statusCode).toBe(200);
   const badLogin=await app.inject({method:"POST",url:"/api/v1/auth/login",payload:{email,password:"WrongPassword!2026"}});
   expect(badLogin.statusCode).toBe(401);
   const me=await app.inject({method:"GET",url:"/api/v1/auth/me",headers:{authorization:"Bearer "+login.json().access_token}});
   expect(me.statusCode).toBe(200);
   expect(me.json().user.display_name).toBe("Anu");
   const secondLogin=await app.inject({method:"POST",url:"/api/v1/auth/login",payload:{email,password}});
   expect(secondLogin.statusCode).toBe(200);
   const profile=await app.inject({method:"PATCH",url:"/api/v1/auth/me",headers:{authorization:"Bearer "+login.json().access_token},payload:{display_name:"Anu K",locale:"ml-IN"}});
   expect(profile.statusCode).toBe(200);
   expect(profile.json().user.display_name).toBe("Anu K");
   const preferences=await app.inject({method:"PATCH",url:"/api/v1/auth/me/preferences",headers:{authorization:"Bearer "+login.json().access_token},payload:{support_language:"ml",daily_target_minutes:15,correction_mode:"gentle",gabroo_speech_rate:0.85}});
   expect(preferences.statusCode).toBe(200);
   expect(preferences.json().preferences.daily_target_minutes).toBe(15);
   expect(Number(preferences.json().preferences.gabroo_speech_rate)).toBe(0.85);
   const persistedPreferences=await app.inject({method:"GET",url:"/api/v1/auth/me",headers:{authorization:"Bearer "+login.json().access_token}});
   expect(Number(persistedPreferences.json().preferences.gabroo_speech_rate)).toBe(0.85);
   const invalidSpeechRate=await app.inject({method:"PATCH",url:"/api/v1/auth/me/preferences",headers:{authorization:"Bearer "+login.json().access_token},payload:{gabroo_speech_rate:1.03}});
   expect(invalidSpeechRate.statusCode).toBe(400);
   const consent=await app.inject({method:"POST",url:"/api/v1/auth/me/consents",headers:{authorization:"Bearer "+login.json().access_token},payload:{purpose:"voice_processing",policy_version:"2026-11-v1",granted:true}});
   expect(consent.statusCode).toBe(201);
   expect(consent.json().consent.granted).toBe(true);
   for(let attempt=0;attempt<9;attempt++){
    const rejected=await app.inject({method:"POST",url:"/api/v1/auth/login",payload:{email,password:"WrongPassword!2026"}});
    expect(rejected.statusCode).toBe(401);
   }
   const limited=await app.inject({method:"POST",url:"/api/v1/auth/login",payload:{email,password}});
   expect(limited.statusCode).toBe(429);

   const oldRefresh=login.json().refresh_token as string;
   const rotated=await app.inject({method:"POST",url:"/api/v1/auth/refresh",payload:{refresh_token:oldRefresh}});
   expect(rotated.statusCode).toBe(200);
   const staleAccess=await app.inject({method:"GET",url:"/api/v1/auth/me",headers:{authorization:"Bearer "+login.json().access_token}});
   expect(staleAccess.statusCode).toBe(401);
   const currentAccess=await app.inject({method:"GET",url:"/api/v1/auth/me",headers:{authorization:"Bearer "+rotated.json().access_token}});
   expect(currentAccess.statusCode).toBe(200);
   const replay=await app.inject({method:"POST",url:"/api/v1/auth/refresh",payload:{refresh_token:oldRefresh}});
   expect(replay.statusCode).toBe(401);
   await app.inject({method:"POST",url:"/api/v1/auth/logout",payload:{refresh_token:rotated.json().refresh_token}});
   const afterLogout=await app.inject({method:"POST",url:"/api/v1/auth/refresh",payload:{refresh_token:rotated.json().refresh_token}});
   expect(afterLogout.statusCode).toBe(401);
   const revokedAccess=await app.inject({method:"GET",url:"/api/v1/auth/me",headers:{authorization:"Bearer "+rotated.json().access_token}});
   expect(revokedAccess.statusCode).toBe(401);
   const deletion=await app.inject({method:"POST",url:"/api/v1/auth/me/deletion-request",headers:{authorization:"Bearer "+secondLogin.json().access_token}});
   expect(deletion.statusCode).toBe(202);
   expect(deletion.json().status).toBe("deletion_requested");
   const afterDeletion=await app.inject({method:"GET",url:"/api/v1/auth/me",headers:{authorization:"Bearer "+secondLogin.json().access_token}});
   expect(afterDeletion.statusCode).toBe(401);
   const refreshAfterDeletion=await app.inject({method:"POST",url:"/api/v1/auth/refresh",payload:{refresh_token:secondLogin.json().refresh_token}});
   expect(refreshAfterDeletion.statusCode).toBe(401);
   const unauthenticated=await app.inject({method:"GET",url:"/api/v1/auth/me"});
   expect(unauthenticated.statusCode).toBe(401);
  }finally{
   await pool.query("DELETE FROM users WHERE email_normalized=$1",[email]);
   await app.close();
  }
 });
 it("verifies an email OTP once and issues a learner session only after verification",async()=>{
  if(!pool||!migrationApplied)return;
  let deliveredCode="";
  const email="otp-"+randomUUID()+"@example.test";
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool,{send:async({code})=>{deliveredCode=code;return true;}});
  try{
   const requested=await app.inject({method:"POST",url:"/api/v1/auth/otp/request",payload:{channel:"email",destination:email}});
   expect(requested.statusCode).toBe(202);
   expect(requested.json().masked_destination).not.toContain(email);
   expect(deliveredCode).toMatch(/^\d{6}$/);
   const beforeVerification=await pool.query("SELECT id FROM users WHERE email_normalized=$1",[email]);
   expect(beforeVerification.rows).toHaveLength(0);
   const verified=await app.inject({method:"POST",url:"/api/v1/auth/otp/verify",payload:{challenge_id:requested.json().challenge_id,code:deliveredCode}});
   expect(verified.statusCode).toBe(200);
   expect(verified.json().user.verified_channel).toBe("email");
   expect(verified.json().access_token).toBeTruthy();
   const me=await app.inject({method:"GET",url:"/api/v1/auth/me",headers:{authorization:"Bearer "+verified.json().access_token}});
   expect(me.statusCode).toBe(200);
   expect(me.json().user.email).toBe(email);
   const replay=await app.inject({method:"POST",url:"/api/v1/auth/otp/verify",payload:{challenge_id:requested.json().challenge_id,code:deliveredCode}});
   expect(replay.statusCode).toBe(400);
  }finally{
   await pool.query("DELETE FROM users WHERE email_normalized=$1",[email]);
   await app.close();
  }
 });
 it("links a second verified contact to the same learner without merging accounts",async()=>{
  if(!pool||!migrationApplied)return;
  let deliveredCode="";
  const email="link-"+randomUUID()+"@example.test";
  const phone="+919"+String(Date.now()).slice(-9);
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool,{send:async({code})=>{deliveredCode=code;return true;}});
  try{
   const first=await app.inject({method:"POST",url:"/api/v1/auth/otp/request",payload:{channel:"email",destination:email}});
   const signIn=await app.inject({method:"POST",url:"/api/v1/auth/otp/verify",payload:{challenge_id:first.json().challenge_id,code:deliveredCode}});
   expect(signIn.statusCode).toBe(200);
   const userId=signIn.json().user.id as string;
   const headers={authorization:"Bearer "+signIn.json().access_token};
   const requested=await app.inject({method:"POST",url:"/api/v1/auth/contacts/otp/request",headers,payload:{channel:"phone",destination:phone}});
   expect(requested.statusCode).toBe(202);
   const linked=await app.inject({method:"POST",url:"/api/v1/auth/contacts/otp/verify",headers,payload:{challenge_id:requested.json().challenge_id,code:deliveredCode}});
   expect(linked.statusCode).toBe(200);
   const account=await pool.query<{id:string;email_normalized:string;phone_e164:string}>("SELECT id,email_normalized,phone_e164 FROM users WHERE id=$1",[userId]);
   expect(account.rows[0]).toMatchObject({id:userId,email_normalized:email,phone_e164:phone});
   const contacts=await pool.query("SELECT channel FROM auth_otp_verified_contacts WHERE user_id=$1",[userId]);
   expect(contacts.rows).toHaveLength(2);
  }finally{
   await pool.query("DELETE FROM users WHERE email_normalized=$1",[email]);
   await app.close();
  }
 });
 it("persists the free analysis report and lets the verified learner retrieve it",async()=>{
  if(!pool||!migrationApplied)return;
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const email="report-"+randomUUID()+"@example.test";
  const token=await createVerifiedTestSession(app,email,pool);
  const headers={authorization:"Bearer "+token};
  try{
   const started=await app.inject({method:"POST",url:"/api/v1/placement/conversation/start",headers,payload:{preferred_language:"en"}});
   expect(started.statusCode).toBe(200);
   const sessionId=started.json().session_id as string;
   let promptId="intro";
   let completion:Record<string,unknown>={};
   const answers=["I usually work with my team and communicate clearly about daily responsibilities.","Every morning I review priorities and coordinate tasks with my colleagues.","Last weekend I visited family and spent time reading a new book.","I want to improve my English because it helps me communicate at work.","I believe online learning is useful when lessons include practice and feedback.","I would explain the delay honestly, agree on actions and update the client regularly."];
   const promptIds=["intro","routine","past","reason","opinion","scenario"];
   for(let index=0;index<promptIds.length;index++){
    expect(promptId).toBe(promptIds[index]);
    const response=await app.inject({method:"POST",url:"/api/v1/placement/conversation/respond",headers,payload:{session_id:sessionId,turn:{prompt_id:promptId,response:answers[index]}}});
    expect(response.statusCode).toBe(200);
    completion=response.json();
    promptId=String(completion.prompt_id);
   }
   expect(completion.is_complete).toBe(true);
   const report=await app.inject({method:"GET",url:"/api/v1/placement/reports/latest",headers});
   expect(report.statusCode).toBe(200);
   expect(report.json().access).toBe("free");
   expect(report.json().report.status).toBe("provisional");
   const stored=await pool.query("SELECT id FROM free_diagnostic_reports WHERE user_id=(SELECT id FROM users WHERE email_normalized=$1)",[email]);
   expect(stored.rows).toHaveLength(1);
  }finally{
   await pool.query("DELETE FROM users WHERE email_normalized=$1",[email]);
   await app.close();
  }
 });
 it("blocks anonymous visitors from starting the free analysis",async()=>{
  if(!pool||!migrationApplied)return;
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  try{
   const response=await app.inject({method:"POST",url:"/api/v1/placement/conversation/start",payload:{preferred_language:"en"}});
   expect(response.statusCode).toBe(401);
   expect(response.json().error.code).toBe("VERIFIED_ACCOUNT_REQUIRED");
  }finally{await app.close();}
 });
 it("persists an active conversation across API process restarts",async()=>{
  if(!pool||!migrationApplied)return;
  const firstApp=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const token=await createVerifiedTestSession(firstApp,"placement-"+randomUUID()+"@example.test",pool);
  const headers={authorization:"Bearer "+token};
  const started=await firstApp.inject({method:"POST",url:"/api/v1/placement/conversation/start",headers,payload:{preferred_language:"en"}});
  expect(started.statusCode).toBe(200);
  const sessionId=started.json().session_id as string;
  await firstApp.close();

  const restartedApp=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const response=await restartedApp.inject({method:"POST",url:"/api/v1/placement/conversation/respond",headers,payload:{session_id:sessionId,turn:{prompt_id:"intro",response:"My name is Anu and I live in Kozhikode."}}});
  expect(response.statusCode).toBe(200);
  expect(response.json().prompt_id).toBe("routine");
  await restartedApp.close();
 });
 it("allows only one concurrent update and returns a retryable conflict for the stale writer",async()=>{
  if(!pool||!migrationApplied)return;
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const token=await createVerifiedTestSession(app,"concurrent-"+randomUUID()+"@example.test",pool);
  const headers={authorization:"Bearer "+token};
  const started=await app.inject({method:"POST",url:"/api/v1/placement/conversation/start",headers,payload:{preferred_language:"en"}});
  const payload={session_id:started.json().session_id,turn:{prompt_id:"intro",response:"My name is Anu and I live in Kozhikode."}};
  const results=await Promise.all([
   app.inject({method:"POST",url:"/api/v1/placement/conversation/respond",headers,payload}),
   app.inject({method:"POST",url:"/api/v1/placement/conversation/respond",headers,payload})
  ]);
  expect(results.every(result=>result.statusCode===200||result.statusCode===409)).toBe(true);
  expect(results.some(result=>result.statusCode===200)).toBe(true);
  const stored=await pool.query<{state:{revision:number;turn:number}}>("SELECT state FROM placement_sessions WHERE id=$1",[payload.session_id]);
  expect(stored.rows[0]?.state).toMatchObject({revision:2,turn:1});
  const retry=await app.inject({method:"POST",url:"/api/v1/placement/conversation/respond",headers,payload});
  expect(retry.statusCode).toBe(200);
  expect(retry.json().prompt_id).toBe("routine");
  await app.close();
 });
 it("returns an expired-session response for an expired database row",async()=>{
  if(!pool||!migrationApplied)return;
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const token=await createVerifiedTestSession(app,"expiry-"+randomUUID()+"@example.test",pool);
  const headers={authorization:"Bearer "+token};
  const started=await app.inject({method:"POST",url:"/api/v1/placement/conversation/start",headers,payload:{preferred_language:"en"}});
  const sessionId=started.json().session_id as string;
  await pool.query("UPDATE placement_sessions SET expires_at=now()-interval '1 minute' WHERE id=$1",[sessionId]);
  const response=await app.inject({method:"POST",url:"/api/v1/placement/conversation/respond",headers,payload:{session_id:sessionId,turn:{prompt_id:"intro",response:"My name is Anu and I live in Kozhikode."}}});
  expect(response.statusCode).toBe(410);
  expect(response.json().error.code).toBe("SESSION_EXPIRED");
  await app.close();
 });
});
