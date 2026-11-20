import {describe,expect,it,vi} from "vitest";
import {createGabrooNativeAudioCaptureController,type GabrooNativeAudioStream} from "./gabroo-native-audio-capture";

function setup(){
 let foreground=true;
 let permission=true;
 const calls:string[]=[];
 const errors:Error[]=[];
 let buffer:(value:{data:ArrayBuffer;encoding:"float32"|"int16";sampleRate:number;channels:number})=>void=()=>{};
 const stream:GabrooNativeAudioStream={
  sampleRate:48_000,channels:1,isStreaming:false,
  start:vi.fn(async()=>{calls.push("start");stream.isStreaming=true;}),
  stop:vi.fn(async()=>{calls.push("stop");stream.isStreaming=false;})
 };
 const sender={enqueue:vi.fn(async()=>{}),finish:vi.fn(async()=>{calls.push("finish");}),close:vi.fn((reason?:string)=>calls.push("close:"+reason))};
 const controller=createGabrooNativeAudioCaptureController({
  requestPermission:vi.fn(async()=>permission),
  sender,
  isForeground:()=>foreground,
  onError:error=>errors.push(error)
 });
 controller.attachStream(stream);
 return {controller,stream,sender,calls,errors,setForeground:(v:boolean)=>foreground=v,setPermission:(v:boolean)=>permission=v,setBuffer:(v:typeof buffer)=>{buffer=v;},getBuffer:()=>buffer};
}

