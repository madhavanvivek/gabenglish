import {URL} from "node:url";
import type {IncomingMessage} from "node:http";
import type {Duplex} from "node:stream";
import type {FastifyInstance} from "fastify";
import type {Pool} from "pg";
import {WebSocket,WebSocketServer} from "ws";
import {gabrooRealtimeClientMessageSchema,GABROO_REALTIME_PROTOCOL_VERSION,GABROO_REALTIME_MAX_AUDIO_FRAME_BYTES,validateGabrooRealtimeAudioFrame,type GabrooRealtimeAudioFrameMetadata,type GabrooRealtimeAudioFormat,type GabrooSpeechRecognitionProvider} from "@gabenglish/contracts";
import {recognizeGabrooAudio} from "./gabroo-recognition-service.js";
import {consumeGabrooRealtimeSessionTicket} from "./gabroo-realtime-sessions.js";
import {getActiveSubscriptionEntitlement} from "./subscriptions.js";
import type {AppConfig} from "./config.js";

export const GABROO_REALTIME_PATH="/api/v1/gabroo/realtime/connect";
export const GABROO_REALTIME_SUBPROTOCOL="gabroo.v1";
const TICKET_PREFIX="ticket.";
const MAX_SESSION_MS=15*60*1000;
const MAX_TURN_MS=120_000;
const MAX_TURN_AUDIO_BYTES=5*1024*1024;
const MAX_FRAMES_PER_SECOND=60;
const IDLE_TIMEOUT_MS=60*1000;
const HEARTBEAT_MS=25*1000;

type ActiveTurn={
 id:string;
 audio:GabrooRealtimeAudioFormat;
 startedAt:number;
 nextSequence:number;
 totalBytes:number;
 pendingFrame?:GabrooRealtimeAudioFrameMetadata;
 frameTimes:number[];
 chunks:Buffer[];
 controller:AbortController;
};

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

export function pcm16MonoToWav(pcm:Uint8Array,sampleRate=16000){
 if(pcm.byteLength===0||pcm.byteLength%2!==0)throw new Error("PCM audio must contain complete 16-bit mono samples.");
 const header=Buffer.alloc(44);
 header.write("RIFF",0);header.writeUInt32LE(36+pcm.byteLength,4);header.write("WAVE",8);
 header.write("fmt ",12);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);
 header.writeUInt32LE(sampleRate,24);header.writeUInt32LE(sampleRate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);
 header.write("data",36);header.writeUInt32LE(pcm.byteLength,40);
 return Buffer.concat([header,Buffer.from(pcm)]);
}

