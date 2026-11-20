import {describe,expect,it} from "vitest";
import {parseSpeechBenchmarkJsonl} from "./gabroo-speech-benchmark-input.js";

const good={
 candidateId:"provider-a",sampleId:"sample-1",mode:"ml-IN",
 environment:"quiet",status:"success",referenceText:"നമസ്കാരം",
 transcript:"നമസ്കാരം",latencyMs:240,audioSeconds:2.4,estimatedCost:0
};

describe("Gabroo benchmark JSONL input parser",()=>{
 it("parses valid success and failure records",()=>{
  const failure={...good,sampleId:"sample-2",status:"failure",transcript:undefined,latencyMs:undefined};
  const parsed=parseSpeechBenchmarkJsonl([JSON.stringify(good),JSON.stringify(failure)].join("\n"));
  expect(parsed.results).toHaveLength(2);
  expect(parsed.issues).toEqual([]);
 });
 it("keeps processing later lines after malformed JSON",()=>{
  const parsed=parseSpeechBenchmarkJsonl(["{bad json",JSON.stringify(good)].join("\n"));
  expect(parsed.results).toHaveLength(1);
  expect(parsed.issues).toEqual([{line:1,message:"Invalid JSON."}]);
 });
 it("rejects provider transcripts on failed requests",()=>{
  const parsed=parseSpeechBenchmarkJsonl(JSON.stringify({...good,status:"failure"}));
  expect(parsed.results).toHaveLength(0);
  expect(parsed.issues[0].message).toContain("Failed results must not include transcript output");
 });
 it("rejects unreviewed or incomplete successful records",()=>{
  const parsed=parseSpeechBenchmarkJsonl(JSON.stringify({...good,transcript:"",latencyMs:undefined}));
  expect(parsed.results).toHaveLength(0);
  expect(parsed.issues[0].message).toContain("Successful results require");
 });
 it("rejects unexpected provider fields",()=>{
  const parsed=parseSpeechBenchmarkJsonl(JSON.stringify({...good,apiKey:"secret"}));
  expect(parsed.results).toHaveLength(0);
  expect(parsed.issues[0].message).toContain("Unrecognized key");
 });
 it("ignores blank lines",()=>{
  const parsed=parseSpeechBenchmarkJsonl("\n"+JSON.stringify(good)+"\n");
  expect(parsed.results).toHaveLength(1);
  expect(parsed.issues).toEqual([]);
 });
 it("rejects duplicate candidate/sample records without discarding valid neighbors",()=>{
  const parsed=parseSpeechBenchmarkJsonl([JSON.stringify(good),JSON.stringify(good),JSON.stringify({...good,sampleId:"sample-3"})].join("\n"));
  expect(parsed.results).toHaveLength(2);
  expect(parsed.issues).toEqual([{line:2,message:"Duplicate candidate/sample result."}]);
 });
});
