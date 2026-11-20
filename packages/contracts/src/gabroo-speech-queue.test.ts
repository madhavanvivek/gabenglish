import {describe,expect,it,vi} from "vitest";
import {
 playGabrooSpeechSegments,
 type GabrooSegmentPlayback,
 type GabrooSpeechSegment
} from "./gabroo-speech.js";

const segments:GabrooSpeechSegment[]=[
 {text:"Hello, ",language:"en"},
 {text:"സുഖമാണോ? ",language:"ml"},
 {text:"How are you!",language:"en"}
];

describe("Gabroo sequential speech queue",()=>{
 it("awaits every segment in order and applies one saved rate",async()=>{
  const played:string[]=[];
  const playback:GabrooSegmentPlayback={speak:async(segment,rate)=>{
   played.push(segment.language+":"+segment.text+":"+rate);
  }};
  await expect(playGabrooSpeechSegments(segments,playback,0.9)).resolves.toBe(3);
  expect(played).toEqual([
   "en:Hello, :0.9",
   "ml:സുഖമാണോ? :0.9",
   "en:How are you!:0.9"
  ]);
 });
 it("does not count a segment interrupted before its playback promise resolves",async()=>{
  const played:string[]=[];
  let stopped=false;
  const playback:GabrooSegmentPlayback={speak:async(segment)=>{
   played.push(segment.text);
   if(played.length===1)stopped=true;
  }};
  await expect(playGabrooSpeechSegments(segments,playback,1,()=>stopped)).resolves.toBe(0);
  expect(played).toEqual(["Hello, "]);
 });
 it("returns only fully completed segments when cancellation occurs during the next segment",async()=>{
  const played:string[]=[];
  let stopped=false;
  const playback:GabrooSegmentPlayback={speak:async(segment)=>{
   played.push(segment.text);
   if(played.length===2)stopped=true;
  }};
  await expect(playGabrooSpeechSegments(segments,playback,1,()=>stopped)).resolves.toBe(1);
  expect(played).toEqual(["Hello, ","സുഖമാണോ? "]);
 });
 it("does not start playback for an already cancelled queue",async()=>{
  const speak=vi.fn(async()=>undefined);
  await expect(playGabrooSpeechSegments(segments,{speak},1,()=>true)).resolves.toBe(0);
  expect(speak).not.toHaveBeenCalled();
 });
 it("rejects invalid speed before starting any segment",async()=>{
  const speak=vi.fn(async()=>undefined);
  await expect(playGabrooSpeechSegments(segments,{speak},1.03)).rejects.toThrow();
  expect(speak).not.toHaveBeenCalled();
 });
 it("returns zero for an empty reply",async()=>{
  const speak=vi.fn(async()=>undefined);
  await expect(playGabrooSpeechSegments([],{speak},1)).resolves.toBe(0);
 });
});
