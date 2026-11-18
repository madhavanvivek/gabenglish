import {describe,expect,it} from "vitest";
import {renderSpeechBenchmarkMarkdownReport} from "./gabroo-speech-benchmark-markdown.js";
import type {SpeechBenchmarkGroupReport} from "./gabroo-speech-benchmark-report.js";

const report:SpeechBenchmarkGroupReport={
 candidateId:"provider|a",mode:"ml-en",environment:"quiet",
 samples:3,successes:2,failures:1,successRate:2/3,
 wordErrorRate:0.1,characterErrorRate:0.05,
 medianLatencyMs:210,p95LatencyMs:390,totalAudioSeconds:12.5,estimatedCost:null
};

describe("Gabroo benchmark Markdown report",()=>{
 it("renders aggregate metrics without exposing transcripts",()=>{
  const output=renderSpeechBenchmarkMarkdownReport([report]);
  expect(output).toContain("provider\\|a");
  expect(output).toContain("66.67%");
  expect(output).toContain("210");
  expect(output).toContain("unknown");
  expect(output).not.toContain("referenceText");
 });
 it("renders empty report as a valid table",()=>{
  expect(renderSpeechBenchmarkMarkdownReport([])).toContain("| Candidate | Mode |");
 });
 it("rejects non-array inputs",()=>{
  expect(()=>renderSpeechBenchmarkMarkdownReport(null as never)).toThrow(TypeError);
 });
});
