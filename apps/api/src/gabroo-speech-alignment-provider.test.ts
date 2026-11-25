import {describe,expect,it} from "vitest";
import {validateGabrooSpeechAlignmentResult} from "./gabroo-speech-alignment-provider.js";
import type {GabrooSynthesizedAudioIdentity} from "./gabroo-audio-identity.js";

const identity:GabrooSynthesizedAudioIdentity={
 audio_id:"audio-1",
 audio_sha256:"a".repeat(64),
 text_sha256:"b".repeat(64),
 text_length:5,
 duration_ms:1000
};

describe("Gabroo speech alignment provider boundary",()=>{
 it("accepts phoneme events only when they match the exact audio identity",()=>{
  const result=validateGabrooSpeechAlignmentResult({
   kind:"phoneme",
   alignment:{audio_id:identity.audio_id,audio_sha256:identity.audio_sha256,duration_ms:1000,phonemes:[{phoneme:"m",start_ms:0,end_ms:80}]}
  },identity,"Hello");
  expect(result.kind).toBe("phoneme");
 });
 it("accepts character timings only when audio and exact text identity match",()=>{
  const result=validateGabrooSpeechAlignmentResult({
   kind:"character",
   alignment:{audio_id:identity.audio_id,audio_sha256:identity.audio_sha256,text_sha256:identity.text_sha256,text_length:5,duration_ms:1000,characters:[{start_index:0,end_index:1,start_ms:0,end_ms:100}]}
  },identity,"Hello");
  expect(result.kind).toBe("character");
 });
 it("rejects stale audio, changed text, and duration mismatch",()=>{
  const phoneme={kind:"phoneme" as const,alignment:{audio_id:identity.audio_id,audio_sha256:"c".repeat(64),duration_ms:1000,phonemes:[]}};
  expect(()=>validateGabrooSpeechAlignmentResult(phoneme,identity,"Hello")).toThrow(/audio asset/i);
  const character={kind:"character" as const,alignment:{audio_id:identity.audio_id,audio_sha256:identity.audio_sha256,text_sha256:"c".repeat(64),text_length:5,duration_ms:1000,characters:[]}};
  expect(()=>validateGabrooSpeechAlignmentResult(character,identity,"Hello")).toThrow(/source text/i);
  const wrongDuration={kind:"phoneme" as const,alignment:{audio_id:identity.audio_id,audio_sha256:identity.audio_sha256,duration_ms:1200,phonemes:[]}};
  expect(()=>validateGabrooSpeechAlignmentResult(wrongDuration,identity,"Hello")).toThrow(/audio asset/i);
 });
 it("rejects malformed provider events instead of coercing them",()=>{
  const result={kind:"phoneme" as const,alignment:{audio_id:identity.audio_id,audio_sha256:identity.audio_sha256,duration_ms:1000,phonemes:[{phoneme:"m",start_ms:90,end_ms:20}]}};
  expect(()=>validateGabrooSpeechAlignmentResult(result,identity,"Hello")).toThrow();
 });
});
