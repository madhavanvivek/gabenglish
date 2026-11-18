import {describe,expect,it,vi} from "vitest";
import {executeGabrooSpeechBenchmark} from "./gabroo-speech-benchmark-executor.js";
import type {GabrooSpeechBenchmarkSample} from "./gabroo-speech-benchmark-manifest.js";
const sample:GabrooSpeechBenchmarkSample={sampleId:"s1",mode:"ml-IN",environment:"quiet",audioFile:"audio/s1.wav",mimeType:"audio/wav",durationMs:2000,referenceText:"നമസ്കാരം",split:"held_out"};
const audio=new Uint8Array([1,2,3]);
const loadAudio=vi.fn(async()=>audio);
describe("Gabroo local benchmark executor",()=>{
 it("runs explicitly enabled mock adapters and emits parser-compatible JSONL",async()=>{
  const result=await executeGabrooSpeechBenchmark({samples:[sample],candidates:[{candidateId:"mock",enabled:true,adapter:{transcribe:async()=>({text:"നമസ്കാരം"})},estimateCost:()=>0}],loadAudio});
  expect(result.attempted).toBe(1);expect(result.completed).toBe(1);expect(result.results[0].status).toBe("success");
  expect(JSON.parse(result.jsonl).transcript).toBe("നമസ്കാരം");
 });
 it("records adapter errors as failures without leaking error text",async()=>{
  const result=await executeGabrooSpeechBenchmark({samples:[sample],candidates:[{candidateId:"mock",enabled:true,adapter:{transcribe:async()=>{throw new Error("secret token");}}}],loadAudio});
  expect(result.results[0].status).toBe("failure");expect(result.jsonl).not.toContain("secret token");
 });
 it("does not execute tuning samples by default",async()=>{
  const result=await executeGabrooSpeechBenchmark({samples:[{...sample,split:"tuning"}],candidates:[{candidateId:"mock",enabled:true,adapter:{transcribe:async()=>({text:"ok"})}}],loadAudio});
  expect(result.attempted).toBe(0);expect(result.skipped).toBe(0);
 });
 it("rejects candidates that are not explicitly enabled",async()=>{
  await expect(executeGabrooSpeechBenchmark({samples:[sample],candidates:[{candidateId:"mock",enabled:false,adapter:{transcribe:async()=>({text:"ok"})}} as never],loadAudio})).rejects.toThrow("explicitly enabled");
 });
 it("records a timeout as a failed request",async()=>{
  const result=await executeGabrooSpeechBenchmark({samples:[sample],timeoutMs:5,candidates:[{candidateId:"slow",enabled:true,adapter:{transcribe:({signal})=>new Promise((_,reject)=>signal.addEventListener("abort",()=>reject(new Error("aborted"))))}}],loadAudio});
  expect(result.results[0].status).toBe("failure");
 });
});