export async function registerGabrooRealtimeWebSocket(app:FastifyInstance,pool:Pool,config:AppConfig,recognitionProvider?:GabrooSpeechRecognitionProvider){
 const wss=new WebSocketServer({noServer:true,maxPayload:GABROO_REALTIME_MAX_AUDIO_FRAME_BYTES,perMessageDeflate:false,handleProtocols(protocols){return protocols.has(GABROO_REALTIME_SUBPROTOCOL)?GABROO_REALTIME_SUBPROTOCOL:false;}});
 const activeByUser=new Map<string,{socket:WebSocket;sessionId:string}>();
 const connectingUsers=new Set<string>();
 const server=app.server;
 const onUpgrade=(request:IncomingMessage,socket:Duplex,head:Buffer)=>{
  try{if(new URL(request.url??"/","http://localhost").pathname!==GABROO_REALTIME_PATH)return;}catch{rejectUpgrade(socket,400);return;}
  const parsed=parseGabrooRealtimeUpgrade(request,config.corsOrigins);
  if(!parsed.ok){rejectUpgrade(socket,parsed.status);return;}
  void (async()=>{
   let reservedUserId:string|undefined;
   try{
    const consumed=await consumeGabrooRealtimeSessionTicket(pool,parsed.ticket);
    if(!consumed){rejectUpgrade(socket,401);return;}
    if(activeByUser.has(consumed.userId)||connectingUsers.has(consumed.userId)){rejectUpgrade(socket,503);return;}
    connectingUsers.add(consumed.userId);
    reservedUserId=consumed.userId;
    const [entitlement,account]=await Promise.all([
     getActiveSubscriptionEntitlement(pool,consumed.userId),
     pool.query("SELECT id FROM users WHERE id=$1 AND status='active' AND deleted_at IS NULL AND (email_verified_at IS NOT NULL OR phone_verified_at IS NOT NULL)",[consumed.userId])
    ]);
    if(!entitlement||!account.rows[0]){connectingUsers.delete(consumed.userId);reservedUserId=undefined;rejectUpgrade(socket,403);return;}
    wss.handleUpgrade(request,socket,head,ws=>{
     connectingUsers.delete(consumed.userId);
     reservedUserId=undefined;
     activeByUser.set(consumed.userId,{socket:ws,sessionId:consumed.sessionId});
     const sessionId=consumed.sessionId;
     const connectedAt=Date.now();
     let lastActivity=connectedAt;
     let lastPong=connectedAt;
     let activeTurn:ActiveTurn|undefined;
     const pendingRecognitions=new Map<string,AbortController>();
     const send=(message:Record<string,unknown>)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({protocol_version:GABROO_REALTIME_PROTOCOL_VERSION,session_id:sessionId,...message}));};
     const failTurn=(turnId:string,code:"TURN_LIMIT"|"RATE_LIMITED"|"TRANSPORT_NOT_READY"|"RECOGNITION_FAILED",message:string)=>{
      send({type:"turn.failed",turn_id:turnId,code,message});
     };
     send({type:"session.connected"});
     const heartbeat=setInterval(()=>{
      const now=Date.now();
      if(now-connectedAt>MAX_SESSION_MS){send({type:"session.closed",reason:"timeout"});ws.close(4000,"session_timeout");return;}
      if(now-lastPong>IDLE_TIMEOUT_MS||now-lastActivity>IDLE_TIMEOUT_MS){send({type:"session.closed",reason:"timeout"});ws.close(4000,"idle_timeout");return;}
      if(ws.readyState===WebSocket.OPEN)ws.ping();
     },HEARTBEAT_MS);
     ws.on("pong",()=>{lastPong=Date.now();});
     ws.on("message",(data,isBinary)=>{
      lastActivity=Date.now();
      if(isBinary){
       if(!activeTurn?.pendingFrame){ws.close(1008,"unexpected_audio_frame");return;}
       const payload=Buffer.isBuffer(data)?data:Array.isArray(data)?Buffer.concat(data):Buffer.from(data as ArrayBuffer);
       let metadata:GabrooRealtimeAudioFrameMetadata;
       try{metadata=validateGabrooRealtimeAudioFrame(activeTurn.pendingFrame,payload);}catch{ws.close(1008,"invalid_audio_frame");return;}
       activeTurn.pendingFrame=undefined;
       const now=Date.now();
       activeTurn.frameTimes=activeTurn.frameTimes.filter(time=>now-time<1000);
       if(activeTurn.frameTimes.length>=MAX_FRAMES_PER_SECOND){failTurn(activeTurn.id,"RATE_LIMITED","Audio frames arrived too quickly. Please retry.");activeTurn=undefined;return;}
       activeTurn.frameTimes.push(now);
       activeTurn.totalBytes+=metadata.byte_length;
       if(activeTurn.totalBytes>MAX_TURN_AUDIO_BYTES){failTurn(activeTurn.id,"TURN_LIMIT","This voice turn exceeded the audio size limit.");activeTurn=undefined;return;}
       if(now-activeTurn.startedAt>MAX_TURN_MS){failTurn(activeTurn.id,"TURN_LIMIT","This voice turn exceeded the time limit.");activeTurn=undefined;return;}
       activeTurn.nextSequence+=1;
       activeTurn.chunks.push(Buffer.from(payload));
       return;
      }
      if(activeTurn?.pendingFrame){ws.close(1008,"audio_frame_payload_required");return;}
      let payload:unknown;
      try{payload=JSON.parse(data.toString());}catch{ws.close(1007,"invalid_json");return;}
      const parsedMessage=gabrooRealtimeClientMessageSchema.safeParse(payload);
      if(!parsedMessage.success||parsedMessage.data.session_id!==sessionId){ws.close(1008,"invalid_session_message");return;}
      const message=parsedMessage.data;
      if(message.type==="session.stop"){activeTurn?.controller.abort();activeTurn?.chunks.splice(0);activeTurn=undefined;for(const controller of pendingRecognitions.values())controller.abort();pendingRecognitions.clear();send({type:"session.closed",reason:"learner_stop"});ws.close(1000,"learner_stop");return;}
      if(message.type==="tutor.interrupt"){if(activeTurn?.id===message.turn_id){activeTurn.controller.abort();activeTurn.chunks.length=0;activeTurn=undefined;}pendingRecognitions.get(message.turn_id)?.abort();return;}
      if(message.type==="turn.start"){
       if(activeTurn){failTurn(message.turn_id,"TURN_LIMIT","Finish or interrupt the current voice turn first.");return;}
       if(message.audio.codec!=="pcm_s16le"||message.audio.sample_rate_hz!==16000||message.audio.channels!==1){
        failTurn(message.turn_id,"TRANSPORT_NOT_READY","Only 16 kHz mono PCM audio is currently accepted by the transport.");return;
       }
       activeTurn={id:message.turn_id,audio:message.audio,startedAt:Date.now(),nextSequence:0,totalBytes:0,frameTimes:[],chunks:[],controller:new AbortController()};
       send({type:"turn.accepted",turn_id:message.turn_id,max_turn_ms:MAX_TURN_MS});
       return;
      }
      if(message.type==="audio.frame"){
       if(!activeTurn||activeTurn.id!==message.turn_id){failTurn(message.turn_id,"TURN_LIMIT","No matching voice turn is active.");return;}
       if(activeTurn.pendingFrame||message.sequence!==activeTurn.nextSequence){ws.close(1008,"audio_sequence_or_frame_order");return;}
       if(Date.now()-activeTurn.startedAt>MAX_TURN_MS){failTurn(activeTurn.id,"TURN_LIMIT","This voice turn exceeded the time limit.");activeTurn=undefined;return;}
       activeTurn.pendingFrame=message;
       return;
      }
      if(message.type==="turn.end"){
       if(!activeTurn||activeTurn.id!==message.turn_id){failTurn(message.turn_id,"TURN_LIMIT","No matching voice turn is active.");return;}
       const completed=activeTurn;
       activeTurn=undefined;
       if(Date.now()-completed.startedAt>MAX_TURN_MS){failTurn(completed.id,"TURN_LIMIT","This voice turn exceeded the time limit.");return;}
       if(!recognitionProvider){failTurn(completed.id,"TRANSPORT_NOT_READY","Live speech recognition is not configured. Please use the recording and transcript review flow.");return;}
       void (async()=>{
        try{
         const pcm=Buffer.concat(completed.chunks,completed.totalBytes);
         const wav=pcm16MonoToWav(pcm,completed.audio.sample_rate_hz);
         const transcript=await recognizeGabrooAudio({
          audio:new Uint8Array(wav.buffer,wav.byteOffset,wav.byteLength),
          metadata:{mimeType:"audio/wav",sizeBytes:wav.byteLength,language:"ml-en"},
          consentGranted:true,
          provider:recognitionProvider,
          signal:completed.controller.signal,
          timeoutMs:30_000
         });
         if(completed.controller.signal.aborted||ws.readyState!==WebSocket.OPEN)return;
         send({type:"transcript.final",turn_id:completed.id,text:transcript.text,language_detected:transcript.languageDetected,review_required:true});
        }catch{
         if(!completed.controller.signal.aborted&&ws.readyState===WebSocket.OPEN)failTurn(completed.id,"RECOGNITION_FAILED","Gabroo could not recognise that voice turn. Please try again or use transcript review.");
        }finally{
         completed.chunks.length=0;
        }
       })();
      }
     });
     ws.once("close",()=>{clearInterval(heartbeat);activeTurn?.controller.abort();activeTurn?.chunks.splice(0);activeTurn=undefined;for(const controller of pendingRecognitions.values())controller.abort();pendingRecognitions.clear();if(activeByUser.get(consumed.userId)?.socket===ws)activeByUser.delete(consumed.userId);});
     ws.once("error",()=>{clearInterval(heartbeat);activeTurn?.controller.abort();activeTurn?.chunks.splice(0);activeTurn=undefined;for(const controller of pendingRecognitions.values())controller.abort();pendingRecognitions.clear();if(activeByUser.get(consumed.userId)?.socket===ws)activeByUser.delete(consumed.userId);});
    });
   }catch{if(reservedUserId)connectingUsers.delete(reservedUserId);rejectUpgrade(socket,503);}
  })();
 };
 server.on("upgrade",onUpgrade);
 app.addHook("onClose",async()=>{
  server.off("upgrade",onUpgrade);
  for(const entry of activeByUser.values()){
   const ws=entry.socket;
   if(ws.readyState===WebSocket.OPEN){ws.send(JSON.stringify({protocol_version:GABROO_REALTIME_PROTOCOL_VERSION,session_id:entry.sessionId,type:"session.closed",reason:"server_shutdown"}));ws.close(1012,"server_shutdown");}
  }
  activeByUser.clear();
  await new Promise<void>(resolve=>wss.close(()=>resolve()));
 });
}
