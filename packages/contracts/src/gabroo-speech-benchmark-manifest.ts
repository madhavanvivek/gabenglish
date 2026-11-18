import {z} from "zod";
import {GABROO_AUDIO_MIME_TYPES,gabrooRecognitionLanguageSchema} from "./gabroo-recognition.js";

export const gabrooSpeechBenchmarkSampleSchema=z.object({
 sampleId:z.string().trim().min(1).max(160),
 mode:gabrooRecognitionLanguageSchema,
 environment:z.enum(["quiet","moderate_noise"]),
 audioFile:z.string().min(1).max(500),
 mimeType:z.enum(GABROO_AUDIO_MIME_TYPES),
 durationMs:z.number().int().positive().max(300_000),
 referenceText:z.string().trim().min(1).max(12000),
 split:z.enum(["tuning","held_out"])
}).strict().superRefine((sample,ctx)=>{
 const path=sample.audioFile.replace(/\\/gu,"/");
 if(path.startsWith("/")||/^[a-zA-Z]:/u.test(path)||path.split("/").some(part=>part===".."||part==="."||part==="")){
  ctx.addIssue({code:"custom",path:["audioFile"],message:"audioFile must be a safe relative path without traversal segments."});
 }
});
export type GabrooSpeechBenchmarkSample=z.infer<typeof gabrooSpeechBenchmarkSampleSchema>;

export function parseGabrooSpeechBenchmarkManifest(source:string):{
 samples:GabrooSpeechBenchmarkSample[];
 issues:{line:number;message:string}[];
}{
 if(typeof source!=="string")throw new TypeError("Benchmark manifest must be text.");
 const samples:GabrooSpeechBenchmarkSample[]=[];
 const issues:{line:number;message:string}[]=[];
 const seen=new Set<string>();
 for(const [index,raw] of source.split(/\\r?\\n/u).entries()){
  const line=raw.trim();if(!line)continue;
  let value:unknown;
  try{value=JSON.parse(line);}catch{issues.push({line:index+1,message:"Invalid JSON."});continue;}
  const parsed=gabrooSpeechBenchmarkSampleSchema.safeParse(value);
  if(!parsed.success){issues.push({line:index+1,message:parsed.error.issues.map(x=>x.path.join(".")+": "+x.message).join("; ")});continue;}
  if(seen.has(parsed.data.sampleId)){issues.push({line:index+1,message:"Duplicate sampleId."});continue;}
  seen.add(parsed.data.sampleId);samples.push(parsed.data);
 }
 return {samples,issues};
}

export const GABROO_BENCHMARK_MAX_AUDIO_BYTES=10*1024*1024;
export function validateGabrooBenchmarkAudio(sample:GabrooSpeechBenchmarkSample,audio:Uint8Array):void{
 if(!(audio instanceof Uint8Array)||audio.byteLength===0)throw new Error("Audio sample is empty or invalid.");
 if(audio.byteLength>GABROO_BENCHMARK_MAX_AUDIO_BYTES)throw new Error("Audio sample exceeds the 10 MB benchmark limit.");
}
