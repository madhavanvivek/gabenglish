import {describe,expect,it} from "vitest";
import {
 gabrooSpeechTimelineSchema,
 gabrooVisemeEventSchema,
 sampleGabrooAvatarFrame,
 sampleGabrooAvatarFrameFromPlaybackStatus
} from "./gabroo-avatar.js";

const timeline=()=>gabrooSpeechTimelineSchema.parse({
 audio_id:"sample-audio-1",
 duration_ms:1000,
 visemes:[
  {start_ms:100,end_ms:300,shape:"closed_lips"},
  {start_ms:300,end_ms:520,shape:"open_wide"}
 ],
 expressions:[{start_ms:0,end_ms:600,expression:"warm_smile",weight:0.8}],
 gestures:[{start_ms:0,end_ms:250,gesture:"small_wave"}]
});

describe("Gabroo canonical avatar animation contract",()=>{
 it("validates provider-neutral audio-timed rig events",()=>{
  expect(timeline().audio_id).toBe("sample-audio-1");
 });

 it("rejects events that extend beyond the spoken audio",()=>{
  expect(gabrooSpeechTimelineSchema.safeParse({
   audio_id:"short-audio",
   duration_ms:500,
   visemes:[{start_ms:400,end_ms:700,shape:"open_wide"}]
  }).success).toBe(false);
 });

 it("uses the closed-lips control during an M/B/P event",()=>{
  const frame=sampleGabrooAvatarFrame(timeline(),180,0);
  expect(frame.viseme).toEqual({shape:"closed_lips",weight:1});
 });

 it("blends viseme activation at the edges instead of snapping",()=>{
  const frame=sampleGabrooAvatarFrame(timeline(),110,40);
  expect(frame.viseme.shape).toBe("closed_lips");
  expect(frame.viseme.weight).toBeGreaterThan(0);
  expect(frame.viseme.weight).toBeLessThan(1);
 });

 it("returns a neutral mouth during silence",()=>{
  const frame=sampleGabrooAvatarFrame(timeline(),800);
  expect(frame.viseme).toEqual({shape:"neutral",weight:0});
 });

 it("samples context expression and gesture independently from mouth timing",()=>{
  const frame=sampleGabrooAvatarFrame(timeline(),100,0);
  expect(frame.expression).toBe("warm_smile");
  expect(frame.expressionWeight).toBe(0.8);
  expect(frame.gesture).toBe("small_wave");
 });

 it("selects the strongest overlapping cue deterministically",()=>{
  const data=gabrooSpeechTimelineSchema.parse({
   audio_id:"overlap",
   duration_ms:500,
   visemes:[
    {start_ms:0,end_ms:400,shape:"open_mid",weight:0.4},
    {start_ms:100,end_ms:350,shape:"open_round",weight:0.9}
   ]
  });
  expect(sampleGabrooAvatarFrame(data,200,0).viseme.shape).toBe("open_round");
 });

 it("rejects zero-length and reversed viseme events",()=>{
  expect(gabrooVisemeEventSchema.safeParse({
   start_ms:200,end_ms:200,shape:"open_wide"
  }).success).toBe(false);
  expect(gabrooVisemeEventSchema.safeParse({
   start_ms:300,end_ms:200,shape:"open_wide"
  }).success).toBe(false);
 });

 it("rejects negative event times and weights outside the rig range",()=>{
  expect(gabrooVisemeEventSchema.safeParse({
   start_ms:-1,end_ms:200,shape:"open_wide"
  }).success).toBe(false);
  expect(gabrooVisemeEventSchema.safeParse({
   start_ms:0,end_ms:200,shape:"open_wide",weight:1.1
  }).success).toBe(false);
 });

 it("rejects expression and gesture events beyond the audio duration",()=>{
  expect(gabrooSpeechTimelineSchema.safeParse({
   audio_id:"invalid-expression",duration_ms:200,
   expressions:[{start_ms:10,end_ms:201,expression:"warm_smile"}]
  }).success).toBe(false);
  expect(gabrooSpeechTimelineSchema.safeParse({
   audio_id:"invalid-gesture",duration_ms:200,
   gestures:[{start_ms:10,end_ms:201,gesture:"gentle_nod"}]
  }).success).toBe(false);
 });

 it("clamps playback outside the audio range to neutral mouth controls",()=>{
  expect(sampleGabrooAvatarFrame(timeline(),-50).viseme)
   .toEqual({shape:"neutral",weight:0});
  expect(sampleGabrooAvatarFrame(timeline(),1200).viseme)
   .toEqual({shape:"neutral",weight:0});
 });

 it("samples visemes from the native audio player's actual position",()=>{
  const data=timeline();
  const frame=sampleGabrooAvatarFrameFromPlaybackStatus(data,{positionMillis:180,isPlaying:true},0);
  expect(frame.viseme).toEqual({shape:"closed_lips",weight:1});
  const next=sampleGabrooAvatarFrameFromPlaybackStatus(data,{positionMillis:400,isPlaying:true},0);
  expect(next.viseme).toEqual({shape:"open_wide",weight:1});
 });

 it("returns a fully neutral avatar frame whenever native audio is not playing",()=>{
  const frame=sampleGabrooAvatarFrameFromPlaybackStatus(timeline(),{positionMillis:180,isPlaying:false});
  expect(frame).toEqual({
   viseme:{shape:"neutral",weight:0},
   expression:"neutral",
   expressionWeight:0,
   gesture:null,
   gestureWeight:0
  });
 });

 it("rejects invalid native playback status rather than inventing timing",()=>{
  expect(()=>sampleGabrooAvatarFrameFromPlaybackStatus(timeline(),{positionMillis:-1,isPlaying:true})).toThrow(/position/i);
  expect(()=>sampleGabrooAvatarFrameFromPlaybackStatus(timeline(),{positionMillis:Number.NaN,isPlaying:true})).toThrow(/position/i);
  expect(()=>sampleGabrooAvatarFrameFromPlaybackStatus(timeline(),{positionMillis:10,isPlaying:"yes" as unknown as boolean})).toThrow(/playing state/i);
 });

 it("rejects invalid fade and playback values",()=>{
  expect(()=>sampleGabrooAvatarFrame(timeline(),100,Number.NaN)).toThrow();
  expect(()=>sampleGabrooAvatarFrame(timeline(),Number.POSITIVE_INFINITY)).toThrow();
  expect(()=>sampleGabrooAvatarFrame(timeline(),100,-1)).toThrow();
 });
});
