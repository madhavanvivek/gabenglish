import {describe,expect,it} from "vitest";
import {createGabrooAudioModeQueue} from "./gabroo-audio-mode";

function deferred<T>(){
 let resolve!:(value:T)=>void;
 let reject!:(reason?:unknown)=>void;
 const promise=new Promise<T>((res,rej)=>{resolve=res;reject=rej;});
 return {promise,resolve,reject};
}

describe("Gabroo audio mode queue",()=>{
 it("runs mode changes in FIFO order even when the first transition is delayed",async()=>{
  const queue=createGabrooAudioModeQueue();
  const first=deferred<void>();
  const events:string[]=[];
  const firstResult=queue.enqueue(async()=>{events.push("playback:start");await first.promise;events.push("playback:end");return "playback";});
  const secondResult=queue.enqueue(async()=>{events.push("recording");return "recording";});
  await Promise.resolve();
  expect(events).toEqual(["playback:start"]);
  first.resolve();
  await expect(firstResult).resolves.toBe("playback");
  await expect(secondResult).resolves.toBe("recording");
  expect(events).toEqual(["playback:start","playback:end","recording"]);
 });

 it("continues with the next transition after a previous transition rejects",async()=>{
  const queue=createGabrooAudioModeQueue();
  const failed=queue.enqueue(async()=>{throw new Error("native audio mode failed");});
  const recovered=queue.enqueue(async()=>"recording-ready");
  await expect(failed).rejects.toThrow("native audio mode failed");
  await expect(recovered).resolves.toBe("recording-ready");
 });

 it("preserves each operation result while serializing multiple transitions",async()=>{
  const queue=createGabrooAudioModeQueue();
  const events:string[]=[];
  const results=await Promise.all([
   queue.enqueue(async()=>{events.push("one");return 1;}),
   queue.enqueue(async()=>{events.push("two");return 2;}),
   queue.enqueue(async()=>{events.push("three");return 3;})
  ]);
  expect(results).toEqual([1,2,3]);
  expect(events).toEqual(["one","two","three"]);
 });
});
