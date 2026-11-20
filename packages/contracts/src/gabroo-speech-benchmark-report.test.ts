import {describe,expect,it} from "vitest";
import {buildSpeechBenchmarkReport} from "./gabroo-speech-benchmark-report.js";

const base={
 candidateId:"provider-a",mode:"ml-en" as const,environment:"quiet" as const,
 status:"success" as const,audioSeconds:3,estimatedCost:0.01
};

describe("Gabroo speech benchmark report aggregation",()=>{
 it("aggregates weighted transcript errors and retains failed requests in success rate",()=>{
  const report=buildSpeechBenchmarkReport([
   {...base,sampleId:"s1",referenceText:"hello world",transcript:"hello world",latencyMs:100},
   {...base,sampleId:"s2",referenceText:"hello gabroo",transcript:"hello",latencyMs:300},
   {...base,sampleId:"s3",status:"failure",referenceText:"ഹലോ",audioSeconds:2,estimatedCost:0.02}
  ])[0];
  expect(report).toMatchObject({
   candidateId:"provider-a",mode:"ml-en",environment:"quiet",
   samples:3,successes:2,failures:1,successRate:2/3,
   wordErrorRate:1/4,medianLatencyMs:200,p95LatencyMs:300,
   totalAudioSeconds:8,estimatedCost:0.04
  });
 });
 it("separates candidate, language mode and noise condition",()=>{
  const report=buildSpeechBenchmarkReport([
   {...base,sampleId:"a",referenceText:"hello",transcript:"hello",latencyMs:50},
   {...base,sampleId:"b",mode:"ml-IN",referenceText:"ഹലോ",transcript:"ഹലോ",latencyMs:60},
   {...base,sampleId:"c",environment:"moderate_noise",referenceText:"hello",transcript:"hello",latencyMs:70}
  ]);
  expect(report).toHaveLength(3);
 });
 it("rejects duplicate candidate/sample records",()=>{
  expect(()=>buildSpeechBenchmarkReport([
   {...base,sampleId:"same",referenceText:"hi",transcript:"hi",latencyMs:20},
   {...base,sampleId:"same",referenceText:"hi",transcript:"hi",latencyMs:30}
  ])).toThrow("Duplicate");
 });
 it("does not confuse distinct candidate/sample pairs containing separators",()=>{
  const report=buildSpeechBenchmarkReport([
   {...base,candidateId:"a\u0000b",sampleId:"c",referenceText:"hi",transcript:"hi",latencyMs:20},
   {...base,candidateId:"a",sampleId:"b\u0000c",referenceText:"hi",transcript:"hi",latencyMs:30}
  ]);
  expect(report).toHaveLength(2);
  expect(report.every(group=>group.samples===1)).toBe(true);
 });
 it("rejects successful results without a transcript or latency",()=>{
  expect(()=>buildSpeechBenchmarkReport([
   {...base,sampleId:"missing",referenceText:"hi",transcript:"",latencyMs:20}
  ])).toThrow("Successful results require a transcript");
 });
 it("rejects failed records that contain provider transcript output",()=>{
  expect(()=>buildSpeechBenchmarkReport([
   {...base,sampleId:"failed",status:"failure",referenceText:"hi",transcript:"unexpected"}
  ])).toThrow("Failed results must not contain a transcript");
 });
 it("returns null cost if any result has no cost measurement",()=>{
  const report=buildSpeechBenchmarkReport([
   {...base,sampleId:"costed",referenceText:"hi",transcript:"hi",latencyMs:20},
   {...base,sampleId:"unknown-cost",referenceText:"hi",transcript:"hi",latencyMs:30,estimatedCost:undefined}
  ])[0];
  expect(report.estimatedCost).toBeNull();
 });
});
