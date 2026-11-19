import {mkdtemp,mkdir,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {fingerprintGabrooBenchmarkCorpus} from "./gabroo-speech-benchmark-fingerprint.js";

const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});
const sample=(sampleId:string,audioFile:string)=>({
 sampleId,mode:"ml-IN",environment:"quiet",audioFile,mimeType:"audio/wav",
 durationMs:1200,referenceText:"നമസ്കാരം",split:"held_out"
});
async function setup(){
 const root=await mkdtemp(join(tmpdir(),"gabroo-fingerprint-"));roots.push(root);
 const audio=join(root,"audio");await mkdir(audio);
 await writeFile(join(audio,"a.wav"),Buffer.from([1,2,3,4]));
 await writeFile(join(audio,"b.wav"),Buffer.from([5,6,7,8]));
 const manifest=join(root,"manifest.jsonl");
 await writeFile(manifest,[sample("a","a.wav"),sample("b","b.wav")].map(x=>JSON.stringify(x)).join("\n")+"\n");
 return {root,audio,manifest};
}
describe("Gabroo corpus fingerprint",()=>{
 it("is deterministic and independent of manifest row order",async()=>{
  const {root,audio,manifest}=await setup();
  const first=await fingerprintGabrooBenchmarkCorpus(manifest,audio);
  await writeFile(manifest,[sample("b","b.wav"),sample("a","a.wav")].map(x=>JSON.stringify(x)).join("\n")+"\n");
  const second=await fingerprintGabrooBenchmarkCorpus(manifest,audio);
  expect(first.fingerprint).toBe(second.fingerprint);
  expect(first.samples).toBe(2);expect(first.heldOut).toBe(2);
  expect(first.totalAudioBytes).toBe(8);
 });
 it("changes when audio bytes or reference text changes",async()=>{
  const {audio,manifest}=await setup();
  const first=await fingerprintGabrooBenchmarkCorpus(manifest,audio);
  await writeFile(join(audio,"a.wav"),Buffer.from([1,2,3,9]));
  const audioChanged=await fingerprintGabrooBenchmarkCorpus(manifest,audio);
  expect(audioChanged.fingerprint).not.toBe(first.fingerprint);
  await writeFile(manifest,[{...sample("a","a.wav"),referenceText:"ഹലോ"},sample("b","b.wav")].map(x=>JSON.stringify(x)).join("\n")+"\n");
  const textChanged=await fingerprintGabrooBenchmarkCorpus(manifest,audio);
  expect(textChanged.fingerprint).not.toBe(audioChanged.fingerprint);
 });
 it("rejects invalid manifest paths and missing audio files",async()=>{
  const {root,audio,manifest}=await setup();
  await writeFile(manifest,JSON.stringify(sample("escape","../outside.wav"))+"\n");
  await expect(fingerprintGabrooBenchmarkCorpus(manifest,audio)).rejects.toThrow("Invalid manifest");
  await writeFile(manifest,JSON.stringify(sample("missing","missing.wav"))+"\n");
  await expect(fingerprintGabrooBenchmarkCorpus(manifest,audio)).rejects.toThrow();
 });
});
