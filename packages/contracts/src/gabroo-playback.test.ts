import {describe,expect,it} from "vitest";
import {
 initialGabrooPlaybackState,
 reduceGabrooPlayback
} from "./gabroo-playback.js";

describe("Gabroo provider-neutral playback lifecycle",()=>{
 it("tracks ordered segments and finishes the current playback",()=>{
  const started=reduceGabrooPlayback(initialGabrooPlaybackState,{type:"started",playback_id:"play-1"});
  const one=reduceGabrooPlayback(started,{type:"segment_completed",playback_id:"play-1"});
  const two=reduceGabrooPlayback(one,{type:"segment_completed",playback_id:"play-1"});
  expect(two.completed_segments).toBe(2);
  expect(reduceGabrooPlayback(two,{type:"finished",playback_id:"play-1"})).toEqual({
   phase:"idle",playback_id:null,completed_segments:2,error:null
  });
 });
 it("ignores stale callbacks after a newer playback starts",()=>{
  const first=reduceGabrooPlayback(initialGabrooPlaybackState,{type:"started",playback_id:"old"});
  const interrupted=reduceGabrooPlayback(first,{type:"interrupted",playback_id:"old"});
  const second=reduceGabrooPlayback(interrupted,{type:"started",playback_id:"new"});
  expect(reduceGabrooPlayback(second,{type:"finished",playback_id:"old"})).toEqual(second);
  expect(reduceGabrooPlayback(second,{type:"segment_completed",playback_id:"old"})).toEqual(second);
 });
 it("keeps interruption terminal until a new playback begins",()=>{
  const started=reduceGabrooPlayback(initialGabrooPlaybackState,{type:"started",playback_id:"play-1"});
  const interrupted=reduceGabrooPlayback(started,{type:"interrupted",playback_id:"play-1"});
  expect(interrupted).toEqual({phase:"interrupted",playback_id:null,completed_segments:0,error:null});
 });
 it("bounds provider errors and allows a subsequent playback",()=>{
  const started=reduceGabrooPlayback(initialGabrooPlaybackState,{type:"started",playback_id:"play-1"});
  const failed=reduceGabrooPlayback(started,{type:"failed",playback_id:"play-1",reason:"x".repeat(400)});
  expect(failed.phase).toBe("failed");
  expect(failed.error).toHaveLength(300);
  expect(reduceGabrooPlayback(failed,{type:"started",playback_id:"play-2"}).phase).toBe("speaking");
 });
 it("rejects empty IDs and overlapping playback",()=>{
  expect(()=>reduceGabrooPlayback(initialGabrooPlaybackState,{type:"started",playback_id:"  "})).toThrow();
  const started=reduceGabrooPlayback(initialGabrooPlaybackState,{type:"started",playback_id:"play-1"});
  expect(()=>reduceGabrooPlayback(started,{type:"started",playback_id:"play-2"})).toThrow();
 });
 it("supports an explicit reset",()=>{
  const started=reduceGabrooPlayback(initialGabrooPlaybackState,{type:"started",playback_id:"play-1"});
  expect(reduceGabrooPlayback(started,{type:"reset"})).toEqual(initialGabrooPlaybackState);
 });
});
