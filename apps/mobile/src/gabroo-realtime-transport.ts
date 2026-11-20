import {createGabrooRealtimeAudioSender,type GabrooRealtimeAudioSenderOptions} from "./gabroo-realtime-audio-sender";
import {GABROO_REALTIME_MAX_AUDIO_FRAME_BYTES,GABROO_REALTIME_PROTOCOL_VERSION,gabrooRealtimeServerMessageSchema,type GabrooRealtimeAudioFormat,type GabrooRealtimeServerMessage} from "@gabenglish/contracts";


export const GABROO_REALTIME_CONNECT_PATH="/api/v1/gabroo/realtime/connect";

export function toGabrooRealtimeWebSocketUrl(apiBaseUrl:string){
 let url:URL;
 try{url=new URL(apiBaseUrl);}catch{throw new Error("Gabenglish API URL is invalid.");}
 if(url.protocol==="https:")url.protocol="wss:";
 else if(url.protocol==="http:")url.protocol="ws:";
 else throw new Error("Gabroo realtime voice requires an HTTP(S) API URL.");
 url.pathname=url.pathname.replace(/\/$/,"")+GABROO_REALTIME_CONNECT_PATH;
 url.search="";
 url.hash="";
 return url.toString();
}

export function createGabrooRealtimeFrame(turnId:string,sessionId:string,sequence:number,payload:Uint8Array){
 if(!turnId.trim()||!sessionId.trim())throw new Error("A session and turn ID are required.");
 if(!Number.isSafeInteger(sequence)||sequence<0)throw new Error("Audio frame sequence must be a non-negative integer.");
 if(!(payload instanceof Uint8Array)||payload.byteLength===0||payload.byteLength>GABROO_REALTIME_MAX_AUDIO_FRAME_BYTES)throw new Error("Audio frame is empty or exceeds the transport limit.");
 const metadata={protocol_version:GABROO_REALTIME_PROTOCOL_VERSION,session_id:sessionId,turn_id:turnId,type:"audio.frame" as const,sequence,byte_length:payload.byteLength};
 const bytes=payload.slice();
 return {metadata,binary:bytes.buffer as ArrayBuffer};
}

export type GabrooRealtimeSocketCallbacks={
 onOpen?:()=>void;
 onMessage?:(message:GabrooRealtimeServerMessage)=>void;
 onInvalidMessage?:()=>void;
 onError?:()=>void;
 onClose?:(code:number,reason:string)=>void;
};

export function connectGabrooRealtimeSocket(input:{
 apiBaseUrl:string;
 sessionId:string;
 connectionTicket:string;
 callbacks?:GabrooRealtimeSocketCallbacks;
}){
 if(!input.sessionId.trim()||!/^[0-9a-f]{64}$/.test(input.connectionTicket))throw new Error("A valid realtime session ticket is required.");
 const url=toGabrooRealtimeWebSocketUrl(input.apiBaseUrl);
 const socket=new WebSocket(url,["gabroo.v1","ticket."+input.connectionTicket]);
 socket.onopen=()=>{
  socket.send(JSON.stringify({protocol_version:GABROO_REALTIME_PROTOCOL_VERSION,session_id:input.sessionId,type:"session.ready"}));
  input.callbacks?.onOpen?.();
 };
 socket.onmessage=event=>{
  let payload:unknown;
  try{payload=JSON.parse(String(event.data));}catch{input.callbacks?.onInvalidMessage?.();return;}
  const parsed=gabrooRealtimeServerMessageSchema.safeParse(payload);
  if(!parsed.success||parsed.data.session_id!==input.sessionId){input.callbacks?.onInvalidMessage?.();return;}
  input.callbacks?.onMessage?.(parsed.data);
 };
 socket.onerror=()=>input.callbacks?.onError?.();
 socket.onclose=event=>input.callbacks?.onClose?.(event.code,event.reason);
 const sendControl=(message:Record<string,unknown>)=>{
  if(socket.readyState!==WebSocket.OPEN)throw new Error("Gabroo realtime connection is not open.");
  socket.send(JSON.stringify({protocol_version:GABROO_REALTIME_PROTOCOL_VERSION,session_id:input.sessionId,...message}));
 };
 return {
  socket,
  startTurn(turnId:string,audio:GabrooRealtimeAudioFormat){sendControl({type:"turn.start",turn_id:turnId,audio});},
  sendAudioFrame(turnId:string,sequence:number,payload:Uint8Array){
   const frame=createGabrooRealtimeFrame(turnId,input.sessionId,sequence,payload);
   sendControl(frame.metadata);
   if(socket.readyState!==WebSocket.OPEN)throw new Error("Gabroo realtime connection closed before the audio frame payload.");
   socket.send(frame.binary);
  },
  endTurn(turnId:string){sendControl({type:"turn.end",turn_id:turnId});},
  async finishTurn(turnId:string,sender:{finish:()=>Promise<void>}){
   if(!turnId.trim())throw new Error("A turn ID is required to finish Gabroo audio.");
   try{
    await sender.finish();
    sendControl({type:"turn.end",turn_id:turnId});
   }catch(error){
    // Do not tell the server that a turn is complete if accepted audio was lost.
    try{socket.close(1011,"audio_drain_failed");}catch{}
    throw error;
   }
  },
  interrupt(turnId:string){sendControl({type:"tutor.interrupt",turn_id:turnId});},
  stop(){sendControl({type:"session.stop"});},
  createAudioSender(turnId:string,limits?:Pick<GabrooRealtimeAudioSenderOptions,"maxQueuedBytes"|"highWaterBytes"|"lowWaterBytes"|"drainTimeoutMs">){
   if(!turnId.trim())throw new Error("A turn ID is required for audio capture.");
   return createGabrooRealtimeAudioSender({
    ...limits,
    sendFrame:(sequence,payload)=>this.sendAudioFrame(turnId,sequence,payload),
    getBufferedAmount:()=>socket.bufferedAmount,
    isOpen:()=>socket.readyState===WebSocket.OPEN
   });
  },
  close(){socket.close(1000,"learner_stop");}
 };
}

