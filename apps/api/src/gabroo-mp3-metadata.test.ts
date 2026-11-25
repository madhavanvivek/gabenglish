import {describe,expect,it} from "vitest";
import {measureGabrooMp3DurationMs} from "./gabroo-mp3-metadata.js";

function mp3Frame(input:{version?:1|2|2.5;bitrateIndex?:number;sampleIndex?:number;padding?:number}={}){
 const version=input.version??1,bitrateIndex=input.bitrateIndex??9,sampleIndex=input.sampleIndex??0,padding=input.padding??0;
 const versionBits=version===1?3:version===2?2:0;
 const header=new Uint8Array([0xff,0xe0|(versionBits<<3)|(1<<1)|1,(bitrateIndex<<4)|(sampleIndex<<2)|(padding<<1),0]);
 const base=[44_100,48_000,32_000][sampleIndex]!;
 const sampleRate=version===1?base:version===2?base/2:base/4;
 const bitrate=(version===1?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320][bitrateIndex]!: [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160][bitrateIndex]!)*1000;
 const length=Math.floor((version===1?144:72)*bitrate/sampleRate)+padding;
 const frame=new Uint8Array(length);
 frame.set(header);
 return frame;
}
function join(...parts:Uint8Array[]){
 const result=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;
 for(const part of parts){result.set(part,offset);offset+=part.length;}
 return result;
}

describe("Gabroo MP3 duration measurement",()=>{
 it("measures duration from MPEG-1 Layer III frame count",()=>{
  const frame=mp3Frame();
  expect(measureGabrooMp3DurationMs(join(frame,frame,frame))).toBe(78);
 });
 it("supports variable bitrate frames without estimating from file size",()=>{
  expect(measureGabrooMp3DurationMs(join(mp3Frame({bitrateIndex:9}),mp3Frame({bitrateIndex:10}),mp3Frame({bitrateIndex:8})))).toBe(78);
 });
 it("supports MPEG-2 and MPEG-2.5 Layer III sample rates",()=>{
  expect(measureGabrooMp3DurationMs(join(mp3Frame({version:2}),mp3Frame({version:2})))).toBe(52);
  expect(measureGabrooMp3DurationMs(join(mp3Frame({version:2.5}),mp3Frame({version:2.5})))).toBe(52);
 });
 it("skips a valid ID3v2 tag before the first frame",()=>{
  const tag=new Uint8Array([0x49,0x44,0x33,4,0,0,0,0,0,4,1,2,3,4]);
  expect(measureGabrooMp3DurationMs(join(tag,mp3Frame(),mp3Frame()))).toBe(52);
 });
 it("accepts an ID3v1 footer after complete frames",()=>{
  const footer=new Uint8Array(128);footer.set([0x54,0x41,0x47]);
  expect(measureGabrooMp3DurationMs(join(mp3Frame(),footer))).toBe(26);
 });
 it.each([
  new Uint8Array(),
  new Uint8Array([1,2,3,4]),
  new Uint8Array([0x49,0x44,0x33,4,0,0,0,0,0,127]),
  join(mp3Frame(),new Uint8Array([1,2,3])),
  join(mp3Frame(),mp3Frame({sampleIndex:1}))
 ])("rejects empty, truncated or invalid MP3 data",audio=>{
  expect(()=>measureGabrooMp3DurationMs(audio)).toThrow();
 });
});
