import {createHmac} from "node:crypto";
import {describe,it,expect} from "vitest";
import {buildApp} from "./app.js";
import {loadConfig} from "./config.js";

const adminId="00000000-0000-4000-8000-000000000011";
const sessionId="00000000-0000-4000-8000-000000000012";

function adminHeader(secret:string){
 const payload=Buffer.from(JSON.stringify({
  sub:adminId,
  sid:sessionId,
  exp:Math.floor(Date.now()/1000)+300,
  iss:"gabenglish-admin",
  aud:"gabenglish-console"
 })).toString("base64url");
 const token=payload+"."+createHmac("sha256",secret).update(payload).digest("base64url");
 return "Bearer "+token;
}

function adminPool(roles=["superadmin"]){
 return {query:async(sql:string)=>{
  if(sql.includes("UPDATE admin_sessions SET last_seen_at"))return {rows:[{admin_account_id:adminId}]};
  if(sql.includes("SELECT a.id,a.email_normalized"))return {rows:[{id:adminId,email_normalized:"admin@example.com",roles}]};
  if(sql.includes("count(DISTINCT user_id)"))return {rows:[{unique_learners:"4"}]};
  if(sql.includes("FROM gabroo_speech_usage_buckets"))return {rows:[
   {bucket_start:"2026-11-22",characters_used:"1200",requests_count:"8",active_learners:"3"},
   {bucket_start:"2026-11-23",characters_used:"800",requests_count:"5",active_learners:"2"}
  ]};
  return {rows:[]};
 }} as any;
}

describe("Superadmin Gabroo speech usage report",()=>{
 it("requires an authenticated superadmin",async()=>{
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,adminPool());
  const response=await app.inject({method:"GET",url:"/api/v1/admin/gabroo/speech-usage"});
  expect(response.statusCode).toBe(401);
  await app.close();
 });

 it("denies aggregate speech usage to non-superadmins",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const app=await buildApp(config,async()=>true,adminPool(["support"]));
  const response=await app.inject({
   method:"GET",
   url:"/api/v1/admin/gabroo/speech-usage",
   headers:{authorization:adminHeader(config.AUTH_TOKEN_SECRET)}
  });
  expect(response.statusCode).toBe(403);
  expect(response.json().error.code).toBe("SUPERADMIN_REQUIRED");
  await app.close();
 });

 it("normalizes partial-month filters to stored month bucket starts",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  let values:unknown[]|undefined;
  const pool={query:async(sql:string,params?:unknown[])=>{
   if(sql.includes("UPDATE admin_sessions SET last_seen_at"))return {rows:[{admin_account_id:adminId}]};
   if(sql.includes("SELECT a.id,a.email_normalized"))return {rows:[{id:adminId,email_normalized:"admin@example.com",roles:["superadmin"]}]};
   if(sql.includes("FROM gabroo_speech_usage_buckets")){
    values=params;
    return {rows:[]};
   }
   return {rows:[]};
  }} as any;
  const app=await buildApp(config,async()=>true,pool);
  const response=await app.inject({
   method:"GET",
   url:"/api/v1/admin/gabroo/speech-usage?period=month&from=2026-10-19&to=2026-11-23",
   headers:{authorization:adminHeader(config.AUTH_TOKEN_SECRET)}
  });
  expect(response.statusCode).toBe(200);
  expect(values).toEqual(["month","2026-10-01","2026-11-01"]);
  await app.close();
 });

 it("returns aggregate speech metrics without learner or speech content",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const app=await buildApp(config,async()=>true,adminPool());
  const response=await app.inject({
   method:"GET",
   url:"/api/v1/admin/gabroo/speech-usage?period=day&from=2026-11-22&to=2026-11-23",
   headers:{authorization:adminHeader(config.AUTH_TOKEN_SECRET)}
  });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({
   timezone:"Asia/Kolkata",
   period:"day",
   from:"2026-11-22",
   to:"2026-11-23",
   totals:{characters_used:2000,requests_count:13,active_learner_buckets:5,unique_learners:4},
   series:[
    {bucket_start:"2026-11-22",characters_used:1200,requests_count:8,active_learners:3},
    {bucket_start:"2026-11-23",characters_used:800,requests_count:5,active_learners:2}
   ]
  });
  expect(JSON.stringify(response.json())).not.toMatch(/email|transcript|audio|speech_text/i);
  await app.close();
 });

 it("rejects invalid or excessively wide date ranges",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const app=await buildApp(config,async()=>true,adminPool());
  const response=await app.inject({
   method:"GET",
   url:"/api/v1/admin/gabroo/speech-usage?from=2025-01-01&to=2026-11-23",
   headers:{authorization:adminHeader(config.AUTH_TOKEN_SECRET)}
  });
  expect(response.statusCode).toBe(400);
  await app.close();
 });
});