describe("Gabroo native capture lifecycle boundary",()=>{
 it("requires explicit consent and foreground state before permission",async()=>{
  const x=setup();
  await expect(x.controller.start({consentGranted:false as true})).rejects.toThrow(/consent/);
  x.setForeground(false);
  await expect(x.controller.start({consentGranted:true})).rejects.toThrow(/tutor screen/);
  expect(x.stream.start).not.toHaveBeenCalled();
 });

 it("requests permission and starts the attached stream only after consent",async()=>{
  const x=setup();
  await expect(x.controller.start({consentGranted:true})).resolves.toEqual({sampleRate:48_000,channels:1});
  expect(x.controller.isActive).toBe(true);
  expect(x.stream.start).toHaveBeenCalledOnce();
  await x.controller.stop();
  expect(x.stream.stop).toHaveBeenCalledOnce();
  expect(x.controller.isActive).toBe(false);
 });

 it("fails closed when microphone permission is denied",async()=>{
  const x=setup();x.setPermission(false);
  await expect(x.controller.start({consentGranted:true})).rejects.toThrow(/permission/);
  expect(x.stream.start).not.toHaveBeenCalled();
  expect(x.sender.close).toHaveBeenCalledWith("capture_start_failed");
 });

 it("ignores buffers unless capture is active and foregrounded",async()=>{
  const x=setup();
  const payload={data:new ArrayBuffer(4),encoding:"float32" as const,sampleRate:48_000,channels:1};
  x.controller.onBuffer(payload);
  expect(x.sender.enqueue).not.toHaveBeenCalled();
  await x.controller.start({consentGranted:true});
  x.controller.onBuffer(payload);
  expect(x.sender.enqueue).toHaveBeenCalledOnce();
  x.setForeground(false);
  x.controller.onBuffer(payload);
  expect(x.sender.enqueue).toHaveBeenCalledOnce();
  await x.controller.stop();
  await expect(x.controller.start({consentGranted:true})).rejects.toThrow(/new Gabroo capture controller/);
 });

 it("stops native capture before draining accepted audio frames",async()=>{
  const x=setup();
  await x.controller.start({consentGranted:true});
  await x.controller.stop();
  expect(x.calls.indexOf("stop")).toBeLessThan(x.calls.indexOf("finish"));
  expect(x.sender.finish).toHaveBeenCalledOnce();
  expect(x.sender.close).not.toHaveBeenCalled();
 });
 
 it("reports a successful drain only after native capture has stopped",async()=>{
  const x=setup();
  await x.controller.start({consentGranted:true});
  await expect(x.controller.stop()).resolves.toEqual({drained:true});
  expect(x.calls.indexOf("stop")).toBeLessThan(x.calls.indexOf("finish"));
 });

 it("reports a failed drain when accepted audio cannot be flushed",async()=>{
  const x=setup();
  x.sender.finish.mockRejectedValueOnce(new Error("drain timeout"));
  await x.controller.start({consentGranted:true});
  await expect(x.controller.stop()).resolves.toEqual({drained:false});
  expect(x.sender.close).toHaveBeenCalledWith("audio_sender_drain_failed");
  expect(x.errors.at(-1)?.message).toBe("drain timeout");
 });

 it("stops capture when sender backpressure fails",async()=>{
  const x=setup();
  x.sender.enqueue.mockRejectedValueOnce(new Error("queue full"));
  await x.controller.start({consentGranted:true});
  x.controller.onBuffer({data:new ArrayBuffer(4),encoding:"float32",sampleRate:48_000,channels:1});
  await Promise.resolve();await Promise.resolve();
  expect(x.controller.isActive).toBe(false);
  expect(x.stream.stop).toHaveBeenCalled();
  expect(x.errors).toHaveLength(1);
 });

 it("cancels a pending permission request when capture is stopped",async()=>{
  let resolvePermission!:(granted:boolean)=>void;
  const pending=new Promise<boolean>(resolve=>{resolvePermission=resolve;});
  const stream:GabrooNativeAudioStream={
   sampleRate:48_000,channels:1,isStreaming:false,
   start:vi.fn(async()=>{}),stop:vi.fn(async()=>{})
  };
  const sender={enqueue:vi.fn(async()=>{}),close:vi.fn()};
  const controller=createGabrooNativeAudioCaptureController({
   requestPermission:()=>pending,sender,isForeground:()=>true
  });
  controller.attachStream(stream);
  const request=controller.start({consentGranted:true});
  await Promise.resolve();
  await controller.stop();
  expect(controller.isStarting).toBe(true);
  expect(stream.stop).not.toHaveBeenCalled();
  resolvePermission(true);
  await expect(request).rejects.toThrow(/cancelled/);
  expect(controller.isStarting).toBe(false);
  expect(controller.isActive).toBe(false);
  expect(stream.start).not.toHaveBeenCalled();
  expect(stream.stop).not.toHaveBeenCalled();
  await expect(controller.start({consentGranted:true})).rejects.toThrow(/new Gabroo capture controller/);
 });

 it("stops and rejects a native format that becomes unsupported after start",async()=>{
  const x=setup();
  vi.mocked(x.stream.start).mockImplementationOnce(async()=>{
   x.stream.sampleRate=7_000;
   x.stream.isStreaming=true;
  });
  await expect(x.controller.start({consentGranted:true})).rejects.toThrow(/unsupported microphone format/);
  expect(x.stream.stop).toHaveBeenCalledOnce();
  expect(x.controller.isActive).toBe(false);
  expect(x.sender.close).toHaveBeenCalledWith("capture_start_failed");
 });


 it("stops a native stream that finishes starting after the learner cancels",async()=>{
  let finishStart!:()=>void;
  const startGate=new Promise<void>(resolve=>{finishStart=resolve;});
  const x=setup();
  vi.mocked(x.stream.start).mockImplementationOnce(async()=>{
   await startGate;
   x.stream.isStreaming=true;
  });
  const starting=x.controller.start({consentGranted:true});
  await Promise.resolve();
  await x.controller.stop();
  // Native stop is deferred until start settles; avoid racing two native calls.
  expect(x.stream.stop).not.toHaveBeenCalled();
  finishStart();
  await expect(starting).rejects.toThrow(/cancelled while starting/);
  expect(x.stream.stop).toHaveBeenCalledOnce();
  expect(x.controller.isActive).toBe(false);
 });


 it("stops a native stream when start rejects after partially activating it",async()=>{
  const x=setup();
  vi.mocked(x.stream.start).mockImplementationOnce(async()=>{
   x.stream.isStreaming=true;
   throw new Error("native start interrupted");
  });
  await expect(x.controller.start({consentGranted:true})).rejects.toThrow(/native start interrupted/);
  expect(x.stream.stop).toHaveBeenCalledOnce();
  expect(x.stream.isStreaming).toBe(false);
  expect(x.controller.isActive).toBe(false);
 });


 it("rejects attaching a replacement stream after the controller becomes terminal",async()=>{
  const x=setup();
  await x.controller.stop();
  const replacement:GabrooNativeAudioStream={
   sampleRate:48_000,channels:1,isStreaming:false,
   start:vi.fn(async()=>{}),stop:vi.fn(async()=>{})
  };
  expect(()=>x.controller.attachStream(replacement)).toThrow(/new Gabroo capture controller/);
 });
 
 it("requires a fresh controller after startup failure closes its sender",async()=>{
  const x=setup();
  vi.mocked(x.stream.start).mockRejectedValueOnce(new Error("native startup failed"));
  await expect(x.controller.start({consentGranted:true})).rejects.toThrow(/native startup failed/);
  await expect(x.controller.start({consentGranted:true})).rejects.toThrow(/new Gabroo capture controller/);
  expect(x.stream.start).toHaveBeenCalledOnce();
 });

});
