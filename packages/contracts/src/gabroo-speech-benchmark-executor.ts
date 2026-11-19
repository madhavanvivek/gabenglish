import type {GabrooSpeechBenchmarkSample} from "./gabroo-speech-benchmark-manifest.js";
import {gabrooSpeechBenchmarkSampleSchema,validateGabrooBenchmarkAudio} from "./gabroo-speech-benchmark-manifest.js";
import type {SpeechBenchmarkResult} from "./gabroo-speech-benchmark-report.js";

export interface GabrooBenchmarkAdapter {
 transcribe(input:{audio:Uint8Array;mimeType:GabrooSpeechBenchmarkSample["mimeType"];mode:GabrooSpeechBenchmarkSample["mode"];signal:AbortSignal}):Promise<{text:string}>;
}
export interface GabrooBenchmarkCandidate {
 candidateId:string;
 enabled:true;
 adapter:GabrooBenchmarkAdapter;
 estimateCost?:(audioSeconds:number)=>number|undefined;
}
export interface GabrooBenchmarkExecutionOptions {
 samples:GabrooSpeechBenchmarkSample[];
 candidates:GabrooBenchmarkCandidate[];
 loadAudio:(sample:GabrooSpeechBenchmarkSample,signal?:AbortSignal)=>Promise<Uint8Array>;
 timeoutMs?:number;
 signal?:AbortSignal;
 includeTuningSamples?:boolean;
}
export interface GabrooBenchmarkExecutionResult {
 results:SpeechBenchmarkResult[];
 jsonl:string;
 attempted:number;
 completed:number;
 skipped:number;
}

/**
 * Runs explicitly enabled adapters against local audio supplied by the caller.
 * No filesystem, network, provider discovery, persistence or logging is done here.
 */
export async function executeGabrooSpeechBenchmark(options:GabrooBenchmarkExecutionOptions):Promise<GabrooBenchmarkExecutionResult>{
 if(!Array.isArray(options.samples)||!Array.isArray(options.candidates))throw new TypeError("Samples and candidates must be arrays.");
 if(options.candidates.length===0)throw new Error("At least one explicitly enabled benchmark candidate is required.");
 const timeoutMs=options.timeoutMs??30_000;
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>120_000)throw new Error("Benchmark timeout must be between 1 and 120000 ms.");
 const candidateIds=new Set<string>();
 for(const candidate of options.candidates){
  if(candidate.enabled!==true)throw new Error("Every benchmark candidate must be explicitly enabled.");
  if(typeof candidate.candidateId!=="string"||!candidate.candidateId.trim()||candidate.candidateId.length>120||candidateIds.has(candidate.candidateId))throw new Error("Candidate IDs must be non-empty, at most 120 characters, and unique.");
  if(!candidate.adapter||typeof candidate.adapter.transcribe!=="function")throw new Error("Every benchmark candidate must provide a transcription adapter.");
  candidateIds.add(candidate.candidateId);
 }
 const sampleIds=new Set<string>();
 for(const sample of options.samples){
  const parsedSample=gabrooSpeechBenchmarkSampleSchema.safeParse(sample);
  if(!parsedSample.success)throw new Error("Every benchmark sample must match the validated manifest schema.");
  if(sampleIds.has(sample.sampleId))throw new Error("Benchmark sample IDs must be unique.");
  sampleIds.add(sample.sampleId);
 }
 const selected=options.samples.filter(sample=>options.includeTuningSamples===true||sample.split==="held_out");
 const results:SpeechBenchmarkResult[]=[];
 let attempted=0,skipped=0;
 for(const sample of selected){
  if(options.signal?.aborted){skipped+=options.candidates.length;continue;}
  let audio:Uint8Array;
  try{
   audio=await options.loadAudio(sample,options.signal);
   if(options.signal?.aborted){skipped+=options.candidates.length;continue;}
   validateGabrooBenchmarkAudio(sample,audio);
  }catch{
   for(const candidate of options.candidates){
    attempted++;
    results.push({candidateId:candidate.candidateId,sampleId:sample.sampleId,mode:sample.mode,environment:sample.environment,status:"failure",referenceText:sample.referenceText,audioSeconds:sample.durationMs/1000});
   }
   continue;
  }
  for(const candidate of options.candidates){
   if(options.signal?.aborted){skipped++;continue;}
   attempted++;
   const controller=new AbortController();
   const abort=()=>controller.abort();
   let onCancel=()=>{controller.abort();};
   options.signal?.addEventListener("abort",abort,{once:true});
   let timeout:ReturnType<typeof setTimeout>|undefined;
   const started=Date.now();
   try{
    const cancellation=options.signal?new Promise<never>((_,reject)=>{
     if(options.signal?.aborted){reject(new Error("cancelled"));return;}
     onCancel=()=>{controller.abort();reject(new Error("cancelled"));};
     options.signal?.addEventListener("abort",onCancel,{once:true});
    }):new Promise<never>(()=>{});
    const response=await Promise.race([
     candidate.adapter.transcribe({audio:new Uint8Array(audio),mimeType:sample.mimeType,mode:sample.mode,signal:controller.signal}),
     new Promise<never>((_,reject)=>{timeout=setTimeout(()=>{controller.abort();reject(new Error("timeout"));},timeoutMs);}),
     cancellation
    ]);
    const latencyMs=Date.now()-started;
    if(typeof response?.text!=="string"||response.text.trim().length===0)throw new Error("empty transcript");
    const cost=candidate.estimateCost?.(sample.durationMs/1000);
    if(cost!==undefined&&(!Number.isFinite(cost)||cost<0))throw new Error("invalid cost estimate");
    results.push({candidateId:candidate.candidateId,sampleId:sample.sampleId,mode:sample.mode,environment:sample.environment,status:"success",referenceText:sample.referenceText,transcript:response.text,latencyMs,audioSeconds:sample.durationMs/1000,...(cost===undefined?{}:{estimatedCost:cost})});
   }catch{
    results.push({candidateId:candidate.candidateId,sampleId:sample.sampleId,mode:sample.mode,environment:sample.environment,status:"failure",referenceText:sample.referenceText,audioSeconds:sample.durationMs/1000});
   }finally{
    if(timeout)clearTimeout(timeout);
    options.signal?.removeEventListener("abort",abort);
    options.signal?.removeEventListener("abort",onCancel);
   }
  }
 }
 return {results,jsonl:results.map(result=>JSON.stringify(result)).join("\n"),attempted,completed:results.length,skipped};
}
