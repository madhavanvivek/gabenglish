import {createHash,createHmac} from "node:crypto";
import {describe,it,expect} from "vitest";
import {buildApp} from "./app.js";
import {loadConfig} from "./config.js";
import {consumeGabrooRealtimeSessionTicket} from "./gabroo-realtime-sessions.js";

const USER_ID="00000000-0000-4000-8000-000000000001";
const SESSION_ID="00000000-0000-4000-8000-000000000002";
function authHeader(secret:string){
 const payload=Buffer.from(JSON.stringify({sub:USER_ID,sid:SESSION_ID,exp:Math.floor(Date.now()/1000)+300,iss:"gabenglish-api",aud:"gabenglish-app"})).toString("base64url");
 return "Bearer "+payload+"."+createHmac("sha256",secret).update(payload).digest("base64url");
}
function makePool(hasEntitlement=true){
 const calls:{sql:string;params?:unknown[]}[]=[];
 const insertParams:unknown[][]=[];
 let consumeCount=0;
 const client={
  query:async(sql:string,params?:unknown[])=>{
   calls.push({sql,params});
   if(sql.includes("INSERT INTO gabroo_realtime_session_tickets")){insertParams.push(params??[]);return {rows:[{expires_at:new Date(Date.now()+60_000)}]};}
   return {rows:[]};
  },
  release:()=>{}
 };
 const pool={
  query:async(sql:string,params?:unknown[])=>{
   calls.push({sql,params});
   if(sql.includes("FROM users u JOIN refresh_sessions"))return {rows:[{id:USER_ID,email:"learner@example.com",status:"active",email_verified_at:new Date(),phone_verified_at:null,display_name:"Learner",locale:"ml-IN",timezone:"Asia/Kolkata"}]};
   if(sql.includes("active_subscription_entitlements"))return {rows:hasEntitlement?[{id:"entitlement-1"}]:[]};
   if(sql.includes("UPDATE gabroo_realtime_session_tickets SET consumed_at=now() WHERE token_digest")){
    consumeCount++;
    return {rows:consumeCount===1?[{session_id:"session-live",user_id:USER_ID}]:[]};
   }
   return {rows:[]};
  },
  connect:async()=>client
 } as any;
 return {pool,calls,insertParams};
}

describe("Gabroo realtime session ticket API",()=>{
 it("requires a verified authenticated learner",async()=>{
  const {pool}=makePool();const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const response=await app.inject({method:"POST",url:"/api/v1/gabroo/realtime/session-ticket"});
  expect(response.statusCode).toBe(401);expect(response.json().error.code).toBe("VERIFIED_ACCOUNT_REQUIRED");await app.close();
 });
 it("requires an active paid entitlement",async()=>{
  const config=loadConfig({NODE_ENV:"test"});const {pool,calls}=makePool(false);const app=await buildApp(config,async()=>true,pool);
  const response=await app.inject({method:"POST",url:"/api/v1/gabroo/realtime/session-ticket",headers:{authorization:authHeader(config.AUTH_TOKEN_SECRET)}});
  expect(response.statusCode).toBe(403);expect(response.json().error.code).toBe("PAID_SUBSCRIPTION_REQUIRED");expect(calls.some(x=>x.sql.includes("INSERT INTO gabroo_realtime_session_tickets"))).toBe(false);await app.close();
 });
 it("issues a short-lived ticket without storing the raw capability or caching the response",async()=>{
  const config=loadConfig({NODE_ENV:"test"});const {pool,calls,insertParams}=makePool();const app=await buildApp(config,async()=>true,pool);
  const response=await app.inject({method:"POST",url:"/api/v1/gabroo/realtime/session-ticket",headers:{authorization:authHeader(config.AUTH_TOKEN_SECRET)}});
  expect(response.statusCode).toBe(201);expect(response.headers["cache-control"]).toBe("private, no-store");
  const body=response.json();expect(body).toMatchObject({expires_in_seconds:60,single_use:true,transport:"websocket_handshake_pending"});
  expect(body.connection_ticket).toMatch(/^[0-9a-f]{64}$/);expect(body.session_id).toMatch(/^[0-9a-f-]{36}$/);
  const stored=insertParams[0]![0] as string;expect(stored).toBe(createHash("sha256").update(body.connection_ticket).digest("hex"));expect(stored).not.toBe(body.connection_ticket);
  expect(calls.some(x=>x.sql.includes("pg_advisory_xact_lock"))).toBe(true);expect(calls.some(x=>x.sql==="COMMIT")).toBe(true);await app.close();
 });
});

describe("Gabroo realtime session ticket consumption",()=>{
 it("atomically returns the session owner once and rejects replay",async()=>{
  const {pool,calls}=makePool();
  expect(await consumeGabrooRealtimeSessionTicket(pool,"a".repeat(64))).toEqual({sessionId:"session-live",userId:USER_ID});
  expect(await consumeGabrooRealtimeSessionTicket(pool,"a".repeat(64))).toBeUndefined();
  expect(calls.filter(x=>x.sql.includes("UPDATE gabroo_realtime_session_tickets SET consumed_at=now() WHERE token_digest"))).toHaveLength(2);
  expect(calls[0]!.sql).toContain("consumed_at IS NULL AND expires_at>now()");
 });
 it("rejects malformed tokens without touching the database",async()=>{
  const {pool,calls}=makePool();expect(await consumeGabrooRealtimeSessionTicket(pool,"not-a-ticket")).toBeUndefined();expect(calls).toHaveLength(0);
 });
});