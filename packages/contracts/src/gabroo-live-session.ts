import {z} from "zod";

/**
 * Provider-neutral lifecycle for a future streaming, half-duplex Gabroo voice
 * session. This contract does not open a microphone or establish a socket.
 */
export const gabrooLiveSessionStateSchema=z.enum([
 "idle","connecting","ready","listening","processing","speaking",
 "interrupted","closed","error"
]);
export type GabrooLiveSessionState=z.infer<typeof gabrooLiveSessionStateSchema>;

export type GabrooLiveSessionEvent=
 |{type:"connect";consentGranted:boolean}
 |{type:"connected"}
 |{type:"begin_listening"}
 |{type:"end_turn"}
 |{type:"response_ready"}
 |{type:"playback_finished"}
 |{type:"interrupt"}
 |{type:"resume"}
 |{type:"close"}
 |{type:"fail"};

const liveActiveStates:GabrooLiveSessionState[]=[
 "connecting","ready","listening","processing","speaking"
];

/**
 * Apply one validated event. Invalid transitions fail closed so an adapter
 * cannot accidentally resume capture after close, denial, or an interruption.
 */
export function transitionGabrooLiveSession(
 current:GabrooLiveSessionState,
 event:GabrooLiveSessionEvent
):GabrooLiveSessionState{
 if(event.type==="connect"&&!event.consentGranted){
  throw new Error("Explicit learner consent is required before connecting a live voice session.");
 }
 if(event.type==="close"){
  if(current==="closed")return "closed";
  return "closed";
 }
 if(event.type==="interrupt"&&liveActiveStates.includes(current))return "interrupted";
 if(event.type==="fail"&&liveActiveStates.includes(current))return "error";
 const allowed:Record<GabrooLiveSessionEvent["type"],GabrooLiveSessionState[]> ={
  connect:["idle"],
  connected:["connecting"],
  begin_listening:["ready"],
  end_turn:["listening"],
  response_ready:["processing"],
  playback_finished:["speaking"],
  interrupt:liveActiveStates,
  resume:["interrupted"],
  close:["idle","connecting","ready","listening","processing","speaking","interrupted","error"],
  fail:liveActiveStates
 };
 const next:Record<GabrooLiveSessionEvent["type"],GabrooLiveSessionState>={
  connect:"connecting",
  connected:"ready",
  begin_listening:"listening",
  end_turn:"processing",
  response_ready:"speaking",
  playback_finished:"ready",
  interrupt:"interrupted",
  resume:"connecting",
  close:"closed",
  fail:"error"
 };
 if(!allowed[event.type].includes(current)){
  throw new Error(`Invalid Gabroo live session transition: ${current} -> ${event.type}.`);
 }
 return next[event.type];
}
