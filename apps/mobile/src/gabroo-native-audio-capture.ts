import type {GabrooNativeAudioBuffer} from "./gabroo-pcm";

export type GabrooNativeAudioStream={
 start:()=>Promise<void>;
 stop:()=>void|Promise<void>;
 sampleRate:number;
 channels:number;
 isStreaming:boolean;
};

export type GabrooCaptureSender={
 enqueue:(buffer:GabrooNativeAudioBuffer)=>Promise<void>;
 close:(reason?:string)=>void;
 finish?:()=>Promise<void>;
};

export type GabrooNativeAudioCaptureOptions={
 requestPermission:()=>Promise<boolean>;
 sender:GabrooCaptureSender;
 isForeground:()=>boolean;
 onError?:(error:Error)=>void;
};

/**
 * Foreground-only lifecycle boundary for a future expo-audio AudioStream hook.
 * The React component owns the SDK hook; this controller owns consent,
 * permission, stream start/stop and sender failure handling.
 */
export function createGabrooNativeAudioCaptureController(options:GabrooNativeAudioCaptureOptions){
 let stream:GabrooNativeAudioStream|undefined;
 let active=false;
 let starting=false;
 let generation=0;
 let terminal=false;

 const report=(error:unknown)=>{
  const normalized=error instanceof Error?error:new Error("Gabroo microphone capture failed.");
  options.onError?.(normalized);
 };

 const onBuffer=(buffer:{data:ArrayBuffer;encoding:"float32"|"int16";sampleRate:number;channels:number})=>{
  if(!active||!options.isForeground())return;
  void options.sender.enqueue(buffer).catch(error=>{
   if(!active)return;
   report(error);
   void stop("audio_sender_failure");
  });
 };

 const stop=async(reason="learner_stop")=>{
  generation+=1;
  terminal=true;
  active=false;
  // Do not call native stop while permission or native start is pending.
  // The start() catch path owns cleanup after the awaited operation settles.
  if(starting){options.sender.close(reason);return;}
  if(stream){
   const current=stream;
   stream=undefined;
   try{await current.stop();}catch(error){report(error);}
  }
  // Stop capture first, then drain every already-accepted audio frame before
  // the coordinator sends turn.end. Failure falls back to immediate close.
  try{
   if(options.sender.finish)await options.sender.finish();
   else options.sender.close(reason);
  }catch(error){
   options.sender.close("audio_sender_drain_failed");
   report(error);
  }
 };

 return {
  attachStream(next:GabrooNativeAudioStream){
   if(terminal)throw new Error("Create a new Gabroo capture controller before attaching another native stream.");
   if(active||starting)throw new Error("Stop Gabroo capture before replacing its native stream.");
   stream=next;
  },
  onBuffer,
  async start(input:{consentGranted:true}){
   if(input.consentGranted!==true)throw new Error("Explicit learner consent is required before microphone capture.");
   if(terminal)throw new Error("Create a new Gabroo capture controller for the next voice turn.");
   if(active||starting)throw new Error("Gabroo microphone capture is already active.");
   if(!options.isForeground())throw new Error("Gabroo voice capture is available only while the tutor screen is active.");
   const currentStream=stream;
   if(!currentStream)throw new Error("Gabroo native audio stream is not attached.");
   starting=true;
   const operation=++generation;
   let nativeStartAttempted=false;
   try{
    const granted=await options.requestPermission();
    if(!granted)throw new Error("Microphone permission was not granted.");
    if(operation!==generation||!options.isForeground())throw new Error("Gabroo capture was cancelled before microphone start.");
    nativeStartAttempted=true;
    await currentStream.start();
    if(operation!==generation||!options.isForeground()){
     // The catch path stops the stream after a pending native start resolves.
     throw new Error("Gabroo capture was cancelled while starting.");
    }
    if(!Number.isFinite(currentStream.sampleRate)||currentStream.sampleRate<8_000||!Number.isSafeInteger(currentStream.channels)||currentStream.channels<1||currentStream.channels>2){
     throw new Error("The device returned an unsupported microphone format.");
    }
    active=true;
    starting=false;
    return {sampleRate:currentStream.sampleRate,channels:currentStream.channels};
   }catch(error){
    if(nativeStartAttempted){
     try{await currentStream.stop();}catch(stopError){report(stopError);}
    }
    starting=false;
    active=false;
    terminal=true;
    options.sender.close("capture_start_failed");
    report(error);
    throw error;
   }
  },
  stop,
  get isActive(){return active;},
  get isStarting(){return starting;}
 };
}
