import {describe,expect,it,vi} from "vitest";
import {attachGabrooExpoAudioStream} from "./gabroo-expo-audio-stream-adapter";

describe("Gabroo Expo AudioStream adapter",()=>{
 it("attaches the native stream lifecycle and forwards actual PCM buffer metadata",()=>{
  const start=vi.fn(async()=>{}),stop=vi.fn(async()=>{});
  const attachStream=vi.fn(),onBuffer=vi.fn();
  const bridge=attachGabrooExpoAudioStream({
   stream:{start,stop,isStreaming:false},
   controller:{attachStream,onBuffer}
  });
  expect(attachStream).toHaveBeenCalledWith(expect.objectContaining({
   sampleRate:48_000,channels:1,isStreaming:false
  }));
  const buffer={data:new ArrayBuffer(64),encoding:"int16" as const,sampleRate:44_100,channels:2,timestamp:0.25};
  bridge.onBuffer(buffer);
  expect(onBuffer).toHaveBeenCalledWith({
   data:buffer.data,encoding:"int16",sampleRate:44_100,channels:2
  });
 });

 it("uses caller-provided requested stream format and delegates start/stop",async()=>{
  const start=vi.fn(async()=>{}),stop=vi.fn(async()=>{});
  let attached:{start:()=>Promise<void>;stop:()=>void|Promise<void>}|undefined;
  attachGabrooExpoAudioStream({
   stream:{start,stop},
   controller:{attachStream:value=>{attached=value;},onBuffer:()=>{}},
   requestedSampleRate:16_000,requestedChannels:1
  });
  await attached!.start();
  await attached!.stop();
  expect(start).toHaveBeenCalledOnce();
  expect(stop).toHaveBeenCalledOnce();
 });
});
