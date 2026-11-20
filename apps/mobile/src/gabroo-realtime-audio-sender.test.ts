import {afterEach,describe,expect,it,vi} from "vitest";
import {createGabrooRealtimeAudioSender} from "./gabroo-realtime-audio-sender";

afterEach(()=>vi.useRealTimers());

function pcmBuffer(samples:number[]):ArrayBuffer{
 const data=new Float32Array(samples);
 return data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
}
const native=(samples:number[])=>({data:pcmBuffer(samples),encoding:"float32" as const,sampleRate:16_000,channels:1});

describe("Gabroo realtime audio sender",()=>{
 it("sends normalized PCM frames in sequence order",async()=>{
  const sent:Array<{sequence:number;bytes:number}>=[];
  const sender=createGabrooRealtimeAudioSender({
   sendFrame:(sequence,payload)=>sent.push({sequence,bytes:payload.byteLength}),
   getBufferedAmount:()=>0,isOpen:()=>true
  });
  await sender.enqueue(native(Array.from({length:3_200},(_,i)=>Math.sin(i/10))));
  expect(sent).toEqual([{sequence:0,bytes:3_200},{sequence:1,bytes:3_200}]);
  expect(sender.nextSequence).toBe(2);
  expect(sender.queuedBytes).toBe(0);
 });

 it("rejects audio when the bounded queue would overflow",async()=>{
  const sender=createGabrooRealtimeAudioSender({
   sendFrame:()=>{},getBufferedAmount:()=>1_000,isOpen:()=>true,
   maxQueuedBytes:5_000,highWaterBytes:100,lowWaterBytes:20,drainTimeoutMs:1
  });
  await expect(sender.enqueue(native(Array.from({length:2_000},()=>0)))).rejects.toThrow(/congested/);
  expect(sender.isClosed).toBe(true);
 });

 it("fails closed when the WebSocket is unavailable",async()=>{
  const sender=createGabrooRealtimeAudioSender({sendFrame:()=>{},getBufferedAmount:()=>0,isOpen:()=>false});
  await expect(sender.enqueue(native([0.1,0.2]))).rejects.toThrow(/not open/);
  expect(sender.isClosed).toBe(true);
 });

 it("finishes only after accepted frames have drained and rejects new buffers",async()=>{
  const sent:number[]=[];
  const sender=createGabrooRealtimeAudioSender({
   sendFrame:sequence=>sent.push(sequence),getBufferedAmount:()=>0,isOpen:()=>true
  });
  await sender.enqueue(native(Array.from({length:3_200},()=>0.25)));
  await sender.finish();
  expect(sent).toEqual([0,1]);
  expect(sender.isClosed).toBe(true);
  await expect(sender.enqueue(native([0.1]))).rejects.toThrow(/finished/);
 });
 
 it("waits for an in-flight backpressure pump before finishing",async()=>{
  vi.useFakeTimers();
  let bufferedAmount=200;
  const sent:number[]=[];
  const sender=createGabrooRealtimeAudioSender({
   sendFrame:sequence=>sent.push(sequence),
   getBufferedAmount:()=>bufferedAmount,
   isOpen:()=>true,
   highWaterBytes:100,lowWaterBytes:20,drainTimeoutMs:1_000
  });
  const enqueue=sender.enqueue(native(Array.from({length:1_600},()=>0.2)));
  const finish=sender.finish();
  expect(sender.isClosed).toBe(false);
  bufferedAmount=0;
  await vi.advanceTimersByTimeAsync(20);
  await enqueue;
  await finish;
  expect(sent).toEqual([0]);
  expect(sender.isClosed).toBe(true);
 });

 it("closes explicitly and rejects subsequent buffers",async()=>{
  const sender=createGabrooRealtimeAudioSender({sendFrame:()=>{},getBufferedAmount:()=>0,isOpen:()=>true});
  sender.close();
  await expect(sender.enqueue(native([0.1]))).rejects.toThrow(/closed/);
 });
});
