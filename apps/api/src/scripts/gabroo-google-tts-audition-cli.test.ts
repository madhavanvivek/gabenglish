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
 it("creates four blind-coded candidate folders with the same seven script segments",async()=>{
  directory=await mkdtemp(join(tmpdir(),"gabroo-audition-"));
  const synthesize=vi.fn(async(voice:string,text:string)=>new Uint8Array([voice.length,text.length,1]));
  const result=await createGabrooGoogleTtsAuditionPack({
   apiKey:"server-only-test-key",
   outputDirectory:directory,
   synthesize
  });
  expect(result).toEqual({outputDirectory:directory,candidateCount:4,sampleCount:28});
  expect(synthesize).toHaveBeenCalledTimes(28);
  const manifest=JSON.parse(await readFile(join(directory,"reviewer-manifest.json"),"utf8")) as {
   candidates:{blind_code:string;samples:{file:string}[]}[]
  };
  expect(manifest.candidates.map(candidate=>candidate.blind_code)).toEqual(["VOICE-01","VOICE-02","VOICE-03","VOICE-04"]);
  expect(manifest.candidates.every(candidate=>candidate.samples.length===7)).toBe(true);
  expect(JSON.stringify(manifest)).not.toMatch(/Standard-B|Wavenet-B|Google Cloud/);
  const mapping=JSON.parse(await readFile(join(directory,"mapping.private.json"),"utf8")) as {
   candidates:{blind_code:string;voice_id:string}[]
  };
  expect(mapping.candidates.map(candidate=>candidate.voice_id)).toEqual([
   "ml-IN-Standard-B","ml-IN-Standard-D","ml-IN-Wavenet-B","ml-IN-Wavenet-D"
  ]);
  const candidateFiles=await readdir(join(directory,"VOICE-01"));
  expect(candidateFiles).toHaveLength(7);
  const sample=await readFile(join(directory,"VOICE-01",candidateFiles[0]!));
  expect(sample.byteLength).toBe(3);
  expect(sample[0]).toBe("ml-IN-Standard-B".length);
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
