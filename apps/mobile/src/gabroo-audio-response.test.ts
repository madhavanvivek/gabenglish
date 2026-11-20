import {describe,expect,it} from "vitest";
import {readGabrooAudioBytes,validateGabrooAudioBytes,validateGabrooAudioHeaders} from "./gabroo-audio-response";

describe("Gabroo audio response validation",()=>{
 it("accepts MP3 content type with optional charset and known length",()=>{
  expect(()=>validateGabrooAudioHeaders("audio/mpeg; charset=binary","2048")).not.toThrow();
 });
 it("rejects unexpected or missing content types",()=>{
  expect(()=>validateGabrooAudioHeaders("application/json","10")).toThrow(/unsupported audio format/i);
  expect(()=>validateGabrooAudioHeaders(null,null)).toThrow(/unsupported audio format/i);
 });
 it("rejects invalid and oversized declared lengths before reading audio",()=>{
  expect(()=>validateGabrooAudioHeaders("audio/mpeg","-1")).toThrow(/invalid audio length/i);
  expect(()=>validateGabrooAudioHeaders("audio/mpeg","12mb")).toThrow(/invalid audio length/i);
  expect(()=>validateGabrooAudioHeaders("audio/mpeg",String(12*1024*1024+1))).toThrow(/exceeded/i);
 });
 it("rejects empty or oversized audio bodies",()=>{
  expect(()=>validateGabrooAudioBytes(new Uint8Array())).toThrow(/invalid audio response/i);
  expect(()=>validateGabrooAudioBytes(new Uint8Array(12*1024*1024+1))).toThrow(/invalid audio response/i);
 });
 it("accepts a non-empty audio body within the size limit",()=>{
  expect(()=>validateGabrooAudioBytes(new Uint8Array([0x49,0x44,0x33]))).not.toThrow();
 });
 it("reads a valid streamed MP3 response and joins chunks in order",async()=>{
  const response=new Response(new ReadableStream<Uint8Array>({
   start(controller){
    controller.enqueue(new Uint8Array([0x49,0x44]));
    controller.enqueue(new Uint8Array([0x33,0x04]));
    controller.close();
   }
  }),{headers:{"content-type":"audio/mpeg"}});
  await expect(readGabrooAudioBytes(response)).resolves.toEqual(new Uint8Array([0x49,0x44,0x33,0x04]));
 });
 it("rejects an oversized streamed response before buffering the full body",async()=>{
  const chunk=new Uint8Array(7*1024*1024);
  const response=new Response(new ReadableStream<Uint8Array>({
   start(controller){
    controller.enqueue(chunk);
    controller.enqueue(chunk);
   }
  }),{headers:{"content-type":"audio/mpeg"}});
  await expect(readGabrooAudioBytes(response)).rejects.toThrow(/exceeded/i);
 });

 it("cancels an in-flight mobile audio reader when playback is interrupted",async()=>{
  const controller=new AbortController();
  let streamCancelled=false;
  const response=new Response(new ReadableStream<Uint8Array>({
   pull(stream){
    controller.abort();
    stream.enqueue(new Uint8Array([0x49,0x44,0x33]));
   },
   cancel(){streamCancelled=true;}
  }),{headers:{"content-type":"audio/mpeg"}});
  await expect(readGabrooAudioBytes(response,controller.signal)).rejects.toThrow(/cancelled/i);
  expect(streamCancelled).toBe(true);
 });
 it("rejects a pre-aborted mobile audio read before consuming the response",async()=>{
  const controller=new AbortController();
  controller.abort();
  let streamCancelled=false;
  const response=new Response(new ReadableStream<Uint8Array>({
   cancel(){streamCancelled=true;}
  }),{headers:{"content-type":"audio/mpeg"}});
  await expect(readGabrooAudioBytes(response,controller.signal)).rejects.toThrow(/cancelled/i);
  expect(streamCancelled).toBe(true);
 });

 it("discards bytes when a non-streaming response finishes after cancellation",async()=>{
  const controller=new AbortController();
  let finishRead!:(value:ArrayBuffer)=>void;
  const response={
   headers:new Headers({"content-type":"audio/mpeg"}),
   body:null,
   arrayBuffer:()=>new Promise<ArrayBuffer>(resolve=>{finishRead=resolve;})
  };
  const pending=readGabrooAudioBytes(response,controller.signal);
  controller.abort();
  finishRead(new Uint8Array([0x49,0x44,0x33]).buffer);
  await expect(pending).rejects.toThrow(/cancelled/i);
 });

});