/**
 * Obtain the authenticated, consent-gated one-use ticket and resolve only after
 * the server confirms that the WebSocket session is connected. This opens no
 * microphone and deliberately leaves audio capture to a separately validated
 * native streaming adapter.
 */
export async function openGabrooRealtimeSession(input:{
 consentGranted:true;
 ticketProvider:()=>Promise<{session_id:string;connection_ticket:string}>;
 callbacks?:GabrooRealtimeSocketCallbacks;
}){
 if(input.consentGranted!==true)throw new Error("Explicit learner consent is required.");
 const configuredApiBaseUrl=process.env.EXPO_PUBLIC_API_BASE_URL?.trim()??"";
 const apiBaseUrl=configuredApiBaseUrl.endsWith("/")?configuredApiBaseUrl.slice(0,-1):configuredApiBaseUrl;
 if(!apiBaseUrl)throw new Error("The Gabenglish API is not configured.");
 const ticket=await input.ticketProvider();
 return await new Promise<ReturnType<typeof connectGabrooRealtimeSocket>>((resolve,reject)=>{
  let settled=false;
  let timeout:ReturnType<typeof setTimeout>|undefined;
  let connection:ReturnType<typeof connectGabrooRealtimeSocket>|undefined;
  const fail=(message:string)=>{
   if(settled)return;
   settled=true;
   if(timeout)clearTimeout(timeout);
   try{connection?.close();}catch{}
   reject(new Error(message));
  };
  try{
   connection=connectGabrooRealtimeSocket({
    apiBaseUrl,sessionId:ticket.session_id,connectionTicket:ticket.connection_ticket,
    callbacks:{
     onOpen:()=>input.callbacks?.onOpen?.(),
     onMessage:message=>{
      if(message.type==="session.connected"&&!settled&&connection){settled=true;if(timeout)clearTimeout(timeout);resolve(connection);}
      input.callbacks?.onMessage?.(message);
     },
     onInvalidMessage:()=>{input.callbacks?.onInvalidMessage?.();fail("Gabroo returned an invalid realtime message.");},
     onError:()=>{input.callbacks?.onError?.();fail("Could not establish the Gabroo realtime connection.");},
     onClose:(code,reason)=>{
      input.callbacks?.onClose?.(code,reason);
      if(!settled)fail("Gabroo realtime connection closed before it was ready.");
     }
    }
   });
   timeout=setTimeout(()=>fail("Gabroo realtime connection timed out. Please try again."),12_000);
  }catch(error){fail(error instanceof Error?error.message:"Could not open Gabroo realtime session.");}
 });
}
