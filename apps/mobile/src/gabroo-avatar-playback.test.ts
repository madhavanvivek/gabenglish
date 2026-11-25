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
 it("does not animate when the timeline belongs to different measured audio",()=>{
  expect(sampleGabrooMobileAvatarPlayback({...input,timeline:{...timeline,audio_id:"c".repeat(64)}}).controls.viseme.shape).toBe("neutral");
  expect(sampleGabrooMobileAvatarPlayback({...input,timeline:{...timeline,duration_ms:998}}).controls.viseme.shape).toBe("neutral");
 });
});
