import {afterAll,beforeAll,describe,expect,it} from "vitest";
import {Pool} from "pg";
import {mkdtemp,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {randomUUID,scryptSync} from "node:crypto";
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
  expect(result.rows.map(row=>row.version)).toEqual(["0001_initial_foundation.sql","0002_placement_sessions.sql","0003_auth_login_throttling.sql","0004_passwordless_otp.sql","0005_placement_owner.sql","0006_free_diagnostic_reports.sql","0007_gabroo_speech_rate.sql","0008_verified_subscription_entitlements.sql","0009_gabroo_conversations.sql","0010_gabroo_learner_memory.sql","0011_learning_direction.sql","0012_gabroo_conversation_direction.sql","0013_directional_diagnostic_reports.sql","0014_direction_aware_curriculum_progress.sql","0015_learner_exercise_attempts.sql","0016_subscription_offer_pricing.sql","0017_subscription_checkout_quotes.sql","0018_admin_subscription_controls.sql","0019_admin_session_idle_timeout.sql"]);
 });

 it("authenticates Superadmins, manages offer windows, audits changes and revokes admin sessions",async()=>{
  if(!pool||!migrationApplied)return;
  const email="superadmin-"+randomUUID()+"@example.test";
  const password="SuperadminTestPassword!2026";
  const salt=Buffer.from(randomUUID().replaceAll("-","").slice(0,32),"hex");
  const derived=scryptSync(password,salt,64,{N:16384,r:8,p:1,maxmem:64*1024*1024});
  const passwordHash="scrypt$16384$8$1$"+salt.toString("base64url")+"$"+derived.toString("base64url");
  const created=await pool.query<{id:string}>("INSERT INTO admin_accounts(email_normalized,password_hash,status) VALUES($1,$2,'active') RETURNING id",[email,passwordHash]);
  const adminId=created.rows[0]!.id;
  try{
   await pool.query("INSERT INTO admin_account_roles(admin_account_id,admin_role_id) SELECT $1,id FROM admin_roles WHERE code='superadmin'",[adminId]);
   const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
   try{
    const denied=await app.inject({method:"GET",url:"/api/v1/admin/subscription-offers"});
    expect(denied.statusCode).toBe(401);
    const login=await app.inject({method:"POST",url:"/api/v1/admin/auth/login",payload:{email,password}});
    expect(login.statusCode).toBe(200);
    expect(login.json().admin.roles).toContain("superadmin");
    const headers={authorization:"Bearer "+login.json().access_token};
    const listed=await app.inject({method:"GET",url:"/api/v1/admin/subscription-offers",headers});
    expect(listed.statusCode).toBe(200);
    expect(listed.json().offers).toHaveLength(2);
    const changed=await app.inject({
     method:"PUT",url:"/api/v1/admin/subscription-offers/monthly",headers,
     payload:{discount_basis_points:1800,enabled:true,starts_at:null,ends_at:null}
    });
    expect(changed.statusCode).toBe(200);
    expect(changed.json().offer).toMatchObject({plan_code:"monthly",discount_basis_points:1800,enabled:true,version:2});
    const price=await app.inject({method:"GET",url:"/api/v1/subscriptions/prices"});
    expect(price.json().prices[0].payable_amount_minor).toBe(8100);
    const invalid=await app.inject({
     method:"PUT",url:"/api/v1/admin/subscription-offers/monthly",headers,
     payload:{discount_basis_points:1800,enabled:true,starts_at:"2026-12-10T00:00:00Z",ends_at:"2026-12-01T00:00:00Z"}
    });
    expect(invalid.statusCode).toBe(400);
    const audit=await pool.query<{action:string;resource_id:string}>("SELECT action,resource_id FROM admin_audit_events WHERE admin_account_id=$1 AND action='subscription.offer.updated'",[adminId]);
    expect(audit.rows).toContainEqual({action:"subscription.offer.updated",resource_id:"monthly"});
    const auditApi=await app.inject({method:"GET",url:"/api/v1/admin/audit-events?action=subscription.offer.updated&limit=10&offset=0",headers});
    expect(auditApi.statusCode).toBe(200);
    expect(auditApi.json().total).toBeGreaterThanOrEqual(1);
    expect(auditApi.json().events).toEqual(expect.arrayContaining([expect.objectContaining({action:"subscription.offer.updated",resource_id:"monthly"})]));
    const invalidAudit=await app.inject({method:"GET",url:"/api/v1/admin/audit-events?limit=500",headers});
    expect(invalidAudit.statusCode).toBe(400);
    const secondLogin=await app.inject({method:"POST",url:"/api/v1/admin/auth/login",payload:{email,password}});
    expect(secondLogin.statusCode).toBe(200);
    const secondHeaders={authorization:"Bearer "+secondLogin.json().access_token};
    const sessions=await app.inject({method:"GET",url:"/api/v1/admin/sessions?limit=10&offset=0",headers});
    expect(sessions.statusCode).toBe(200);
    expect(sessions.json().total).toBeGreaterThanOrEqual(2);
    expect(sessions.json().sessions).toEqual(expect.arrayContaining([
     expect.objectContaining({admin_account_id:adminId,is_current:true}),
     expect.objectContaining({admin_account_id:adminId,is_current:false})
    ]));
    const secondSession=sessions.json().sessions.find((session:{is_current:boolean})=>!session.is_current);
    expect(secondSession?.id).toBeTruthy();
    const revoked=await app.inject({method:"DELETE",url:"/api/v1/admin/sessions/"+secondSession.id,headers});
    expect(revoked.statusCode).toBe(204);
    const revokedSessionAccess=await app.inject({method:"GET",url:"/api/v1/admin/subscription-offers",headers:secondHeaders});
    expect(revokedSessionAccess.statusCode).toBe(401);
    const sessionAudit=await app.inject({method:"GET",url:"/api/v1/admin/audit-events?action=admin.session.revoked&limit=10",headers});
    expect(sessionAudit.statusCode).toBe(200);
    expect(sessionAudit.json().events).toEqual(expect.arrayContaining([expect.objectContaining({action:"admin.session.revoked",resource_id:secondSession.id})]));
    const missingSession=await app.inject({method:"DELETE",url:"/api/v1/admin/sessions/"+randomUUID(),headers});
    expect(missingSession.statusCode).toBe(404);
    const invalidSessionList=await app.inject({method:"GET",url:"/api/v1/admin/sessions?limit=500",headers});
    expect(invalidSessionList.statusCode).toBe(400);
    const logout=await app.inject({method:"POST",url:"/api/v1/admin/auth/logout",headers});
    expect(logout.statusCode).toBe(204);
    const afterLogout=await app.inject({method:"GET",url:"/api/v1/admin/subscription-offers",headers});
    expect(afterLogout.statusCode).toBe(401);

    const idleLogin=await app.inject({method:"POST",url:"/api/v1/admin/auth/login",payload:{email,password}});
    expect(idleLogin.statusCode).toBe(200);
    const idleToken=idleLogin.json().access_token as string;
    const idleClaims=JSON.parse(Buffer.from(idleToken.split(".")[0]!, "base64url").toString("utf8")) as {sid:string};
    await pool.query("UPDATE admin_sessions SET last_seen_at=now()-interval '31 minutes' WHERE id=$1",[idleClaims.sid]);
    const idleRejected=await app.inject({method:"GET",url:"/api/v1/admin/subscription-offers",headers:{authorization:"Bearer "+idleToken}});
    expect(idleRejected.statusCode).toBe(401);
    const idleSession=await app.inject({method:"GET",url:"/api/v1/admin/sessions?limit=10&offset=0",headers});
    expect(idleSession.json().sessions).not.toEqual(expect.arrayContaining([expect.objectContaining({id:idleClaims.sid})]));
   }finally{await app.close();}
  }finally{
   await pool.query("DELETE FROM admin_accounts WHERE id=$1",[adminId]);
   await pool.query("UPDATE subscription_offer_rules SET discount_basis_points=2020,enabled=true,starts_at=NULL,ends_at=NULL WHERE plan_code='monthly'");
  }
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

 it("serves current offers from PostgreSQL and increments the offer version on admin-side updates",async()=>{
  if(!pool||!migrationApplied)return;
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  try{
   const response=await app.inject({method:"GET",url:"/api/v1/subscriptions/prices"});
   expect(response.statusCode).toBe(200);
   expect(response.json()).toMatchObject({currency:"INR",prices:[
    {plan_code:"monthly",standard_amount_minor:9900,payable_amount_minor:7900,discount_amount_minor:2000,offer_applied:true},
    {plan_code:"yearly",standard_amount_minor:118800,payable_amount_minor:79900,discount_amount_minor:38900,offer_applied:true}
   ]});
   const before=await pool.query<{version:number}>("SELECT version FROM subscription_offer_rules WHERE plan_code='monthly'");
   await pool.query("UPDATE subscription_offer_rules SET discount_basis_points=1500 WHERE plan_code='monthly'");
   const after=await pool.query<{version:number;discount_basis_points:number}>("SELECT version,discount_basis_points FROM subscription_offer_rules WHERE plan_code='monthly'");
   expect(after.rows[0]?.version).toBe(before.rows[0]!.version+1);
   expect(after.rows[0]?.discount_basis_points).toBe(1500);
   const updated=await app.inject({method:"GET",url:"/api/v1/subscriptions/prices"});
   expect(updated.json().prices[0].payable_amount_minor).toBe(8400);
   await pool.query("UPDATE subscription_offer_rules SET discount_basis_points=2020 WHERE plan_code='monthly'");
  }finally{await app.close();}
 });


 it("stores a short-lived subscription quote snapshot for the authenticated learner",async()=>{
  if(!pool||!migrationApplied)return;
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const email="subscription-quote-"+randomUUID()+"@example.test";
  let userId:string|undefined,quoteId:string|undefined;
  try{
   const token=await createVerifiedTestSession(app,email,pool);
   userId=(await pool.query<{id:string}>("SELECT id FROM users WHERE email_normalized=$1",[email])).rows[0]!.id;
   const response=await app.inject({
    method:"POST",url:"/api/v1/subscriptions/checkout/quote",
    headers:{authorization:"Bearer "+token},payload:{plan_code:"monthly"}
   });
   expect(response.statusCode).toBe(201);
   expect(response.json()).toMatchObject({
    plan_code:"monthly",currency:"INR",standard_amount_minor:9900,
    discount_amount_minor:2000,payable_amount_minor:7900,
    payment_required:true,access_granted:false
   });
   quoteId=response.json().quote_id;
   const stored=await pool.query<{user_id:string;standard_amount_minor:string;discount_amount_minor:string;payable_amount_minor:string;offer_version:number;quoted_at:Date;expires_at:Date}>(
    "SELECT user_id,standard_amount_minor::text,discount_amount_minor::text,payable_amount_minor::text,offer_version,quoted_at,expires_at FROM subscription_checkout_quotes WHERE id=$1",[quoteId]
   );
   expect(stored.rows[0]).toMatchObject({
    user_id:userId,standard_amount_minor:"9900",discount_amount_minor:"2000",payable_amount_minor:"7900",offer_version:response.json().offer_version
   });
   expect(stored.rows[0]!.expires_at.getTime()-stored.rows[0]!.quoted_at.getTime()).toBe(15*60*1000);
   await expect(pool.query("UPDATE subscription_checkout_quotes SET payable_amount_minor=1 WHERE id=$1",[quoteId])).rejects.toThrow("immutable");
  }finally{
   if(userId)await pool.query("DELETE FROM users WHERE id=$1",[userId]);
   await app.close();
  }
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
   const payment=await pool.query<{id:string}>("INSERT INTO payment_transactions(subscription_id,provider_code,provider_payment_ref,provider_event_id,amount_minor,currency,status,price_standard_amount_minor,price_discount_amount_minor,price_discount_basis_points,price_offer_version,price_quoted_at) VALUES($1,'test-provider',$2,$3,7900,'INR','succeeded',9900,2000,2020,1,now()) RETURNING id",[subscriptionId,"pay-"+randomUUID(),"evt-"+randomUUID()]);
   paymentId=payment.rows[0]!.id;
   await expect(activateVerifiedSubscriptionPayment(pool,paymentId)).rejects.toMatchObject({code:"PAYMENT_NOT_VERIFIED"});
   await pool.query("UPDATE payment_transactions SET verified_at=now() WHERE id=$1",[paymentId]);
   const activated=await activateVerifiedSubscriptionPayment(pool,paymentId);
   expect(activated.idempotent).toBe(false);
   const savedPrice=await pool.query<{standard_amount_minor:string;discount_amount_minor:string;paid_amount_minor:string}>("SELECT standard_amount_minor::text,discount_amount_minor::text,paid_amount_minor::text FROM subscription_entitlements WHERE id=$1",[activated.entitlement_id]);
   expect(savedPrice.rows[0]).toEqual({standard_amount_minor:"9900",discount_amount_minor:"2000",paid_amount_minor:"7900"});
   expect(new Date(activated.period_end).getTime()-new Date(activated.period_start).getTime()).toBe(30*24*60*60*1000);
   const replay=await activateVerifiedSubscriptionPayment(pool,paymentId);
   expect(replay.idempotent).toBe(true);
   expect(replay.entitlement_id).toBe(activated.entitlement_id);
   const renewal=await pool.query<{id:string}>("INSERT INTO payment_transactions(subscription_id,provider_code,provider_payment_ref,provider_event_id,amount_minor,currency,status,verified_at,price_standard_amount_minor,price_discount_amount_minor,price_discount_basis_points,price_offer_version,price_quoted_at) VALUES($1,'test-provider',$2,$3,7900,'INR','succeeded',now(),9900,2000,2020,1,now()) RETURNING id",[subscriptionId,"pay-"+randomUUID(),"evt-"+randomUUID()]);
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
  let providerCalls=0;let receivedMode:string|undefined;let receivedPolicy:{learnerContext:{preferredName?:string;learningGoal?:string;profileCorrectionPreference?:string};stageGuidance:string;learnerMemory:Array<{category:string;memoryKey:string;content:string}>}|undefined;
  let concurrentCalls=0;let releaseConcurrent!:()=>void;const concurrentGate=new Promise<void>(resolve=>{releaseConcurrent=resolve;});
  const provider={reply:async(input:{mode:string;history:Array<{role:"user"|"assistant";content:string}>;teachingPolicy:{learnerContext:{preferredName?:string;learningGoal?:string;profileCorrectionPreference?:string};stageGuidance:string;learnerMemory:Array<{category:string;memoryKey:string;content:string}>}})=>{
   providerCalls++;receivedMode=input.mode;receivedPolicy=input.teachingPolicy;
   const last=input.history.at(-1)?.content??"";
   if(last.startsWith("parallel")){concurrentCalls++;if(concurrentCalls===2)releaseConcurrent();await concurrentGate;}
   expect(input.history.at(-1)?.role).toBe("user");
   return {content:"That sounds interesting. What happened next?"};
  }};
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool,undefined,provider);
  try{
   const token=await createVerifiedTestSession(app,email,pool);
   const otherToken=await createVerifiedTestSession(app,otherEmail,pool);
   userId=(await pool.query<{id:string}>("SELECT id FROM users WHERE email_normalized=$1",[email])).rows[0]!.id;
   otherUserId=(await pool.query<{id:string}>("SELECT id FROM users WHERE email_normalized=$1",[otherEmail])).rows[0]!.id;
   await pool.query("UPDATE user_profiles SET display_name=$2 WHERE user_id=$1",[userId,"Anu K"]);
   await pool.query("UPDATE user_preferences SET learning_goal=$2,correction_mode=$3 WHERE user_id=$1",[userId,"Speak confidently at work","detailed"]);
   await pool.query("INSERT INTO gabroo_learner_memory(user_id,category,memory_key,content) VALUES($1,'saved_phrase','Useful phrase','Could you please clarify?')",[userId]);
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
   expect(receivedPolicy?.learnerContext).toEqual({preferredName:"Anu K",learningGoal:"Speak confidently at work",profileCorrectionPreference:"detailed"});
   expect(receivedPolicy?.stageGuidance).toContain("not yet available");
   expect(receivedPolicy?.learnerMemory).toEqual([{category:"saved_phrase",memoryKey:"Useful phrase",content:"Could you please clarify?"}]);
   const read=await app.inject({method:"GET",url:"/api/v1/gabroo/conversations/"+conversationId,headers});
   expect(read.statusCode).toBe(200);
   expect(read.json().messages).toHaveLength(2);
   const simultaneous=await Promise.all([
    app.inject({method:"POST",url:"/api/v1/gabroo/conversations/"+conversationId+"/messages",headers,payload:{message:"parallel request one"}}),
    app.inject({method:"POST",url:"/api/v1/gabroo/conversations/"+conversationId+"/messages",headers,payload:{message:"parallel request two"}})
   ]);
   expect(simultaneous.map(result=>result.statusCode).sort()).toEqual([200,409]);
   const afterConcurrent=await pool.query<{turn_count:number;message_count:string}>("SELECT c.turn_count,(SELECT count(*)::text FROM gabroo_conversation_messages m WHERE m.conversation_id=c.id) AS message_count FROM gabroo_conversations c WHERE c.id=$1",[conversationId]);
   expect(afterConcurrent.rows[0]).toMatchObject({turn_count:2,message_count:"4"});
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
 it("lets verified learners inspect, edit and delete their private Gabroo memory without a paid entitlement",async()=>{
  if(!pool||!migrationApplied)return;
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const email="memory-"+randomUUID()+"@example.test";
  const otherEmail="memory-other-"+randomUUID()+"@example.test";
  try{
   const token=await createVerifiedTestSession(app,email,pool);
   const otherToken=await createVerifiedTestSession(app,otherEmail,pool);
   const headers={authorization:"Bearer "+token};
   const created=await app.inject({method:"POST",url:"/api/v1/gabroo/memory",headers,payload:{category:"interest",memory_key:"Travel",content:"Enjoys discussing travel and local culture."}});
   expect(created.statusCode).toBe(201);
   const memoryId=created.json().memory.id as string;
   expect(created.json().memory.source).toBe("learner_saved");
   const listed=await app.inject({method:"GET",url:"/api/v1/gabroo/memory",headers});
   expect(listed.statusCode).toBe(200);
   expect(listed.json().memory).toHaveLength(1);
   const otherList=await app.inject({method:"GET",url:"/api/v1/gabroo/memory",headers:{authorization:"Bearer "+otherToken}});
   expect(otherList.statusCode).toBe(200);
   expect(otherList.json().memory).toHaveLength(0);
   const updated=await app.inject({method:"PATCH",url:"/api/v1/gabroo/memory/"+memoryId,headers,payload:{content:"Enjoys discussing travel, food and local culture."}});
   expect(updated.statusCode).toBe(200);
   expect(updated.json().memory.content).toContain("food");
   const otherDelete=await app.inject({method:"DELETE",url:"/api/v1/gabroo/memory/"+memoryId,headers:{authorization:"Bearer "+otherToken}});
   expect(otherDelete.statusCode).toBe(404);
   const deleted=await app.inject({method:"DELETE",url:"/api/v1/gabroo/memory/"+memoryId,headers});
   expect(deleted.statusCode).toBe(204);
   const afterDelete=await app.inject({method:"GET",url:"/api/v1/gabroo/memory",headers});
   expect(afterDelete.json().memory).toHaveLength(0);
   await app.inject({method:"POST",url:"/api/v1/gabroo/memory",headers,payload:{category:"goal",memory_key:"Speaking",content:"Practise speaking at work."}});
   const cleared=await app.inject({method:"DELETE",url:"/api/v1/gabroo/memory",headers});
   expect(cleared.statusCode).toBe(200);
   expect(cleared.json().deleted_count).toBe(1);
   const afterClear=await app.inject({method:"GET",url:"/api/v1/gabroo/memory",headers});
   expect(afterClear.json().memory).toHaveLength(0);
  }finally{
   await pool.query("DELETE FROM users WHERE email_normalized IN ($1,$2)",[email,otherEmail]);
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
