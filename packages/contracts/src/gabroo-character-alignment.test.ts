import {describe,expect,it} from "vitest";
import {
 gabrooCharacterAlignmentSchema,
 gabrooCharacterAlignmentToCaptionCues,
 sampleGabrooCaptionAtPlayback,
 isGabrooCharacterAlignmentForContent
} from "./gabroo-character-alignment.js";

describe("Gabroo character alignment",()=>{
 const text="ഹായ് Gabroo 😊";
 const identity={audioId:"audio-caption-1",audioSha256:"a".repeat(64),textSha256:"b".repeat(64),durationMs:1200};
 const alignment={audio_id:"audio-caption-1",audio_sha256:"a".repeat(64),text_sha256:"b".repeat(64),text_length:Array.from(text).length,duration_ms:1200,characters:[
  {start_index:0,end_index:4,start_ms:0,end_ms:250},
  {start_index:5,end_index:11,start_ms:300,end_ms:850},
  {start_index:12,end_index:13,start_ms:900,end_ms:1100}
 ]};

 it("creates caption cues from provider character timestamps and Unicode code-point offsets",()=>{
  expect(gabrooCharacterAlignmentToCaptionCues(alignment,identity,text)).toEqual([
   {text:"ഹായ്",start_index:0,end_index:4,start_ms:0,end_ms:250},
   {text:"Gabroo",start_index:5,end_index:11,start_ms:300,end_ms:850},
   {text:"😊",start_index:12,end_index:13,start_ms:900,end_ms:1100}
  ]);
 });

 it("rejects different audio bytes, source text, or duration",()=>{
  expect(isGabrooCharacterAlignmentForContent(alignment,identity,text)).toBe(true);
  expect(isGabrooCharacterAlignmentForContent(alignment,{...identity,audioSha256:"c".repeat(64)},text)).toBe(false);
  expect(isGabrooCharacterAlignmentForContent(alignment,{...identity,textSha256:"d".repeat(64)},text)).toBe(false);
  expect(isGabrooCharacterAlignmentForContent(alignment,{...identity,durationMs:1400},text)).toBe(false);
  expect(isGabrooCharacterAlignmentForContent(alignment,identity,text+"!")).toBe(false);
  expect(()=>gabrooCharacterAlignmentToCaptionCues(alignment,{...identity,textSha256:"d".repeat(64)},text)).toThrow(/does not match/i);
 });

 it("rejects malformed offsets, out-of-range timestamps and unordered events",()=>{
  expect(gabrooCharacterAlignmentSchema.safeParse({...alignment,characters:[{start_index:0,end_index:99,start_ms:0,end_ms:100}]}).success).toBe(false);
  expect(gabrooCharacterAlignmentSchema.safeParse({...alignment,characters:[{start_index:0,end_index:1,start_ms:0,end_ms:1300}]}).success).toBe(false);
  expect(gabrooCharacterAlignmentSchema.safeParse({...alignment,characters:[{start_index:3,end_index:5,start_ms:100,end_ms:200},{start_index:0,end_index:1,start_ms:300,end_ms:400}]}).success).toBe(false);
  expect(gabrooCharacterAlignmentSchema.safeParse({...alignment,characters:[{start_index:0,end_index:1,start_ms:300,end_ms:400},{start_index:1,end_index:2,start_ms:100,end_ms:200}]}).success).toBe(false);
 });

 it("rejects UTF-16-style offsets that split a supplementary Unicode character",()=>{
  const emojiText="A😊B";
  const emojiAlignment={...alignment,text_length:3,characters:[{start_index:1,end_index:2,start_ms:0,end_ms:100}]};
  expect(gabrooCharacterAlignmentToCaptionCues(emojiAlignment,{...identity,textSha256:"b".repeat(64)},emojiText)[0].text).toBe("😊");
 });
});


describe("Gabroo caption playback sampler",()=>{
 const cues=[
  {text:"നമസ്കാരം",start_index:0,end_index:9,start_ms:0,end_ms:500},
  {text:"Gabroo",start_index:10,end_index:16,start_ms:500,end_ms:900}
 ];
 it("highlights only the cue active at the native audio playback position",()=>{
  expect(sampleGabrooCaptionAtPlayback(cues,{audioId:"audio-1",expectedAudioId:"audio-1",positionMs:250,isPlaying:true})?.cue.text).toBe("നമസ്കാരം");
  expect(sampleGabrooCaptionAtPlayback(cues,{audioId:"audio-1",positionMs:750,isPlaying:true})?.cue.text).toBe("Gabroo");
  expect(sampleGabrooCaptionAtPlayback(cues,{audioId:"audio-1",positionMs:950,isPlaying:true})).toBeNull();
 });
 it("clears highlighting on pause or stale playback identity",()=>{
  expect(sampleGabrooCaptionAtPlayback(cues,{audioId:"audio-1",positionMs:250,isPlaying:false})).toBeNull();
  expect(sampleGabrooCaptionAtPlayback(cues,{audioId:"audio-old",expectedAudioId:"audio-1",positionMs:250,isPlaying:true})).toBeNull();
 });
 it("chooses the latest-starting active cue when provider spans overlap",()=>{
  const overlapping=[cues[0],{...cues[1],start_ms:300}];
  expect(sampleGabrooCaptionAtPlayback(overlapping,{audioId:"audio-1",positionMs:400,isPlaying:true})?.cue.text).toBe("Gabroo");
 });
 it("rejects invalid playback positions",()=>{
  expect(()=>sampleGabrooCaptionAtPlayback(cues,{audioId:"audio-1",positionMs:-1,isPlaying:true})).toThrow(/position/i);
  expect(()=>sampleGabrooCaptionAtPlayback(cues,{audioId:"audio-1",positionMs:Number.NaN,isPlaying:true})).toThrow(/position/i);
 });
});
