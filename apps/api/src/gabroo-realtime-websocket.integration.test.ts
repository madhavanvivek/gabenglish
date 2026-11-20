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
  const accepted=nextMessage(client);
  client.send(JSON.stringify({protocol_version:1,session_id:SESSION_ID,turn_id:"turn-1",type:"turn.start",audio:{codec:"pcm_s16le",sample_rate_hz:16000,channels:1}}));
  expect(await accepted).toMatchObject({protocol_version:1,session_id:SESSION_ID,turn_id:"turn-1",type:"turn.accepted",max_turn_ms:120000});
  const framePayload=Buffer.from([0,1,2,3,4,5,6,7]);
  client.send(JSON.stringify({protocol_version:1,session_id:SESSION_ID,turn_id:"turn-1",type:"audio.frame",sequence:0,byte_length:framePayload.byteLength}));
  client.send(framePayload);
  const turnFailed=nextMessage(client);
  client.send(JSON.stringify({protocol_version:1,session_id:SESSION_ID,turn_id:"turn-1",type:"turn.end"}));
  expect(await turnFailed).toMatchObject({protocol_version:1,session_id:SESSION_ID,turn_id:"turn-1",type:"turn.failed",code:"TRANSPORT_NOT_READY"});
  const retryAccepted=nextMessage(client);
  client.send(JSON.stringify({protocol_version:1,session_id:SESSION_ID,turn_id:"turn-retry",type:"turn.start",audio:{codec:"pcm_s16le",sample_rate_hz:16000,channels:1}}));
  expect(await retryAccepted).toMatchObject({type:"turn.accepted",turn_id:"turn-retry"});
  const closed=nextMessage(client);
  const ended=new Promise<void>(resolve=>client.once("close",()=>resolve()));
  client.send(JSON.stringify({protocol_version:1,session_id:SESSION_ID,type:"session.stop"}));
  expect(await closed).toMatchObject({protocol_version:1,session_id:SESSION_ID,type:"session.closed",reason:"learner_stop"});
  await ended;
  await app.close();
 });
 it("closes a session when audio frame sequence numbers are not contiguous",async()=>{
  const config=loadConfig({NODE_ENV:"test"});
  const app=await buildApp(config,async()=>true,pool());
  await app.listen({host:"127.0.0.1",port:0});
  const address=app.server.address();
  if(!address||typeof address==="string")throw new Error("Test server did not bind a TCP port");
  const client=new WebSocket("ws://127.0.0.1:"+address.port+GABROO_REALTIME_PATH,[GABROO_REALTIME_SUBPROTOCOL,"ticket."+TICKET],{headers:{Origin:"http://localhost:8081"}});
  const connected=nextMessage(client);
  await new Promise<void>((resolve,reject)=>{client.once("open",resolve);client.once("error",reject);});
  await connected;
  const accepted=nextMessage(client);
  client.send(JSON.stringify({protocol_version:1,session_id:SESSION_ID,turn_id:"turn-sequence",type:"turn.start",audio:{codec:"pcm_s16le",sample_rate_hz:16000,channels:1}}));
  await accepted;
  const ended=new Promise<number>(resolve=>client.once("close",code=>resolve(code)));
  client.send(JSON.stringify({protocol_version:1,session_id:SESSION_ID,turn_id:"turn-sequence",type:"audio.frame",sequence:1,byte_length:4}));
  expect(await ended).toBe(1008);
  await app.close();
 });

 it("returns a learner-review transcript after recognition without submitting a conversation turn",async()=>{
  const received:{mimeType?:string;language?:string;audioBytes?:number}={};
  const provider={transcribe:async(input:{audio:Uint8Array;mimeType:string;language:string;signal:AbortSignal})=>{
   received.mimeType=input.mimeType;received.language=input.language;received.audioBytes=input.audio.byteLength;
   return {text:"ഹലോ, how are you?",languageDetected:"mixed" as const};
  }};
  const config=loadConfig({NODE_ENV:"test"});
  const app=await buildApp(config,async()=>true,pool(),undefined,undefined,undefined,undefined,provider as any);
  await app.listen({host:"127.0.0.1",port:0});
  const address=app.server.address();
  if(!address||typeof address==="string")throw new Error("Test server did not bind a TCP port");
  const client=new WebSocket("ws://127.0.0.1:"+address.port+GABROO_REALTIME_PATH,[GABROO_REALTIME_SUBPROTOCOL,"ticket."+TICKET],{headers:{Origin:"http://localhost:8081"}});
  const connected=nextMessage(client);
  await new Promise<void>((resolve,reject)=>{client.once("open",resolve);client.once("error",reject);});
  await connected;
  const accepted=nextMessage(client);
  client.send(JSON.stringify({protocol_version:1,session_id:SESSION_ID,turn_id:"turn-stt",type:"turn.start",audio:{codec:"pcm_s16le",sample_rate_hz:16000,channels:1}}));
  await accepted;
  const pcm=Buffer.from([0,0,1,0,2,0,3,0]);
  client.send(JSON.stringify({protocol_version:1,session_id:SESSION_ID,turn_id:"turn-stt",type:"audio.frame",sequence:0,byte_length:pcm.byteLength}));
  client.send(pcm);
  const transcript=nextMessage(client);
  client.send(JSON.stringify({protocol_version:1,session_id:SESSION_ID,turn_id:"turn-stt",type:"turn.end"}));
  expect(await transcript).toMatchObject({type:"transcript.final",turn_id:"turn-stt",text:"ഹലോ, how are you?",language_detected:"mixed",review_required:true});
  expect(received).toMatchObject({mimeType:"audio/wav",language:"ml-en",audioBytes:52});
  const nextAccepted=nextMessage(client);
  client.send(JSON.stringify({protocol_version:1,session_id:SESSION_ID,turn_id:"turn-after-stt",type:"turn.start",audio:{codec:"pcm_s16le",sample_rate_hz:16000,channels:1}}));
  expect(await nextAccepted).toMatchObject({type:"turn.accepted",turn_id:"turn-after-stt"});
  const closed=new Promise<void>(resolve=>client.once("close",()=>resolve()));
  client.send(JSON.stringify({protocol_version:1,session_id:SESSION_ID,type:"session.stop"}));
  await closed;
  await app.close();
 });

 it("aborts in-flight speech recognition when the learner interrupts after turn.end",async()=>{
  let startedResolve!:()=>void;
  let abortedResolve!:()=>void;
  const started=new Promise<void>(resolve=>{startedResolve=resolve;});
  const aborted=new Promise<void>(resolve=>{abortedResolve=resolve;});
  const provider={transcribe:async(input:{audio:Uint8Array;mimeType:string;language:string;signal:AbortSignal})=>{
   startedResolve();
   return await new Promise<never>((_resolve,reject)=>{
    if(input.signal.aborted){abortedResolve();reject(new Error("aborted"));return;}
    input.signal.addEventListener("abort",()=>{abortedResolve();reject(new Error("aborted"));},{once:true});
   });
  }};
  const config=loadConfig({NODE_ENV:"test"});
  const app=await buildApp(config,async()=>true,pool(),undefined,undefined,undefined,undefined,provider as any);
  await app.listen({host:"127.0.0.1",port:0});
  const address=app.server.address();
  if(!address||typeof address==="string")throw new Error("Test server did not bind a TCP port");
  const client=new WebSocket("ws://127.0.0.1:"+address.port+GABROO_REALTIME_PATH,[GABROO_REALTIME_SUBPROTOCOL,"ticket."+TICKET],{headers:{Origin:"http://localhost:8081"}});
  const connected=nextMessage(client);
  await new Promise<void>((resolve,reject)=>{client.once("open",resolve);client.once("error",reject);});
  await connected;
  const accepted=nextMessage(client);
  client.send(JSON.stringify({protocol_version:1,session_id:SESSION_ID,turn_id:"turn-interrupt",type:"turn.start",audio:{codec:"pcm_s16le",sample_rate_hz:16000,channels:1}}));
  await accepted;
  const pcm=Buffer.from([0,0,1,0,2,0,3,0]);
  client.send(JSON.stringify({protocol_version:1,session_id:SESSION_ID,turn_id:"turn-interrupt",type:"audio.frame",sequence:0,byte_length:pcm.byteLength}));
  client.send(pcm);
  client.send(JSON.stringify({protocol_version:1,session_id:SESSION_ID,turn_id:"turn-interrupt",type:"turn.end"}));
  await started;
  const secondTurnRejected=nextMessage(client);
  client.send(JSON.stringify({protocol_version:1,session_id:SESSION_ID,turn_id:"turn-too-soon",type:"turn.start",audio:{codec:"pcm_s16le",sample_rate_hz:16000,channels:1}}));
  expect(await secondTurnRejected).toMatchObject({type:"turn.failed",turn_id:"turn-too-soon",code:"TURN_LIMIT"});
  client.send(JSON.stringify({protocol_version:1,session_id:SESSION_ID,turn_id:"turn-interrupt",type:"tutor.interrupt"}));
  await aborted;
  const closed=nextMessage(client);
  const ended=new Promise<void>(resolve=>client.once("close",()=>resolve()));
  client.send(JSON.stringify({protocol_version:1,session_id:SESSION_ID,type:"session.stop"}));
  expect(await closed).toMatchObject({type:"session.closed",reason:"learner_stop"});
  await ended;
  await app.close();
 });

});
