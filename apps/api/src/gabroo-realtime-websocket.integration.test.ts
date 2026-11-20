import {describe,it,expect} from "vitest";
import {WebSocket} from "ws";
import {buildApp} from "./app.js";
import {loadConfig} from "./config.js";
import {GABROO_REALTIME_PATH,GABROO_REALTIME_SUBPROTOCOL} from "./gabroo-realtime-websocket.js";

const USER_ID="00000000-0000-4000-8000-000000000001";
const SESSION_ID="00000000-0000-4000-8000-000000000002";
const TICKET="b".repeat(64);
function pool(){
 let consumed=false;
 return {
  query:async(sql:string)=>{
   if(sql.includes("UPDATE gabroo_realtime_session_tickets SET consumed_at=now() WHERE token_digest")){
    if(consumed)return {rows:[]};
    consumed=true;return {rows:[{session_id:SESSION_ID,user_id:USER_ID}]};
   }
   if(sql.includes("active_subscription_entitlements"))return {rows:[{id:"entitlement-1"}]};
   if(sql.includes("SELECT id FROM users WHERE id=$1"))return {rows:[{id:USER_ID}]};
   return {rows:[]};
  },
  connect:async()=>({query:async()=>({rows:[]}),release:()=>{}})
 } as any;
}
function nextMessage(client:WebSocket){
 return new Promise<any>((resolve,reject)=>{
  client.once("message",data=>{try{resolve(JSON.parse(data.toString()));}catch(error){reject(error);}});
  client.once("error",reject);
 });
}

describe("Gabroo realtime WebSocket handshake",()=>{
 it("consumes the one-time ticket, establishes an owner-scoped control session and closes cleanly",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const app=await buildApp(config,async()=>true,pool());
  await app.listen({host:"127.0.0.1",port:0});
  const address=app.server.address();
  if(!address||typeof address==="string")throw new Error("Test server did not bind a TCP port");
  const client=new WebSocket("ws://127.0.0.1:"+address.port+GABROO_REALTIME_PATH,[GABROO_REALTIME_SUBPROTOCOL,"ticket."+TICKET],{headers:{Origin:"http://localhost:8081"}});
  const connected=nextMessage(client);
  await new Promise<void>((resolve,reject)=>{client.once("open",resolve);client.once("error",reject);});
  expect(await connected).toMatchObject({protocol_version:1,session_id:SESSION_ID,type:"session.connected"});
  const closed=nextMessage(client);
  const ended=new Promise<void>(resolve=>client.once("close",()=>resolve()));
  client.send(JSON.stringify({protocol_version:1,session_id:SESSION_ID,type:"session.stop"}));
  expect(await closed).toMatchObject({protocol_version:1,session_id:SESSION_ID,type:"session.closed",reason:"learner_stop"});
  await ended;
  await app.close();
 });
});
