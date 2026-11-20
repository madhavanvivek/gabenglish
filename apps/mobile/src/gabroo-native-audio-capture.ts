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

 const report=(error:unknown)=>{
  const normalized=error instanceof Error?error:new Error("Gabroo microphone capture failed.");
  options.onError?.(normalized);
 };

 const onBuffer=(buffer:{data:ArrayBuffer;encoding:"float32"|"int16";sampleRate:number;channels:number})=>{
  if(!active||!options.isForeground())return;
  void options.sender.enqueue(buffer).catch(error=>{
   report(error);
   void stop("audio_sender_failure");
  });
 };

 const stop=async(reason="learner_stop")=>{
  generation+=1;
  active=false;
  starting=false;
  options.sender.close(reason);
  if(stream){
   const current=stream;
   stream=undefined;
   try{await current.stop();}catch(error){report(error);}
  }
 };

 return {
  attachStream(next:GabrooNativeAudioStream){
   if(active||starting)throw new Error("Stop Gabroo capture before replacing its native stream.");
   stream=next;
  },
  onBuffer,
  async start(input:{consentGranted:true}){
   if(input.consentGranted!==true)throw new Error("Explicit learner consent is required before microphone capture.");
   if(active||starting)throw new Error("Gabroo microphone capture is already active.");
   if(!options.isForeground())throw new Error("Gabroo voice capture is available only while the tutor screen is active.");
   if(!stream)throw new Error("Gabroo native audio stream is not attached.");
   starting=true;
   const operation=++generation;
   try{
    const granted=await options.requestPermission();
    if(!granted)throw new Error("Microphone permission was not granted.");
    if(operation!==generation||!options.isForeground())throw new Error("Gabroo capture was cancelled before microphone start.");
    await stream.start();
    if(operation!==generation||!options.isForeground()){
     await stream.stop();
     throw new Error("Gabroo capture was cancelled while starting.");
    }
    if(!Number.isFinite(stream.sampleRate)||stream.sampleRate<8_000||!Number.isSafeInteger(stream.channels)||stream.channels<1||stream.channels>2){
     await stream.stop();
     throw new Error("The device returned an unsupported microphone format.");
    }
    active=true;
    starting=false;
    return {sampleRate:stream.sampleRate,channels:stream.channels};
   }catch(error){
    starting=false;
    active=false;
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
