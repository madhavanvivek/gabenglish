import {describe,expect,it} from "vitest";
import {parseGabrooSpeechBenchmarkManifest,validateGabrooBenchmarkAudio} from "./gabroo-speech-benchmark-manifest.js";
const sample={sampleId:"ml-1",mode:"ml-IN",environment:"quiet",audioFile:"restricted-audio/ml-1.wav",mimeType:"audio/wav",durationMs:4200,referenceText:"നമസ്കാരം",split:"held_out"};
describe("Gabroo local benchmark manifest",()=>{
 it("parses a valid local sample",()=>{const result=parseGabrooSpeechBenchmarkManifest(JSON.stringify(sample));expect(result.samples).toHaveLength(1);expect(result.issues).toEqual([]);});
 it("rejects traversal and absolute audio paths",()=>{for(const audioFile of ["../secret.wav","/tmp/a.wav","C:\\private\\a.wav"]){const result=parseGabrooSpeechBenchmarkManifest(JSON.stringify({...sample,audioFile}));expect(result.samples).toHaveLength(0);}});
 it("rejects duplicate sample IDs but retains other samples",()=>{const result=parseGabrooSpeechBenchmarkManifest([sample,{...sample,sampleId:"ml-2"}].map(JSON.stringify).join("\n"));expect(result.samples).toHaveLength(1);expect(result.issues[0].message).toBe("Duplicate sampleId.");});
 it("rejects oversized or empty audio buffers",()=>{expect(()=>validateGabrooBenchmarkAudio(sample,new Uint8Array())).toThrow("empty or invalid");expect(()=>validateGabrooBenchmarkAudio(sample,new Uint8Array(10*1024*1024+1))).toThrow("10 MB");});
});
