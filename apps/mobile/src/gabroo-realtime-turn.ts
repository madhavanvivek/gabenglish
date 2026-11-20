import type {GabrooRealtimeAudioFormat} from "@gabenglish/contracts";
import type {GabrooCaptureSender} from "./gabroo-native-audio-capture";

export type GabrooRealtimeCapturePort={
 start:(input:{consentGranted:true})=>Promise<{sampleRate:number;channels:number}>;
 stop:()=>Promise<{drained:boolean}>;
};

export type GabrooRealtimeTurnConnection={
 startTurn:(turnId:string,audio:GabrooRealtimeAudioFormat)=>void;
 endTurn:(turnId:string)=>void;
 interrupt:(turnId:string)=>void;
 createAudioSender:(turnId:string)=>GabrooCaptureSender;
};

export type GabrooRealtimeTurnState="idle"|"starting"|"capturing"|"stopping";

/**
 * Coordinates the already-tested WebSocket sender and native capture boundary.
 * The caller supplies a capture controller wired to the provided sender and
 * attaches the SDK-specific native stream before start() is called.
 */
export function createGabrooRealtimeTurnCoordinator(input:{
 connection:GabrooRealtimeTurnConnection;
 createCapture:(sender:GabrooCaptureSender)=>GabrooRealtimeCapturePort;
 onError?:(error:Error)=>void;
}){
 let state:GabrooRealtimeTurnState="idle";
 let activeTurnId:string|undefined;
 let capture:GabrooRealtimeCapturePort|undefined;
 let sender:GabrooCaptureSender|undefined;
 let generation=0;

 const report=(error:unknown)=>{
  input.onError?.(error instanceof Error?error:new Error("Gabroo voice turn failed."));
 };

 const start=async(turnId:string,audio:GabrooRealtimeAudioFormat)=>{
  if(state!=="idle")throw new Error("Finish the current Gabroo voice turn before starting another.");
  if(!turnId.trim())throw new Error("A Gabroo voice turn ID is required.");
  state="starting";
  activeTurnId=turnId;
  const operation=++generation;
  let currentSender:GabrooCaptureSender|undefined;
  let currentCapture:GabrooRealtimeCapturePort|undefined;
  try{
   currentSender=input.connection.createAudioSender(turnId);
   currentCapture=input.createCapture(currentSender);
   sender=currentSender;
   capture=currentCapture;
   input.connection.startTurn(turnId,audio);
   await currentCapture.start({consentGranted:true});
   if(operation!==generation)throw new Error("Gabroo voice turn was interrupted while starting.");
   state="capturing";
  }catch(error){
   currentSender?.close("capture_start_failed");
   try{input.connection.interrupt(turnId);}catch{}
   if(operation===generation){capture=undefined;sender=undefined;activeTurnId=undefined;state="idle";}
   report(error);
   throw error;
  }
 };

 const stop=async()=>{
  if(state!=="capturing"||!activeTurnId||!capture||!sender)throw new Error("No active Gabroo microphone turn can be stopped.");
  state="stopping";
  const operation=generation;
  const turnId=activeTurnId;
  const currentCapture=capture;
  try{
   const result=await currentCapture.stop();
   if(operation!==generation)return {completed:false as const,reason:"interrupted" as const};
   if(!result.drained){
    try{input.connection.interrupt(turnId);}catch{}
    return {completed:false as const,reason:"audio_drain_failed" as const};
   }
   input.connection.endTurn(turnId);
   return {completed:true as const,reason:"audio_drained" as const};
  }catch(error){
   try{sender.close("capture_stop_failed");}catch{}
   try{input.connection.interrupt(turnId);}catch{}
   report(error);
   return {completed:false as const,reason:"capture_stop_failed" as const};
  }finally{
   if(operation===generation||(activeTurnId===turnId&&state==="stopping")){capture=undefined;sender=undefined;activeTurnId=undefined;state="idle";}
  }
 };

 const interrupt=async()=>{
  if(!activeTurnId)return;
  const turnId=activeTurnId;
  const operation=++generation;
  if(state==="stopping"){
   try{input.connection.interrupt(turnId);}catch(error){report(error);}
   return;
  }
  const currentCapture=capture;
  const currentSender=sender;
  state="stopping";
  try{input.connection.interrupt(turnId);}catch(error){report(error);}
  try{await currentCapture?.stop();}catch(error){report(error);}
  currentSender?.close("learner_interrupt");
  if(operation===generation){
   capture=undefined;sender=undefined;activeTurnId=undefined;state="idle";
  }
 };

 return {
  start,stop,interrupt,
  get state(){return state;},
  get activeTurnId(){return activeTurnId;}
 };
}
