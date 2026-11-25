import {describe,expect,it} from "vitest";
import {sampleGabrooMobileAvatarPlayback} from "./gabroo-avatar-playback";

const audioId="a".repeat(64);
const metadata={audioId,audioSha256:audioId,textSha256:"b".repeat(64),durationMs:1000};
const timeline={audio_id:audioId,duration_ms:1000,visemes:[
 {shape:"closed_lips" as const,start_ms:0,end_ms:200,weight:1},
 {shape:"open_wide" as const,start_ms:200,end_ms:500,weight:1}
],expressions:[],gestures:[]};
const input={timeline,metadata,expectedPlaybackId:"ticket-123",playbackId:"ticket-123",isLoaded:true,isPlaying:true,positionMillis:300};

describe("Gabroo mobile avatar playback bridge",()=>{
 it("samples visemes from the real native playback clock for the matching ticket",()=>{
  const frame=sampleGabrooMobileAvatarPlayback(input);
  expect(frame.audioId).toBe(audioId);
  expect(frame.controls.viseme.shape).toBe("open_wide");
 });
 it("does not animate when native playback belongs to another ticket",()=>{
  expect(sampleGabrooMobileAvatarPlayback({...input,playbackId:"stale-ticket"}).controls.viseme.shape).toBe("neutral");
 });
 it("does not animate paused, unloaded or missing audio",()=>{
  expect(sampleGabrooMobileAvatarPlayback({...input,isPlaying:false}).controls.viseme.shape).toBe("neutral");
  expect(sampleGabrooMobileAvatarPlayback({...input,isLoaded:false}).controls.viseme.shape).toBe("neutral");
  expect(sampleGabrooMobileAvatarPlayback({...input,timeline:null}).controls.viseme.shape).toBe("neutral");
 });
 it("fails closed when measured audio metadata is malformed or not content-addressed",()=>{
  expect(sampleGabrooMobileAvatarPlayback({...input,metadata:{...metadata,audioSha256:"c".repeat(64)}}).controls.viseme.shape).toBe("neutral");
  expect(sampleGabrooMobileAvatarPlayback({...input,metadata:{...metadata,textSha256:"invalid"}}).controls.viseme.shape).toBe("neutral");
  expect(sampleGabrooMobileAvatarPlayback({...input,metadata:{...metadata,durationMs:0}}).controls.viseme.shape).toBe("neutral");
 });
 it("requires a non-empty active native playback ticket",()=>{
  expect(sampleGabrooMobileAvatarPlayback({...input,expectedPlaybackId:""}).controls.viseme.shape).toBe("neutral");
  expect(sampleGabrooMobileAvatarPlayback({...input,playbackId:null}).controls.viseme.shape).toBe("neutral");
 });
 it("fails closed for invalid or completed native playback clocks",()=>{
  expect(sampleGabrooMobileAvatarPlayback({...input,positionMillis:-1}).controls.viseme.shape).toBe("neutral");
  expect(sampleGabrooMobileAvatarPlayback({...input,positionMillis:Number.NaN}).controls.viseme.shape).toBe("neutral");
  expect(sampleGabrooMobileAvatarPlayback({...input,positionMillis:1000}).controls.viseme.shape).toBe("neutral");
  expect(sampleGabrooMobileAvatarPlayback({...input,isLoaded:false}).controls.viseme.shape).toBe("neutral");
  expect(sampleGabrooMobileAvatarPlayback({...input,isPlaying:false}).controls.viseme.shape).toBe("neutral");
 });
 it("rejects malformed runtime timeline events without throwing",()=>{
  const malformed={...timeline,visemes:[{shape:"not-a-viseme",start_ms:0,end_ms:200,weight:1}]};
  expect(sampleGabrooMobileAvatarPlayback({...input,timeline:malformed as never}).controls.viseme.shape).toBe("neutral");
  const outOfBounds={...timeline,visemes:[{shape:"open_wide" as const,start_ms:900,end_ms:1100,weight:1}]};
  expect(sampleGabrooMobileAvatarPlayback({...input,timeline:outOfBounds as never}).controls.viseme.shape).toBe("neutral");
 });
 it("does not share a mutable neutral frame between stale playback samples",()=>{
  const first=sampleGabrooMobileAvatarPlayback({...input,playbackId:"stale"});
  first.controls.viseme.weight=0.8;
  const second=sampleGabrooMobileAvatarPlayback({...input,playbackId:"stale"});
  expect(second.controls.viseme.weight).toBe(0);
 });
 it("does not animate when the timeline belongs to different measured audio",()=>{
  expect(sampleGabrooMobileAvatarPlayback({...input,timeline:{...timeline,audio_id:"c".repeat(64)}}).controls.viseme.shape).toBe("neutral");
  expect(sampleGabrooMobileAvatarPlayback({...input,timeline:{...timeline,duration_ms:998}}).controls.viseme.shape).toBe("neutral");
 });
});
