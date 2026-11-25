import {describe,expect,it} from "vitest";
import {assertGabrooSpeechAlignmentInputIdentity,runGabrooSpeechAlignment,validateGabrooSpeechAlignmentResult} from "./gabroo-speech-alignment-provider.js";
import {createGabrooSynthesizedAudioIdentity} from "./gabroo-audio-identity.js";
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
  const phoneme={kind:"phoneme" as const,alignment:{audio_id:identity.audio_id,audio_sha256:"c".repeat(64),duration_ms:1000,phonemes:[{phoneme:"m",start_ms:0,end_ms:50}]}};
  expect(()=>validateGabrooSpeechAlignmentResult(phoneme,identity,"Hello")).toThrow(/audio asset/i);
  const character={kind:"character" as const,alignment:{audio_id:identity.audio_id,audio_sha256:identity.audio_sha256,text_sha256:"c".repeat(64),text_length:5,duration_ms:1000,characters:[{start_index:0,end_index:1,start_ms:0,end_ms:50}]}};
  expect(()=>validateGabrooSpeechAlignmentResult(character,identity,"Hello")).toThrow(/source text/i);
  const wrongDuration={kind:"phoneme" as const,alignment:{audio_id:identity.audio_id,audio_sha256:identity.audio_sha256,duration_ms:1200,phonemes:[{phoneme:"m",start_ms:0,end_ms:50}]}};
  expect(()=>validateGabrooSpeechAlignmentResult(wrongDuration,identity,"Hello")).toThrow(/audio asset/i);
 });
 it("rejects malformed provider events instead of coercing them",()=>{
  const result={kind:"phoneme" as const,alignment:{audio_id:identity.audio_id,audio_sha256:identity.audio_sha256,duration_ms:1000,phonemes:[{phoneme:"m",start_ms:90,end_ms:20}]}};
  expect(()=>validateGabrooSpeechAlignmentResult(result,identity,"Hello")).toThrow();
 });
 it("recomputes identity from the exact alignment audio bytes and text",()=>{
  const audio=Buffer.from([1,2,3,4]);
  const text="ഹായ് Gabroo 😊";
  const exactIdentity=createGabrooSynthesizedAudioIdentity({audio,text,durationMs:900,audioId:"verified-audio"});
  expect(()=>assertGabrooSpeechAlignmentInputIdentity({audio,text,language:"en",identity:exactIdentity})).not.toThrow();
  expect(()=>assertGabrooSpeechAlignmentInputIdentity({audio:Buffer.from([1,2,3,5]),text,language:"en",identity:exactIdentity})).toThrow(/exact audio bytes/i);
  expect(()=>assertGabrooSpeechAlignmentInputIdentity({audio,text:"മറ്റൊരു വാചകം",language:"ml",identity:exactIdentity})).toThrow(/exact audio bytes and source text/i);
 });

 it("rejects malformed identity metadata before invoking a provider",()=>{
  const audio=Buffer.from([1,2,3]);
  const text="Hello";
  const exactIdentity=createGabrooSynthesizedAudioIdentity({audio,text,durationMs:500,audioId:"identity-bounds"});
  expect(()=>assertGabrooSpeechAlignmentInputIdentity({audio,text,language:"en",identity:{...exactIdentity,audio_id:" ".repeat(2)}})).toThrow(/identity is malformed/i);
  expect(()=>assertGabrooSpeechAlignmentInputIdentity({audio,text,language:"en",identity:{...exactIdentity,audio_sha256:"bad"}})).toThrow(/identity is malformed/i);
  expect(()=>assertGabrooSpeechAlignmentInputIdentity({audio,text,language:"en",identity:{...exactIdentity,text_length:4_001}})).toThrow(/identity is malformed/i);
  expect(()=>assertGabrooSpeechAlignmentInputIdentity({audio,text,language:"en",identity:{...exactIdentity,duration_ms:Number.POSITIVE_INFINITY}})).toThrow(/identity is malformed/i);
 });

 it("runs providers only after verifying input identity and validates their response",async()=>{
  const audio=Buffer.from([9,8,7]);
  const text="Hello";
  const exactIdentity=createGabrooSynthesizedAudioIdentity({audio,text,durationMs:500,audioId:"runner-audio"});
  const controller=new AbortController();
  let called=0;
  const provider={align:async()=>{called+=1;return {kind:"phoneme" as const,alignment:{audio_id:exactIdentity.audio_id,audio_sha256:exactIdentity.audio_sha256,duration_ms:500,phonemes:[{phoneme:"h",start_ms:0,end_ms:50}]}};}};
  const result=await runGabrooSpeechAlignment(provider,{audio,text,language:"en",identity:exactIdentity,signal:controller.signal});
  expect(result.kind).toBe("phoneme");
  expect(called).toBe(1);
  await expect(runGabrooSpeechAlignment(provider,{audio:Buffer.from([9,8,6]),text,language:"en",identity:exactIdentity,signal:controller.signal})).rejects.toThrow(/identity/i);
  expect(called).toBe(1);
 });
 it("honours cancellation before and during provider alignment",async()=>{
  const audio=Buffer.from([1,2]);
  const text="Hello";
  const exactIdentity=createGabrooSynthesizedAudioIdentity({audio,text,durationMs:500,audioId:"cancel-audio"});
  const controller=new AbortController();
  controller.abort();
  const provider={align:async()=>({kind:"phoneme" as const,alignment:{audio_id:exactIdentity.audio_id,audio_sha256:exactIdentity.audio_sha256,duration_ms:500,phonemes:[{phoneme:"h",start_ms:0,end_ms:50}]}})};
  await expect(runGabrooSpeechAlignment(provider,{audio,text,language:"en",identity:exactIdentity,signal:controller.signal})).rejects.toThrow(/cancelled/i);
  const during=new AbortController();
  const abortingProvider={align:async()=>{during.abort();return {kind:"phoneme" as const,alignment:{audio_id:exactIdentity.audio_id,audio_sha256:exactIdentity.audio_sha256,duration_ms:500,phonemes:[{phoneme:"h",start_ms:0,end_ms:50}]}};}};
  await expect(runGabrooSpeechAlignment(abortingProvider,{audio,text,language:"en",identity:exactIdentity,signal:during.signal})).rejects.toThrow(/cancelled/i);
 });

 it("cancels promptly when an alignment provider ignores its abort signal",async()=>{
  const audio=Buffer.from([4,5,6]);
  const text="Hello";
  const exactIdentity=createGabrooSynthesizedAudioIdentity({audio,text,durationMs:500,audioId:"stalled-audio"});
  const controller=new AbortController();
  const provider={align:async()=>await new Promise<never>(()=>{})};
  const pending=runGabrooSpeechAlignment(provider,{audio,text,language:"en",identity:exactIdentity,signal:controller.signal});
  controller.abort();
  await expect(pending).rejects.toThrow(/cancelled/i);
 });

 it("rejects oversized audio and unsupported language before provider invocation",async()=>{
  const validAudio=Buffer.from([1]);
  const validText="Hello";
  const validIdentity=createGabrooSynthesizedAudioIdentity({audio:validAudio,text:validText,durationMs:100,audioId:"bounded-audio"});
  const controller=new AbortController();
  let called=0;
  const provider={align:async()=>{called+=1;return {kind:"phoneme" as const,alignment:{audio_id:validIdentity.audio_id,audio_sha256:validIdentity.audio_sha256,duration_ms:100,phonemes:[{phoneme:"h",start_ms:0,end_ms:50}]}};}};

  const oversized=Buffer.alloc(12*1024*1024+1);
  expect(()=>assertGabrooSpeechAlignmentInputIdentity({audio:oversized,text:validText,identity:validIdentity,language:"en"})).toThrow(/12 MiB/i);
  await expect(runGabrooSpeechAlignment(provider,{audio:oversized,text:validText,identity:validIdentity,language:"en",signal:controller.signal})).rejects.toThrow(/12 MiB/i);
  await expect(runGabrooSpeechAlignment(provider,{audio:validAudio,text:validText,identity:validIdentity,language:"xx" as "en",signal:controller.signal})).rejects.toThrow(/language/i);
  expect(called).toBe(0);
 });

 it("rejects empty timing arrays instead of treating them as successful alignment",()=>{
  const emptyPhonemes={kind:"phoneme" as const,alignment:{audio_id:identity.audio_id,audio_sha256:identity.audio_sha256,duration_ms:1000,phonemes:[]}};
  expect(()=>validateGabrooSpeechAlignmentResult(emptyPhonemes,identity,"Hello")).toThrow(/no timed phoneme/i);
  const emptyCharacters={kind:"character" as const,alignment:{audio_id:identity.audio_id,audio_sha256:identity.audio_sha256,text_sha256:identity.text_sha256,text_length:5,duration_ms:1000,characters:[]}};
  expect(()=>validateGabrooSpeechAlignmentResult(emptyCharacters,identity,"Hello")).toThrow(/no timed character/i);
 });

});
