import {URL} from "node:url";
import type {IncomingMessage} from "node:http";
import type {Duplex} from "node:stream";
import type {FastifyInstance} from "fastify";
import type {Pool} from "pg";
import {WebSocket,WebSocketServer} from "ws";
import {gabrooRealtimeClientMessageSchema,GABROO_REALTIME_PROTOCOL_VERSION,GABROO_REALTIME_MAX_AUDIO_FRAME_BYTES} from "@gabenglish/contracts";
import {consumeGabrooRealtimeSessionTicket} from "./gabroo-realtime-sessions.js";
import {getActiveSubscriptionEntitlement} from "./subscriptions.js";
import type {AppConfig} from "./config.js";

export const GABROO_REALTIME_PATH="/api/v1/gabroo/realtime/connect";
export const GABROO_REALTIME_SUBPROTOCOL="gabroo.v1";
const TICKET_PREFIX="ticket.";
const MAX_SESSION_MS=15*60*1000;
const IDLE_TIMEOUT_MS=60*1000;
const HEARTBEAT_MS=25*1000;

export function parseGabrooRealtimeUpgrade(request:IncomingMessage,allowedOrigins:string[]){
 const rawUrl=request.url??"/";
 let url:URL;
 try{url=new URL(rawUrl,"http://localhost");}catch{return {ok:false as const,status:400,reason:"invalid_url"};}
 if(url.pathname!==GABROO_REALTIME_PATH)return {ok:false as const,status:404,reason:"not_found"};
 if(url.search)return {ok:false as const,status:400,reason:"query_not_allowed"};
 const origin=request.headers.origin;
 if(origin){
  let normalized:string;
  try{normalized=new URL(origin).origin;}catch{return {ok:false as const,status:403,reason:"origin_denied"};}
  const allowed=allowedOrigins.some(value=>{try{return new URL(value).origin===normalized;}catch{return false;}});
  if(!allowed)return {ok:false as const,status:403,reason:"origin_denied"};
 }
 const raw=request.headers["sec-websocket-protocol"];
 const protocols=(Array.isArray(raw)?raw.join(","):raw??"").split(",").map(x=>x.trim()).filter(Boolean);
 const ticketProtocol=protocols.find(value=>value.startsWith(TICKET_PREFIX));
 const ticket=ticketProtocol?.slice(TICKET_PREFIX.length);
 if(!protocols.includes(GABROO_REALTIME_SUBPROTOCOL)||!ticket||!/^[0-9a-f]{64}$/.test(ticket)){
  return {ok:false as const,status:401,reason:"ticket_required"};
 }
 return {ok:true as const,ticket};
}

function rejectUpgrade(socket:Duplex,status:number){
 const messages:Record<number,string>={400:"Bad Request",401:"Unauthorized",403:"Forbidden",404:"Not Found",503:"Service Unavailable"};
 if(socket.destroyed)return;
 socket.write("HTTP/1.1 "+status+" "+(messages[status]??"Bad Request")+"\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
 socket.destroy();
}

export async function registerGabrooRealtimeWebSocket(app:FastifyInstance,pool:Pool,config:AppConfig){
 const wss=new WebSocketServer({noServer:true,maxPayload:GABROO_REALTIME_MAX_AUDIO_FRAME_BYTES,perMessageDeflate:false,handleProtocols(protocols){return protocols.has(GABROO_REALTIME_SUBPROTOCOL)?GABROO_REALTIME_SUBPROTOCOL:false;}});
 const activeByUser=new Map<string,WebSocket>();
 const server=app.server;
 const onUpgrade=(request:IncomingMessage,socket:Duplex,head:Buffer)=>{
  const parsed=parseGabrooRealtimeUpgrade(request,config.corsOrigins);
  if(!parsed.ok){rejectUpgrade(socket,parsed.status);return;}
  void (async()=>{
   try{
    const consumed=await consumeGabrooRealtimeSessionTicket(pool,parsed.ticket);
    if(!consumed){rejectUpgrade(socket,401);return;}
    const [entitlement,account]=await Promise.all([
     getActiveSubscriptionEntitlement(pool,consumed.userId),
     pool.query("SELECT id FROM users WHERE id=$1 AND status='active' AND deleted_at IS NULL AND (email_verified_at IS NOT NULL OR phone_verified_at IS NOT NULL)",[consumed.userId])
    ]);
    if(!entitlement||!account.rows[0]){rejectUpgrade(socket,403);return;}
    if(activeByUser.has(consumed.userId)){rejectUpgrade(socket,503);return;}
    wss.handleUpgrade(request,socket,head,ws=>{
     activeByUser.set(consumed.userId,ws);
     const sessionId=consumed.sessionId;
     let lastActivity=Date.now();
     let lastPong=Date.now();
     const send=(message:Record<string,unknown>)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({protocol_version:GABROO_REALTIME_PROTOCOL_VERSION,session_id:sessionId,...message}));};
     send({type:"session.accepted",audio:{codec:"pcm_s16le",sample_rate_hz:16000,channels:1},max_frame_bytes:GABROO_REALTIME_MAX_AUDIO_FRAME_BYTES,max_turn_ms:120000});
     const heartbeat=setInterval(()=>{
      const now=Date.now();
      if(now-lastPong>IDLE_TIMEOUT_MS||now-lastActivity>IDLE_TIMEOUT_MS){send({type:"session.closed",reason:"timeout"});ws.close(4000,"idle_timeout");return;}
      if(now-lastActivity>MAX_SESSION_MS){send({type:"session.closed",reason:"timeout"});ws.close(4000,"session_timeout");return;}
      if(ws.readyState===WebSocket.OPEN)ws.ping();
     },HEARTBEAT_MS);
     ws.on("pong",()=>{lastPong=Date.now();});
     ws.on("message",(data,isBinary)=>{
      lastActivity=Date.now();
      if(isBinary){send({type:"session.closed",reason:"policy"});ws.close(1003,"audio_streaming_not_enabled");return;}
      let payload:unknown;
      try{payload=JSON.parse(data.toString());}catch{ws.close(1007,"invalid_json");return;}
      const parsedMessage=gabrooRealtimeClientMessageSchema.safeParse(payload);
      if(!parsedMessage.success||parsedMessage.data.session_id!==sessionId){ws.close(1008,"invalid_session_message");return;}
      const message=parsedMessage.data;
      if(message.type==="session.stop"){send({type:"session.closed",reason:"learner_stop"});ws.close(1000,"learner_stop");return;}
      if(message.type==="turn.start"){
       send({type:"turn.failed",turn_id:message.turn_id,code:"RECOGNITION_FAILED",message:"Live audio recognition is not enabled yet. Please use the recording and transcript review flow."});
      }
     });
     ws.once("close",()=>{clearInterval(heartbeat);if(activeByUser.get(consumed.userId)===ws)activeByUser.delete(consumed.userId);});
     ws.once("error",()=>{clearInterval(heartbeat);if(activeByUser.get(consumed.userId)===ws)activeByUser.delete(consumed.userId);});
    });
   }catch{rejectUpgrade(socket,503);}
  })();
 };
 server.on("upgrade",onUpgrade);
 app.addHook("onClose",async()=>{
  server.off("upgrade",onUpgrade);
  for(const ws of activeByUser.values()){
   if(ws.readyState===WebSocket.OPEN){ws.send(JSON.stringify({protocol_version:GABROO_REALTIME_PROTOCOL_VERSION,session_id:"server",type:"session.closed",reason:"server_shutdown"}));ws.close(1012,"server_shutdown");}
  }
  activeByUser.clear();
  await new Promise<void>(resolve=>wss.close(()=>resolve()));
 });
}
