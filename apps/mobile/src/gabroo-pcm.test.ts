import {describe,expect,it} from "vitest";
import {
  chunkGabrooPcm16,
  GABROO_PCM_FRAME_BYTES,
  normalizeGabrooPcm16Mono,
} from "./gabroo-pcm";

function floatBuffer(values:number[]):ArrayBuffer{
 const data=new Float32Array(values);
 return data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
}
function int16Values(bytes:Uint8Array):number[]{
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 return Array.from({length:bytes.byteLength/2},(_,i)=>view.getInt16(i*2,true));
}

describe("Gabroo PCM normalization",()=>{
 it("converts float32 mono audio to signed 16-bit little-endian PCM",()=>{
  const result=normalizeGabrooPcm16Mono({data:floatBuffer([-1,-0.5,0,0.5,1]),encoding:"float32",sampleRate:16_000,channels:1});
  expect(int16Values(result)).toEqual([-32768,-16384,0,16384,32767]);
 });
 it("downmixes stereo before encoding",()=>{
  const result=normalizeGabrooPcm16Mono({data:floatBuffer([1,-1,0.5,0.5]),encoding:"float32",sampleRate:16_000,channels:2});
  expect(int16Values(result)).toEqual([0,16384]);
 });
 it("resamples 48 kHz input to 16 kHz",()=>{
  const result=normalizeGabrooPcm16Mono({data:floatBuffer(Array.from({length:480},(_,i)=>i/480)),encoding:"float32",sampleRate:48_000,channels:1});
  expect(result.byteLength).toBe(160*2);
 });
 it("accepts native int16 PCM and clamps out-of-range float samples",()=>{
  const raw=new Int16Array([-32768,0,32767]);
  const data=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
  expect(int16Values(normalizeGabrooPcm16Mono({data,encoding:"int16",sampleRate:16_000,channels:1}))).toEqual([-32768,0,32767]);
  expect(int16Values(normalizeGabrooPcm16Mono({data:floatBuffer([-2,2]),encoding:"float32",sampleRate:16_000,channels:1}))).toEqual([-32768,32767]);
 });
 it("rejects invalid sample rates, channels, partial frames and NaN",()=>{
  const base={data:floatBuffer([0]),encoding:"float32" as const,sampleRate:16_000,channels:1};
  expect(()=>normalizeGabrooPcm16Mono({...base,sampleRate:7_999})).toThrow(/sample rate/);
  expect(()=>normalizeGabrooPcm16Mono({...base,channels:3})).toThrow(/one or two/);
  expect(()=>normalizeGabrooPcm16Mono({...base,data:new ArrayBuffer(3)})).toThrow(/incomplete/);
  expect(()=>normalizeGabrooPcm16Mono({...base,data:floatBuffer([Number.NaN])})).toThrow(/non-finite/);
 });
});

describe("Gabroo PCM transport framing",()=>{
 it("splits audio into 100 ms frames and preserves the final short frame",()=>{
  const pcm=new Uint8Array(GABROO_PCM_FRAME_BYTES*2+6);
  const chunks=chunkGabrooPcm16(pcm);
  expect(chunks.map(x=>x.byteLength)).toEqual([GABROO_PCM_FRAME_BYTES,GABROO_PCM_FRAME_BYTES,6]);
  expect(chunks.reduce((sum,x)=>sum+x.byteLength,0)).toBe(pcm.byteLength);
 });
 it("rejects odd frame sizes and returns no frames for empty audio",()=>{
  expect(chunkGabrooPcm16(new Uint8Array())).toEqual([]);
  expect(()=>chunkGabrooPcm16(new Uint8Array(8),3)).toThrow(/even/);
 });
});
