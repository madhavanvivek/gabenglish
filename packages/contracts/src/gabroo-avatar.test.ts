import {describe,expect,it} from "vitest";
import {
 gabrooSpeechTimelineSchema,
 sampleGabrooAvatarFrame
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

 it("rejects invalid fade and playback values",()=>{
  expect(()=>sampleGabrooAvatarFrame(timeline(),100,Number.NaN)).toThrow();
  expect(()=>sampleGabrooAvatarFrame(timeline(),Number.POSITIVE_INFINITY)).toThrow();
 });
});
