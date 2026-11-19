import {describe,expect,it} from "vitest";
import {validateGabrooAudioBytes,validateGabrooAudioHeaders} from "./gabroo-audio-response";

describe("Gabroo audio response validation",()=>{
 it("accepts MP3 content type with optional charset and known length",()=>{
  expect(()=>validateGabrooAudioHeaders("audio/mpeg; charset=binary","2048")).not.toThrow();
 });
 it("rejects unexpected or missing content types",()=>{
  expect(()=>validateGabrooAudioHeaders("application/json","10")).toThrow(/unsupported audio format/i);
  expect(()=>validateGabrooAudioHeaders(null,null)).toThrow(/unsupported audio format/i);
 });
 it("rejects invalid and oversized declared lengths before reading audio",()=>{
  expect(()=>validateGabrooAudioHeaders("audio/mpeg","-1")).toThrow(/invalid audio length/i);
  expect(()=>validateGabrooAudioHeaders("audio/mpeg","12mb")).toThrow(/invalid audio length/i);
  expect(()=>validateGabrooAudioHeaders("audio/mpeg",String(12*1024*1024+1))).toThrow(/exceeded/i);
 });
 it("rejects empty or oversized audio bodies",()=>{
  expect(()=>validateGabrooAudioBytes(new Uint8Array())).toThrow(/invalid audio response/i);
  expect(()=>validateGabrooAudioBytes(new Uint8Array(12*1024*1024+1))).toThrow(/invalid audio response/i);
 });
 it("accepts a non-empty audio body within the size limit",()=>{
  expect(()=>validateGabrooAudioBytes(new Uint8Array([0x49,0x44,0x33]))).not.toThrow();
 });
});
