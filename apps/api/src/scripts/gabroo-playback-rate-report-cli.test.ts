import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {renderGabrooPlaybackRateReport,writeGabrooPlaybackRateReport} from "./gabroo-playback-rate-report-cli.js";

const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(path=>rm(path,{recursive:true,force:true})));});
const trial=(trialId:string,playbackMethod:"client_rate_adjustment"|"provider_resynthesis"="client_rate_adjustment")=>({
 trialId,blindCode:"VOICE-01" as const,device:"Android test device",networkProfile:"wifi" as const,
 requestedRate:0.75,appliedRate:0.75,playbackMethod,intelligibility:4,naturalness:3,
 audibleArtifacts:["pitch_distortion" as const],completed:true
});
describe("Gabroo playback-rate report",()=>{
 it("separates client adjustment from provider re-synthesis and avoids ranking",()=>{
  const report=renderGabrooPlaybackRateReport([trial("t1"),trial("t2","provider_resynthesis")]);
  expect(report).toContain("Client-rate trials");
  expect(report).toContain("| VOICE-01 | 0.75× | 2 | 2 | 4.00/5 | 3.00/5 | 2 | 1 | 1 |");
  expect(report).toContain("does not rank or select a voice");
 });
 it("writes a report from a JSON trial file",async()=>{
  const root=await mkdtemp(join(tmpdir(),"gabroo-playback-report-"));roots.push(root);
  const input=join(root,"trials.json"),output=join(root,"report.md");
  await writeFile(input,JSON.stringify([trial("t1")]));
  await expect(writeGabrooPlaybackRateReport(input,output)).resolves.toEqual({trialCount:1,groupCount:1});
  expect(await readFile(output,"utf8")).toContain("0.75×");
 });
 it("rejects non-array input",async()=>{
  const root=await mkdtemp(join(tmpdir(),"gabroo-playback-report-"));roots.push(root);
  const input=join(root,"trials.json"),output=join(root,"report.md");
  await writeFile(input,JSON.stringify({trialId:"bad"}));
  await expect(writeGabrooPlaybackRateReport(input,output)).rejects.toThrow("JSON array");
 });
});
