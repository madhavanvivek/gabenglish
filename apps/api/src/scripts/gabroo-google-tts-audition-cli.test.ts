import {mkdtemp,readFile,readdir,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,it,expect,vi} from "vitest";
import {createGabrooGoogleTtsAuditionPack,resolveGabrooAuditionOutputDirectory} from "./gabroo-google-tts-audition-cli.js";

describe("Gabroo Google TTS audition pack",()=>{
 let directory:string|undefined;
 afterEach(async()=>{
  if(directory)await rm(directory,{recursive:true,force:true});
  directory=undefined;
 });
 it("keeps repository-local output inside the ignored audition directory",()=>{
  expect(resolveGabrooAuditionOutputDirectory()).toContain(".local/gabroo-voice-auditions");
  expect(()=>resolveGabrooAuditionOutputDirectory("artifacts/voice-samples")).toThrow(/git-ignored/i);
 });
 it("creates randomized paired plain-text and SSML blind variants for four voices",async()=>{
  directory=await mkdtemp(join(tmpdir(),"gabroo-audition-"));
  const synthesize=vi.fn(async(voice:string,text:string,inputMode:"text"|"ssml")=>new Uint8Array([voice.length,text.length,inputMode==="ssml"?1:2]));
  const result=await createGabrooGoogleTtsAuditionPack({
   apiKey:"server-only-test-key",
   outputDirectory:directory,
   synthesize
  });
  expect(result).toEqual({outputDirectory:directory,variantCount:8,sampleCount:56});
  expect(synthesize).toHaveBeenCalledTimes(56);
  expect(synthesize.mock.calls.filter(call=>call[2]==="text")).toHaveLength(28);
  expect(synthesize.mock.calls.filter(call=>call[2]==="ssml")).toHaveLength(28);
  const manifest=JSON.parse(await readFile(join(directory,"reviewer-manifest.json"),"utf8")) as {
   variants:{blind_code:string;samples:{file:string}[]}[]
  };
  expect(manifest.variants.map(candidate=>candidate.blind_code).sort()).toEqual(["SAMPLE-01","SAMPLE-02","SAMPLE-03","SAMPLE-04","SAMPLE-05","SAMPLE-06","SAMPLE-07","SAMPLE-08"]);
  expect(manifest.variants.every(candidate=>candidate.samples.length===7)).toBe(true);
  expect(JSON.stringify(manifest)).not.toMatch(/Standard-B|Wavenet-B|Google Cloud/);
  const mapping=JSON.parse(await readFile(join(directory,"mapping.private.json"),"utf8")) as {
   variants:{blind_code:string;voice_id:string;input_mode:"text"|"ssml"}[]
  };
  expect(mapping.variants).toHaveLength(8);
  for(const voice of ["ml-IN-Standard-B","ml-IN-Standard-D","ml-IN-Wavenet-B","ml-IN-Wavenet-D"]){
   expect(mapping.variants.filter(candidate=>candidate.voice_id===voice).map(candidate=>candidate.input_mode).sort()).toEqual(["ssml","text"]);
  }
  const candidateFiles=await readdir(join(directory,"SAMPLE-01"));
  expect(candidateFiles).toHaveLength(7);
  const sample=await readFile(join(directory,"SAMPLE-01",candidateFiles[0]!));
  expect(sample.byteLength).toBe(3);
  expect(sample[0]).toBeGreaterThan(0);
 });
 it("does not generate an empty sample",async()=>{
  directory=await mkdtemp(join(tmpdir(),"gabroo-audition-"));
  await expect(createGabrooGoogleTtsAuditionPack({
   apiKey:"server-only-test-key",
   outputDirectory:directory,
   synthesize:async()=>new Uint8Array()
  })).rejects.toThrow(/empty audio/i);
 });
});
