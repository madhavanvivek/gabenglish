import {afterAll,beforeAll,describe,expect,it} from "vitest";
import {Pool} from "pg";
import {mkdtemp,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {randomUUID} from "node:crypto";
import {buildApp} from "./app.js";
import {loadConfig} from "./config.js";
import {runMigrations} from "./migrate.js";

const databaseUrl=process.env.DATABASE_URL;
const integration=databaseUrl?describe:describe.skip;
const pool=databaseUrl?new Pool({connectionString:databaseUrl}):undefined;
let migrationApplied=false;

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
  expect(result.rows.map(row=>row.version)).toEqual(["0001_initial_foundation.sql","0002_placement_sessions.sql","0003_auth_login_throttling.sql"]);
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
   const preferences=await app.inject({method:"PATCH",url:"/api/v1/auth/me/preferences",headers:{authorization:"Bearer "+login.json().access_token},payload:{support_language:"ml",daily_target_minutes:15,correction_mode:"gentle"}});
   expect(preferences.statusCode).toBe(200);
   expect(preferences.json().preferences.daily_target_minutes).toBe(15);
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
 it("persists an active conversation across API process restarts",async()=>{
  if(!pool||!migrationApplied)return;
  const firstApp=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const started=await firstApp.inject({method:"POST",url:"/api/v1/placement/conversation/start",payload:{preferred_language:"en"}});
  expect(started.statusCode).toBe(200);
  const sessionId=started.json().session_id as string;
  await firstApp.close();

  const restartedApp=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const response=await restartedApp.inject({method:"POST",url:"/api/v1/placement/conversation/respond",payload:{session_id:sessionId,turn:{prompt_id:"intro",response:"My name is Anu and I live in Kozhikode."}}});
  expect(response.statusCode).toBe(200);
  expect(response.json().prompt_id).toBe("routine");
  await restartedApp.close();
 });
 it("allows only one concurrent update and returns a retryable conflict for the stale writer",async()=>{
  if(!pool||!migrationApplied)return;
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const started=await app.inject({method:"POST",url:"/api/v1/placement/conversation/start",payload:{preferred_language:"en"}});
  const payload={session_id:started.json().session_id,turn:{prompt_id:"intro",response:"My name is Anu and I live in Kozhikode."}};
  const results=await Promise.all([
   app.inject({method:"POST",url:"/api/v1/placement/conversation/respond",payload}),
   app.inject({method:"POST",url:"/api/v1/placement/conversation/respond",payload})
  ]);
  expect(results.every(result=>result.statusCode===200||result.statusCode===409)).toBe(true);
  expect(results.some(result=>result.statusCode===200)).toBe(true);
  const stored=await pool.query<{state:{revision:number;turn:number}}>("SELECT state FROM placement_sessions WHERE id=$1",[payload.session_id]);
  expect(stored.rows[0]?.state).toMatchObject({revision:2,turn:1});
  const retry=await app.inject({method:"POST",url:"/api/v1/placement/conversation/respond",payload});
  expect(retry.statusCode).toBe(200);
  expect(retry.json().prompt_id).toBe("routine");
  await app.close();
 });
 it("returns an expired-session response for an expired database row",async()=>{
  if(!pool||!migrationApplied)return;
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const started=await app.inject({method:"POST",url:"/api/v1/placement/conversation/start",payload:{preferred_language:"en"}});
  const sessionId=started.json().session_id as string;
  await pool.query("UPDATE placement_sessions SET expires_at=now()-interval '1 minute' WHERE id=$1",[sessionId]);
  const response=await app.inject({method:"POST",url:"/api/v1/placement/conversation/respond",payload:{session_id:sessionId,turn:{prompt_id:"intro",response:"My name is Anu and I live in Kozhikode."}}});
  expect(response.statusCode).toBe(410);
  expect(response.json().error.code).toBe("SESSION_EXPIRED");
  await app.close();
 });
});
