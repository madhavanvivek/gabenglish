import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {writeGabrooBenchmarkComparisonReport} from "./gabroo-speech-benchmark-comparison-cli.js";

const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(path=>rm(path,{recursive:true,force:true})));});
const experiment={
 experimentId:"cli-compare",startedAt:"2026-11-19T10:00:00+05:30",
 corpusVersion:"v1",corpusSha256:"b".repeat(64),sampleCount:1,split:"held_out",operatorLabel:"qa",
 candidates:[
  {candidateId:"a",providerName:"Mock A",modelVersion:"1",region:"local",settings:[]},
  {candidateId:"b",providerName:"Mock B",modelVersion:"1",region:"local",settings:[]}
 ]
};
const row=(candidateId:string)=>({candidateId,sampleId:"s1",mode:"ml-IN",environment:"quiet",status:"success",referenceText:"നമസ്കാരം",transcript:"നമസ്കാരം",latencyMs:100,audioSeconds:2,estimatedCost:0});
describe("Gabroo benchmark comparison CLI",()=>{
 it("writes a fair comparison report without raw transcripts",async()=>{
  const root=await mkdtemp(join(tmpdir(),"gabroo-compare-"));roots.push(root);
  const results=join(root,"results.jsonl"),metadata=join(root,"experiment.json"),output=join(root,"comparison.md");
  await writeFile(results,[row("a"),row("b")].map(x=>JSON.stringify(x)).join("\n")+"\n");
  await writeFile(metadata,JSON.stringify(experiment));
  const summary=await writeGabrooBenchmarkComparisonReport(results,metadata,output);
  const report=await readFile(output,"utf8");
  expect(summary).toEqual({acceptedRecords:2,experimentId:"cli-compare"});
  expect(report).toContain("Mock A");expect(report).toContain("No provider is ranked");
  expect(report).not.toContain("നമസ്കാരം");
 });
 it("rejects malformed records before writing a report",async()=>{
  const root=await mkdtemp(join(tmpdir(),"gabroo-compare-"));roots.push(root);
  const results=join(root,"results.jsonl"),metadata=join(root,"experiment.json"),output=join(root,"comparison.md");
  await writeFile(results,"invalid-json\n");await writeFile(metadata,JSON.stringify(experiment));
  await expect(writeGabrooBenchmarkComparisonReport(results,metadata,output)).rejects.toThrow("invalid JSONL");
 });
});
