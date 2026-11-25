import {describe,expect,it} from "vitest";
import {parseGabrooAudioResponseMetadata} from "./gabroo-audio-metadata";

const audioId="a".repeat(64);
const textSha="b".repeat(64);
const headers=(values:Record<string,string|undefined>)=>{const result=new Headers();for(const [key,value] of Object.entries(values))if(value!==undefined)result.set(key,value);return result;};

describe("Gabroo measured audio response metadata",()=>{
 it("accepts a complete content-addressed identity and measured duration",()=>{
  expect(parseGabrooAudioResponseMetadata(headers({
   "x-gabroo-audio-id":audioId,
   "x-gabroo-audio-sha256":audioId,
   "x-gabroo-text-sha256":textSha,
   "x-gabroo-audio-duration-ms":"1234"
  }))).toEqual({audioId,audioSha256:audioId,textSha256:textSha,durationMs:1234});
 });
 it("returns null when a generic provider supplies no measured metadata",()=>{
  expect(parseGabrooAudioResponseMetadata(headers({}))).toBeNull();
 });
 it.each([
  {"x-gabroo-audio-id":audioId},
  {"x-gabroo-audio-id":audioId,"x-gabroo-audio-sha256":"c".repeat(64),"x-gabroo-text-sha256":textSha,"x-gabroo-audio-duration-ms":"100"},
  {"x-gabroo-audio-id":"not-a-hash","x-gabroo-audio-sha256":"not-a-hash","x-gabroo-text-sha256":textSha,"x-gabroo-audio-duration-ms":"100"},
  {"x-gabroo-audio-id":audioId,"x-gabroo-audio-sha256":audioId,"x-gabroo-text-sha256":"invalid","x-gabroo-audio-duration-ms":"100"},
  {"x-gabroo-audio-id":audioId,"x-gabroo-audio-sha256":audioId,"x-gabroo-text-sha256":textSha,"x-gabroo-audio-duration-ms":"0"},
  {"x-gabroo-audio-id":audioId,"x-gabroo-audio-sha256":audioId,"x-gabroo-text-sha256":textSha,"x-gabroo-audio-duration-ms":"600001"},
  {"x-gabroo-audio-id":audioId,"x-gabroo-audio-sha256":audioId,"x-gabroo-text-sha256":textSha,"x-gabroo-audio-duration-ms":"1.5"}
 ])("rejects incomplete or malformed metadata: %j",value=>{
  expect(()=>parseGabrooAudioResponseMetadata(headers(value))).toThrow();
 });
});
