import {describe,expect,it} from "vitest";
import {generateSpeechBenchmarkMarkdown} from "./gabroo-speech-benchmark-runner.js";

const sample={
 candidateId:"candidate-a",sampleId:"sample-1",mode:"ml-IN",
 environment:"quiet",status:"success",referenceText:"നമസ്കാരം",
 transcript:"നമസ്കാരം",latencyMs:150,audioSeconds:2.5,estimatedCost:0.001
};

describe("Gabroo offline benchmark runner",()=>{
 it("converts JSONL records into an aggregate Markdown report",()=>{
  const result=generateSpeechBenchmarkMarkdown(JSON.stringify(sample));
  expect(result.acceptedRecords).toBe(1);
  expect(result.rejectedLines).toEqual([]);
  expect(result.markdown).toContain("candidate-a");
  expect(result.markdown).toContain("150");
 });
 it("returns partial report and identifies invalid lines",()=>{
  const result=generateSpeechBenchmarkMarkdown(["not-json",JSON.stringify(sample)].join("\n"));
  expect(result.acceptedRecords).toBe(1);
  expect(result.rejectedLines).toEqual([{line:1,message:"Invalid JSON."}]);
 });
 it("returns an empty report when all lines are invalid",()=>{
  const result=generateSpeechBenchmarkMarkdown("broken");
  expect(result.acceptedRecords).toBe(0);
  expect(result.markdown).toContain("# Gabroo speech benchmark results");
 });
});
