import {open,readFile,realpath} from "node:fs/promises";
import {constants} from "node:fs";
import {isAbsolute,relative,resolve,sep} from "node:path";
import {
 executeGabrooSpeechBenchmark,
 generateSpeechBenchmarkMarkdown,
 parseGabrooSpeechBenchmarkManifest,
 type GabrooBenchmarkCandidate,
 type GabrooBenchmarkExecutionResult
} from "@gabenglish/contracts";
import {GABROO_BENCHMARK_MAX_AUDIO_BYTES} from "@gabenglish/contracts";

function isWithin(parent:string,child:string):boolean{
 const rel=relative(parent,child);
 return rel===""||(!rel.startsWith(".."+sep)&&rel!==".."&&!isAbsolute(rel));
}

/**
 * Execute a benchmark using local files constrained to one approved audio root.
 * Candidates must be explicitly supplied by the caller; no provider is discovered
 * or enabled implicitly. The returned JSONL contains transcripts and must remain local.
 */
export async function runGabrooSpeechBenchmarkFromFiles(input:{
 manifestPath:string;
 audioRoot:string;
 candidates:GabrooBenchmarkCandidate[];
 timeoutMs?:number;
 signal?:AbortSignal;
 includeTuningSamples?:boolean;
}):Promise<GabrooBenchmarkExecutionResult&{markdown:string;manifestSamples:number}>{
 const manifestReal=await realpath(resolve(input.manifestPath));
 const rootReal=await realpath(resolve(input.audioRoot));
 const rootInfo=await stat(rootReal);
 if(!rootInfo.isDirectory())throw new Error("Approved audio root must be a directory.");
 const manifest=await readFile(manifestReal,"utf8");
 const parsed=parseGabrooSpeechBenchmarkManifest(manifest);
 if(parsed.issues.length>0)throw new Error("Benchmark manifest contains invalid records: "+parsed.issues.map(x=>"line "+x.line).join(", "));
 if(parsed.samples.length===0)throw new Error("Benchmark manifest contains no valid samples.");
 const audioCache=new Map<string,Uint8Array>();
 const loadAudio=async(sample:typeof parsed.samples[number],signal?:AbortSignal):Promise<Uint8Array>=>{
  if(signal?.aborted)throw new Error("Benchmark cancelled.");
  const candidatePath=resolve(rootReal,sample.audioFile);
  if(!isWithin(rootReal,candidatePath))throw new Error("Audio path escapes the approved audio root.");
  const fileReal=await realpath(candidatePath);
  if(!isWithin(rootReal,fileReal))throw new Error("Audio symlink escapes the approved audio root.");
  const cached=audioCache.get(fileReal);
  if(cached)return new Uint8Array(cached);
  // O_NOFOLLOW closes the final-component symlink race between realpath and open.
  const handle=await open(fileReal,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{
   const info=await handle.stat();
   if(!info.isFile())throw new Error("Audio path is not a regular file.");
   if(info.size===0||info.size>GABROO_BENCHMARK_MAX_AUDIO_BYTES)throw new Error("Audio file must be between 1 byte and 10 MB.");
   if(signal?.aborted)throw new Error("Benchmark cancelled.");
   const bytes=await handle.readFile();
   if(bytes.byteLength!==info.size||bytes.byteLength>GABROO_BENCHMARK_MAX_AUDIO_BYTES)throw new Error("Audio file changed during validation.");
   const audio=new Uint8Array(bytes);
   audioCache.set(fileReal,audio);
   return new Uint8Array(audio);
  }finally{await handle.close();}
 };
 // Preflight every sample before the first adapter is invoked.
 for(const sample of parsed.samples)await loadAudio(sample);
 const result=await executeGabrooSpeechBenchmark({
  samples:parsed.samples,candidates:input.candidates,loadAudio,
  timeoutMs:input.timeoutMs,signal:input.signal,includeTuningSamples:input.includeTuningSamples
 });
 const report=generateSpeechBenchmarkMarkdown(result.jsonl);
 if(report.rejectedLines.length>0)throw new Error("Generated benchmark results failed schema validation.");
 return {...result,markdown:report.markdown,manifestSamples:parsed.samples.length};
}
