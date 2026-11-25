import {describe,expect,it} from "vitest";
import {gabrooPhonemeAlignmentToTimeline,gabrooPhonemeToViseme,gabrooPhonemeAlignmentSchema,isGabrooPhonemeAlignmentForAudio,gabrooPhonemeAlignmentToTimelineForAudio} from "./gabroo-phoneme-alignment.js";
import {sampleGabrooAvatarFrame} from "./gabroo-avatar.js";

describe("Gabroo phoneme alignment",()=>{
 it("maps common Malayalam and English phoneme classes to canonical visemes",()=>{
  expect(gabrooPhonemeToViseme("m")).toBe("closed_lips");
  expect(gabrooPhonemeToViseme("f")).toBe("lip_teeth");
  expect(gabrooPhonemeToViseme("θ")).toBe("tongue_teeth");
  expect(gabrooPhonemeToViseme("ɑ")).toBe("open_wide");
  expect(gabrooPhonemeToViseme("ə")).toBe("open_mid");
  expect(gabrooPhonemeToViseme("u")).toBe("open_round");
  expect(gabrooPhonemeToViseme("i")).toBe("spread");
  expect(gabrooPhonemeToViseme("w")).toBe("narrow_round");
  expect(gabrooPhonemeToViseme("aː")).toBe("open_wide");
  expect(gabrooPhonemeToViseme("iː")).toBe("spread");
  expect(gabrooPhonemeToViseme("uː")).toBe("open_round");
  expect(gabrooPhonemeToViseme("eː")).toBe("open_mid");
  // Malayalam consonants without a validated distinct rig pose remain neutral.
  expect(gabrooPhonemeToViseme("ʈ")).toBe("neutral");
  expect(gabrooPhonemeToViseme("ɳ")).toBe("neutral");
 });
 it("uses authoritative provider timestamps and preserves the audio identity",()=>{
  const timeline=gabrooPhonemeAlignmentToTimeline({audio_id:"audio-1",audio_sha256:"a".repeat(64),duration_ms:1000,phonemes:[
   {phoneme:"m",start_ms:0,end_ms:120},{phoneme:"a",start_ms:120,end_ms:420},{phoneme:"unknown",start_ms:420,end_ms:500}
  ]});
  expect(timeline.audio_id).toBe("audio-1");
  expect(timeline.visemes.map(x=>[x.shape,x.start_ms,x.end_ms])).toEqual([
   ["closed_lips",0,120],["open_wide",120,420],["neutral",420,500]
  ]);
  expect(timeline.expressions).toEqual([]);
  expect(timeline.gestures).toEqual([]);
 });
 it("feeds the existing playback-clock avatar sampler without changing its contract",()=>{
  const timeline=gabrooPhonemeAlignmentToTimeline({audio_id:"audio-2",audio_sha256:"b".repeat(64),duration_ms:500,phonemes:[{phoneme:"m",start_ms:0,end_ms:150}]});
  expect(sampleGabrooAvatarFrame(timeline,75).viseme.shape).toBe("closed_lips");
  expect(sampleGabrooAvatarFrame(timeline,200).viseme.shape).toBe("neutral");
 });

 it("rejects an alignment when audio identity, bytes or duration do not match",()=>{
  const alignment={audio_id:"audio-3",audio_sha256:"d".repeat(64),duration_ms:500,phonemes:[{phoneme:"a",start_ms:0,end_ms:100}]};
  expect(isGabrooPhonemeAlignmentForAudio(alignment,{audioId:"audio-3",audioSha256:"d".repeat(64),durationMs:500})).toBe(true);
  expect(gabrooPhonemeAlignmentToTimelineForAudio(alignment,{audioId:"audio-3",audioSha256:"d".repeat(64),durationMs:500}).audio_id).toBe("audio-3");
  expect(isGabrooPhonemeAlignmentForAudio(alignment,{audioId:"audio-other",audioSha256:"d".repeat(64),durationMs:500})).toBe(false);
  expect(isGabrooPhonemeAlignmentForAudio(alignment,{audioId:"audio-3",audioSha256:"e".repeat(64),durationMs:500})).toBe(false);
  expect(()=>gabrooPhonemeAlignmentToTimelineForAudio(alignment,{audioId:"audio-3",audioSha256:"e".repeat(64),durationMs:500})).toThrow("does not match the active audio asset");
  expect(isGabrooPhonemeAlignmentForAudio(alignment,{audioId:"audio-3",audioSha256:"d".repeat(64),durationMs:700})).toBe(false);
 });
 it("rejects phoneme events outside the audio duration",()=>{
  expect(gabrooPhonemeAlignmentSchema.safeParse({audio_id:"audio",audio_sha256:"c".repeat(64),duration_ms:100,phonemes:[{phoneme:"a",start_ms:90,end_ms:110}]}).success).toBe(false);
 });

 it("rejects out-of-order provider timestamps",()=>{
  expect(gabrooPhonemeAlignmentSchema.safeParse({audio_id:"audio",audio_sha256:"c".repeat(64),duration_ms:100,phonemes:[
   {phoneme:"a",start_ms:50,end_ms:70},{phoneme:"m",start_ms:10,end_ms:30}
  ]}).success).toBe(false);
 });
 it("rejects malformed and oversized alignments",()=>{
  expect(gabrooPhonemeAlignmentSchema.safeParse({audio_id:"audio",audio_sha256:"c".repeat(64),duration_ms:100,phonemes:[{phoneme:"a",start_ms:10,end_ms:10}]}).success).toBe(false);
  expect(gabrooPhonemeAlignmentSchema.safeParse({audio_id:"audio",audio_sha256:"c".repeat(64),duration_ms:100,phonemes:Array.from({length:4097},()=>({phoneme:"a",start_ms:0,end_ms:1}))}).success).toBe(false);
 });
 
 it("drives the conversation avatar runtime only for the matching native audio item",async()=>{
  const {initialGabrooConversationState,reduceGabrooConversation}=await import("./gabroo-conversation.js");
  const {sampleGabrooConversationFrameFromPlaybackStatus}=await import("./gabroo-avatar-runtime.js");
  const timeline=gabrooPhonemeAlignmentToTimeline({
   audio_id:"native-audio-1",
   audio_sha256:"f".repeat(64),
   duration_ms:600,
   phonemes:[{phoneme:"m",start_ms:0,end_ms:180},{phoneme:"a",start_ms:180,end_ms:420}]
  });
  const greeting=reduceGabrooConversation(initialGabrooConversationState,{type:"begin_greeting"});
  const listening=reduceGabrooConversation(greeting,{type:"greeting_finished"});
  const thinking=reduceGabrooConversation(listening,{type:"learner_turn_started"});
  const speaking=reduceGabrooConversation(thinking,{type:"response_speech_started",timeline});
  const current=sampleGabrooConversationFrameFromPlaybackStatus(speaking,{
   isLoaded:true,isPlaying:true,positionMillis:100,audioId:"native-audio-1"
  });
  expect(current.state).toBe("speaking");
  expect(current.audioId).toBe("native-audio-1");
  expect(current.controls.viseme.shape).toBe("closed_lips");
  const stale=sampleGabrooConversationFrameFromPlaybackStatus(speaking,{
   isLoaded:true,isPlaying:true,positionMillis:250,audioId:"previous-audio"
  });
  expect(stale.audioId).toBeNull();
  expect(stale.controls.viseme.shape).toBe("neutral");
  const paused=sampleGabrooConversationFrameFromPlaybackStatus(speaking,{
   isLoaded:true,isPlaying:false,positionMillis:250,audioId:"native-audio-1"
  });
  expect(paused.controls.viseme.shape).toBe("neutral");
 });

});
