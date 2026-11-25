import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {writeGabrooBenchmarkReport} from "./gabroo-speech-benchmark-report-cli.js";

const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(path=>rm(path,{recursive:true,force:true})));});
describe("Gabroo benchmark report CLI",()=>{
 it("writes aggregate Markdown without exposing transcripts",async()=>{
  const root=await mkdtemp(join(tmpdir(),"gabroo-report-"));roots.push(root);
  const input=join(root,"results.jsonl"),output=join(root,"report.md");
  await writeFile(input,JSON.stringify({candidateId:"mock",sampleId:"s1",mode:"ml-IN",environment:"quiet",status:"success",referenceText:"നമസ്കാരം",transcript:"PRIVATE TRANSCRIPT",latencyMs:100,audioSeconds:2,estimatedCost:0})+"\n");
  const summary=await writeGabrooBenchmarkReport(input,output);
  const report=await readFile(output,"utf8");
  expect(summary.acceptedRecords).toBe(1);expect(report).toContain("mock");expect(report).not.toContain("PRIVATE TRANSCRIPT");
 });
 it("reports malformed lines and exits through a rejected-line summary",async()=>{
  const root=await mkdtemp(join(tmpdir(),"gabroo-report-"));roots.push(root);
  const input=join(root,"results.jsonl"),output=join(root,"report.md");
  await writeFile(input,"not-json\n");
  const summary=await writeGabrooBenchmarkReport(input,output);
  expect(summary.acceptedRecords).toBe(0);expect(summary.rejectedLines).toEqual([1]);
 });
});
