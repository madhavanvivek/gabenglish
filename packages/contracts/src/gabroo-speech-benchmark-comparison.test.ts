import {describe,expect,it} from "vitest";
import {renderGabrooSpeechBenchmarkComparison} from "./gabroo-speech-benchmark-comparison.js";
import {parseGabrooSpeechBenchmarkExperiment} from "./gabroo-speech-benchmark-experiment.js";
import type {SpeechBenchmarkResult} from "./gabroo-speech-benchmark-report.js";

const experiment=parseGabrooSpeechBenchmarkExperiment(JSON.stringify({
 experimentId:"compare-01",startedAt:"2026-11-19T10:00:00+05:30",
 corpusVersion:"corpus-v1",corpusSha256:"a".repeat(64),sampleCount:2,
 split:"held_out",operatorLabel:"qa",
 candidates:[
  {candidateId:"a",providerName:"Provider A",modelVersion:"v1",region:"ap-south",settings:[]},
  {candidateId:"b",providerName:"Provider B",modelVersion:"v2",region:"asia",settings:[]}
 ]
}));
const results:SpeechBenchmarkResult[]=[
 {candidateId:"a",sampleId:"one",mode:"ml-IN",environment:"quiet",status:"success",referenceText:"നമസ്കാരം",transcript:"നമസ്കാരം",latencyMs:100,audioSeconds:10,estimatedCost:0.02},
 {candidateId:"a",sampleId:"two",mode:"ml-IN",environment:"quiet",status:"failure",referenceText:"സുഖമാണോ",audioSeconds:5,estimatedCost:0.01},
 {candidateId:"b",sampleId:"one",mode:"ml-IN",environment:"quiet",status:"success",referenceText:"നമസ്കാരം",transcript:"നമസ്കാരം",latencyMs:200,audioSeconds:10,estimatedCost:0.03},
 {candidateId:"b",sampleId:"two",mode:"ml-IN",environment:"quiet",status:"success",referenceText:"സുഖമാണോ",transcript:"സുഖമാണോ",latencyMs:300,audioSeconds:5,estimatedCost:0.015}
];
describe("Gabroo speech benchmark comparison report",()=>{
 it("renders candidate metrics and cost per audio minute without selecting a winner",()=>{
  const report=renderGabrooSpeechBenchmarkComparison(experiment,results);
  expect(report).toContain("Cost / audio min");
  expect(report).toContain("0.1200");
  expect(report).toContain("50.00%");
  expect(report).toContain("No provider is ranked or declared the winner");
  expect(report).toContain("Human review (separate from automated WER/CER)");
 });
 it("rejects candidates missing from the experiment or a comparison dimension",()=>{
  expect(()=>renderGabrooSpeechBenchmarkComparison(experiment,results.filter(x=>x.candidateId==="a"))).toThrow("exactly match");
  const missingMode=results.filter(x=>!(x.candidateId==="b"&&x.sampleId==="two"));
  expect(()=>renderGabrooSpeechBenchmarkComparison(experiment,missingMode)).toThrow("sample sets differ");
 });
 it("escapes candidate metadata in Markdown cells",()=>{
  const unsafe=parseGabrooSpeechBenchmarkExperiment(JSON.stringify({
   ...JSON.parse(JSON.stringify(experiment)),candidates:[
    {...experiment.candidates[0],providerName:"Provider | A"},
    experiment.candidates[1]
   ]
  }));
  expect(renderGabrooSpeechBenchmarkComparison(unsafe,results)).toContain("Provider \\| A");
 });
 it("includes separate human-review averages and adjudication flags",()=>{
  const reviews=[
   {candidateId:"a",sampleId:"one",mode:"ml-IN" as const,environment:"quiet" as const,reviewerLabel:"r1",meaningPreservation:5,contentCompleteness:5,languageFidelity:5,readability:4,intelligibility:5,issueTags:[]},
   {candidateId:"a",sampleId:"one",mode:"ml-IN" as const,environment:"quiet" as const,reviewerLabel:"r2",meaningPreservation:2,contentCompleteness:3,languageFidelity:4,readability:4,intelligibility:4,issueTags:[]}
  ];
  const report=renderGabrooSpeechBenchmarkComparison(experiment,results,reviews);
  expect(report).toContain("Human review (separate from automated WER/CER)");
  expect(report).toContain("Exact agreement");
  expect(report).toContain("Mean absolute difference");
  expect(report).toContain("3.50");
  expect(report).toContain("one");
 });
});
