import {createHash} from "node:crypto";
import {describe,expect,it} from "vitest";
import {createGabrooSynthesizedAudioIdentity} from "./gabroo-audio-identity.js";

describe("Gabroo synthesized audio identity",()=>{
 it("fingerprints exact MP3 bytes and UTF-8 source text with code-point length",()=>{
  const audio=Buffer.from([0,1,2,3,254,255]);
  const text="ഹായ് Gabroo 😊";
  const result=createGabrooSynthesizedAudioIdentity({audio,text,durationMs:1250,audioId:"sample-audio"});
  expect(result).toEqual({
   audio_id:"sample-audio",
   audio_sha256:createHash("sha256").update(audio).digest("hex"),
   text_sha256:createHash("sha256").update(text,"utf8").digest("hex"),
   text_length:Array.from(text).length,
   duration_ms:1250
  });
 });
 it("uses a generated audio ID when one is not supplied",()=>{
  const result=createGabrooSynthesizedAudioIdentity({audio:Buffer.from([1]),text:"Hello",durationMs:100});
  expect(result.audio_id.length).toBeGreaterThan(0);
 });
 it("rejects empty audio, empty text and invalid durations",()=>{
  expect(()=>createGabrooSynthesizedAudioIdentity({audio:new Uint8Array(),text:"Hello",durationMs:100})).toThrow(/audio bytes/i);
  expect(()=>createGabrooSynthesizedAudioIdentity({audio:Buffer.from([1]),text:"",durationMs:100})).toThrow(/text/i);\n  expect(()=>createGabrooSynthesizedAudioIdentity({audio:Buffer.from([1]),text:"   ",durationMs:100})).toThrow(/text/i);\n  expect(()=>createGabrooSynthesizedAudioIdentity({audio:Buffer.from([1]),text:"x".repeat(4001),durationMs:100})).toThrow(/4000/i);
  for(const durationMs of [0,-1,Number.NaN,600001]){
   expect(()=>createGabrooSynthesizedAudioIdentity({audio:Buffer.from([1]),text:"Hello",durationMs})).toThrow(/duration/i);
  }
 });
 it("rejects invalid explicit audio IDs",()=>{
  expect(()=>createGabrooSynthesizedAudioIdentity({audio:Buffer.from([1]),text:"Hello",durationMs:100,audioId:"  "})).toThrow(/audio ID/i);\n  expect(()=>createGabrooSynthesizedAudioIdentity({audio:Buffer.from([1]),text:"Hello",durationMs:100,audioId:" sample "})).toThrow(/audio ID/i);
 });
});
