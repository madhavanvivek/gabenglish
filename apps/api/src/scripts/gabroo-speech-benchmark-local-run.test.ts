import {mkdtemp,mkdir,writeFile,rm,symlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it,vi} from "vitest";
import {runGabrooSpeechBenchmarkFromFiles} from "./gabroo-speech-benchmark-local-run.js";

const roots:string[]=[];
async function fixture(){
 const root=await mkdtemp(join(tmpdir(),"gabroo-run-"));roots.push(root);
 const audio=join(root,"audio");await mkdir(audio);
 await writeFile(join(audio,"sample.wav"),new Uint8Array([1,2,3]));
 const manifest=join(root,"manifest.jsonl");
 const sample={sampleId:"sample-1",mode:"ml-IN",environment:"quiet",audioFile:"sample.wav",mimeType:"audio/wav",durationMs:2000,referenceText:"നമസ്കാരം",split:"held_out"};
 await writeFile(manifest,JSON.stringify(sample)+"\n");
 return {root,audio,manifest};
}
afterEach(async()=>{await Promise.all(roots.splice(0).map(path=>rm(path,{recursive:true,force:true})));});
describe("Gabroo local benchmark orchestration",()=>{
 it("loads approved local audio and returns JSONL plus aggregate report",async()=>{
  const f=await fixture();const transcribe=vi.fn(async({audio:bytes}:{audio:Uint8Array})=>({text:bytes.length===3?"നമസ്കാരം":"bad"}));
  const result=await runGabrooSpeechBenchmarkFromFiles({manifestPath:f.manifest,audioRoot:f.audio,candidates:[{candidateId:"mock",enabled:true,adapter:{transcribe}}]});
  expect(result.manifestSamples).toBe(1);expect(result.attempted).toBe(1);expect(result.completed).toBe(1);
  expect(result.results[0].status).toBe("success");expect(result.markdown).toContain("mock");expect(transcribe).toHaveBeenCalledTimes(1);
 });
 it("preflights every file and never invokes an adapter when a symlink escapes",async()=>{
  const f=await fixture();const outside=join(f.root,"outside.wav");await writeFile(outside,new Uint8Array([1]));
  await rm(join(f.audio,"sample.wav"));await symlink(outside,join(f.audio,"sample.wav"));
  const transcribe=vi.fn(async()=>({text:"നമസ്കാരം"}));
  await expect(runGabrooSpeechBenchmarkFromFiles({manifestPath:f.manifest,audioRoot:f.audio,candidates:[{candidateId:"mock",enabled:true,adapter:{transcribe}}]})).rejects.toThrow("symlink escapes");
  expect(transcribe).not.toHaveBeenCalled();
 });
 it("rejects malformed manifest records before invoking adapters",async()=>{
  const f=await fixture();await writeFile(f.manifest,"not-json\n");
  const transcribe=vi.fn(async()=>({text:"ok"}));
  await expect(runGabrooSpeechBenchmarkFromFiles({manifestPath:f.manifest,audioRoot:f.audio,candidates:[{candidateId:"mock",enabled:true,adapter:{transcribe}}]})).rejects.toThrow("invalid records");
  expect(transcribe).not.toHaveBeenCalled();
 });
});
