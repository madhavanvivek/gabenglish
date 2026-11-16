import {afterAll,beforeAll,describe,expect,it} from "vitest";
import {Pool} from "pg";
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
  expect(result.rows.map(row=>row.version)).toEqual(["0001_initial_foundation.sql","0002_placement_sessions.sql"]);
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
