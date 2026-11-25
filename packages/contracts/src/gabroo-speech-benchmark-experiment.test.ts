import {describe,expect,it} from "vitest";
import {assertComparableSpeechBenchmarkResults,parseGabrooSpeechBenchmarkExperiment} from "./gabroo-speech-benchmark-experiment.js";

const metadata={
 experimentId:"pilot-001",startedAt:"2026-11-19T01:00:00+05:30",
 corpusVersion:"consented-corpus-v1",corpusSha256:"a".repeat(64),sampleCount:12,
 split:"held_out",operatorLabel:"benchmark-team",
 candidates:[
  {candidateId:"candidate-a",providerName:"Provider A",modelVersion:"model-2026-11",region:"ap-south",settings:[{key:"temperature",value:0}]},
  {candidateId:"candidate-b",providerName:"Provider B",modelVersion:"model-4",region:"asia",settings:[{key:"languageHint",value:"ml-IN"}]}
 ]
};
describe("Gabroo benchmark experiment metadata",()=>{
 it("parses a versioned experiment with non-secret settings",()=>{
  expect(parseGabrooSpeechBenchmarkExperiment(JSON.stringify(metadata)).candidates).toHaveLength(2);
 });
 it("rejects credential-like setting keys and unknown fields",()=>{
  const unsafe=structuredClone(metadata);
  unsafe.candidates[0].settings=[{key:"apiKey",value:"not-a-real-key"}];
  expect(()=>parseGabrooSpeechBenchmarkExperiment(JSON.stringify(unsafe))).toThrow("Sensitive or identifying");
  expect(()=>parseGabrooSpeechBenchmarkExperiment(JSON.stringify({...metadata,rawAudio:"base64"}))).toThrow("Unrecognized key");
 });
 it("rejects duplicate candidate IDs and setting keys",()=>{
  const duplicate=structuredClone(metadata);
  duplicate.candidates[1].candidateId="candidate-a";
  expect(()=>parseGabrooSpeechBenchmarkExperiment(JSON.stringify(duplicate))).toThrow("unique");
  const repeated=structuredClone(metadata);
  repeated.candidates[0].settings=[{key:"temperature",value:0},{key:"temperature",value:1}];
  expect(()=>parseGabrooSpeechBenchmarkExperiment(JSON.stringify(repeated))).toThrow("unique");
 });
 it("requires a valid SHA-256 corpus identity and offset-aware timestamp",()=>{
  expect(()=>parseGabrooSpeechBenchmarkExperiment(JSON.stringify({...metadata,corpusSha256:"bad"}))).toThrow("corpusSha256");
  expect(()=>parseGabrooSpeechBenchmarkExperiment(JSON.stringify({...metadata,startedAt:"2026-11-19T01:00:00"}))).toThrow("startedAt");
 });
 it("accepts candidate comparison only when sample sets match per mode and environment",()=>{
  const rows=[
   {candidateId:"a",sampleId:"1",mode:"ml-IN",environment:"quiet"},
   {candidateId:"a",sampleId:"2",mode:"ml-IN",environment:"quiet"},
   {candidateId:"b",sampleId:"1",mode:"ml-IN",environment:"quiet"},
   {candidateId:"b",sampleId:"2",mode:"ml-IN",environment:"quiet"}
  ];
  expect(()=>assertComparableSpeechBenchmarkResults(rows)).not.toThrow();
  expect(()=>assertComparableSpeechBenchmarkResults([...rows,{candidateId:"b",sampleId:"3",mode:"ml-IN",environment:"quiet"}])).toThrow("sample sets differ");
 });
});
