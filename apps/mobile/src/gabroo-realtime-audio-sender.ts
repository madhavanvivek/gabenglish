import {chunkGabrooPcm16,normalizeGabrooPcm16Mono,type GabrooNativeAudioBuffer} from "./gabroo-pcm";

export const GABROO_AUDIO_QUEUE_MAX_BYTES=256*1024;
export const GABROO_SOCKET_HIGH_WATER_BYTES=128*1024;
export const GABROO_SOCKET_LOW_WATER_BYTES=32*1024;

export type GabrooRealtimeAudioSenderOptions={
 sendFrame:(sequence:number,payload:Uint8Array)=>void;
 getBufferedAmount:()=>number;
 isOpen:()=>boolean;
 maxQueuedBytes?:number;
 highWaterBytes?:number;
 lowWaterBytes?:number;
 drainTimeoutMs?:number;
};

/**
 * Converts native PCM callbacks into ordered WebSocket frames.
 * A bounded queue and single pump prevent unbounded memory growth when
 * the network cannot keep up with microphone input.
 */
export function createGabrooRealtimeAudioSender(options:GabrooRealtimeAudioSenderOptions){
 const maxQueuedBytes=options.maxQueuedBytes??GABROO_AUDIO_QUEUE_MAX_BYTES;
 const highWaterBytes=options.highWaterBytes??GABROO_SOCKET_HIGH_WATER_BYTES;
 const lowWaterBytes=options.lowWaterBytes??GABROO_SOCKET_LOW_WATER_BYTES;
 const drainTimeoutMs=options.drainTimeoutMs??5_000;
 if(!Number.isSafeInteger(maxQueuedBytes)||maxQueuedBytes<2)throw new Error("Audio queue limit must be at least one PCM sample.");
 if(!Number.isSafeInteger(highWaterBytes)||highWaterBytes<1||lowWaterBytes<0||lowWaterBytes>=highWaterBytes)throw new Error("WebSocket backpressure thresholds are invalid.");

 let queue:Uint8Array[]=[];
 let queuedBytes=0;
 let sequence=0;
 let closed=false;
 let pumping:Promise<void>|undefined;
 let failure:Error|undefined;

 const wait=()=>new Promise<void>(resolve=>setTimeout(resolve,20));
 const pump=async()=>{
  const started=Date.now();
  while(queue.length){
   if(closed)throw failure??new Error("Gabroo audio sender is closed.");
   if(!options.isOpen())throw new Error("Gabroo realtime connection is not open.");
   if(options.getBufferedAmount()>highWaterBytes){
    if(Date.now()-started>drainTimeoutMs)throw new Error("Gabroo audio transport is congested; microphone capture must stop.");
    await wait();
    if(options.getBufferedAmount()>lowWaterBytes)continue;
   }
   const frame=queue.shift()!;
   queuedBytes-=frame.byteLength;
   options.sendFrame(sequence++,frame);
  }
 };

 const flush=()=>{
  if(!pumping){
   pumping=pump().catch(error=>{
    failure=error instanceof Error?error:new Error("Gabroo audio transport failed.");
    closed=true;
    queue=[];
    queuedBytes=0;
    throw failure;
   }).finally(()=>{pumping=undefined;});
  }
  return pumping;
 };

 return {
  enqueue(buffer:GabrooNativeAudioBuffer):Promise<void>{
   if(closed)return Promise.reject(failure??new Error("Gabroo audio sender is closed."));
   let frames:Uint8Array[];
   try{frames=chunkGabrooPcm16(normalizeGabrooPcm16Mono(buffer));}
   catch(error){return Promise.reject(error);}
   const incomingBytes=frames.reduce((total,frame)=>total+frame.byteLength,0);
   if(queuedBytes+incomingBytes>maxQueuedBytes){
    const error=new Error("Gabroo audio queue is full; stop capture instead of dropping microphone audio.");
    failure=error;closed=true;queue=[];queuedBytes=0;
    return Promise.reject(error);
   }
   queue.push(...frames);
   queuedBytes+=incomingBytes;
   return flush();
  },
  close(reason="learner_stop"){
   closed=true;
   queue=[];
   queuedBytes=0;
   failure=failure??new Error("Gabroo audio sender closed: "+reason);
  },
  get queuedBytes(){return queuedBytes;},
  get nextSequence(){return sequence;},
  get isClosed(){return closed;}
 };
}
