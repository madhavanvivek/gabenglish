import {mkdtemp,mkdir,writeFile,rm,symlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {validateGabrooBenchmarkFiles} from "./gabroo-speech-benchmark-cli.js";

const roots:string[]=[];
async function fixture(){
 const root=await mkdtemp(join(tmpdir(),"gabroo-benchmark-"));roots.push(root);
 const audio=join(root,"audio");await mkdir(audio);
 await writeFile(join(audio,"sample.wav"),new Uint8Array([1,2,3]));
 const manifest=join(root,"manifest.jsonl");
 const sample={sampleId:"sample-1",mode:"ml-IN",environment:"quiet",audioFile:"sample.wav",mimeType:"audio/wav",durationMs:2000,referenceText:"നമസ്കാരം",split:"held_out"};
 await writeFile(manifest,JSON.stringify(sample)+"\n");
 return {root,audio,manifest};
}
afterEach(async()=>{await Promise.all(roots.splice(0).map(path=>rm(path,{recursive:true,force:true})));});
describe("Gabroo benchmark CLI validation",()=>{
 it("validates a manifest and its local audio file",async()=>{
  const f=await fixture();const result=await validateGabrooBenchmarkFiles(f.manifest,f.audio);
  expect(result.samples).toBe(1);expect(result.heldOut).toBe(1);expect(result.issues).toEqual([]);expect(result.totalAudioBytes).toBe(3);
 });
 it("rejects audio symlinks that escape the approved root",async()=>{
  const f=await fixture();const outside=join(f.root,"outside.wav");await writeFile(outside,new Uint8Array([1]));
  await rm(join(f.audio,"sample.wav"));await symlink(outside,join(f.audio,"sample.wav"));
  const result=await validateGabrooBenchmarkFiles(f.manifest,f.audio);
  expect(result.issues.some(issue=>issue.message.includes("symlink escapes"))).toBe(true);
 });
});
