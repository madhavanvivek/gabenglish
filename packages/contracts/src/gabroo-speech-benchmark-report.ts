import {scoreSpeechTranscript} from "./gabroo-speech-metrics.js";
import type {GabrooRecognitionLanguage} from "./gabroo-recognition.js";

export interface SpeechBenchmarkResult {
 candidateId:string;
 sampleId:string;
 mode:GabrooRecognitionLanguage;
 environment:"quiet"|"moderate_noise";
 status:"success"|"failure";
 referenceText:string;
 transcript?:string;
 latencyMs?:number;
 audioSeconds:number;
 estimatedCost?:number;
}

export interface SpeechBenchmarkGroupReport {
 candidateId:string;
 mode:GabrooRecognitionLanguage;
 environment:"quiet"|"moderate_noise";
 samples:number;
 successes:number;
 failures:number;
 successRate:number;
 wordErrorRate:number;
 characterErrorRate:number;
 medianLatencyMs:number|null;
 p95LatencyMs:number|null;
 totalAudioSeconds:number;
 estimatedCost:number|null;
}

function percentile(values:number[],p:number):number|null{
 if(values.length===0)return null;
 const sorted=[...values].sort((a,b)=>a-b);
 return sorted[Math.max(0,Math.ceil(p*sorted.length)-1)];
}

function requiredText(value:string,label:string):string{
 if(typeof value!=="string"||value.trim().length===0)throw new Error(label+" must be a non-empty string.");
 return value;
}

/**
 * Aggregate offline provider results into comparable candidate/mode/environment
 * groups. Failed requests remain in the success-rate denominator; transcript
 * error rates are calculated only over successful responses and weighted by
 * reference token/character counts.
 */
export function buildSpeechBenchmarkReport(results:SpeechBenchmarkResult[]):SpeechBenchmarkGroupReport[]{
 if(!Array.isArray(results)||results.length===0)throw new Error("At least one benchmark result is required.");
 const seen=new Set<string>();
 const groups=new Map<string,SpeechBenchmarkResult[]>();
 for(const result of results){
  requiredText(result.candidateId,"candidateId");
  requiredText(result.sampleId,"sampleId");
  requiredText(result.referenceText,"referenceText");
  if(!["ml-IN","en-IN","ml-en"].includes(result.mode))throw new Error("Unsupported recognition mode.");
  if(!["quiet","moderate_noise"].includes(result.environment))throw new Error("Unsupported audio environment.");
  if(!["success","failure"].includes(result.status))throw new Error("Unsupported request status.");
  if(!Number.isFinite(result.audioSeconds)||result.audioSeconds<=0)throw new Error("audioSeconds must be positive.");
  if(result.status==="success"){
   requiredText(result.transcript??"","Successful results require a transcript.");
   if(!Number.isFinite(result.latencyMs)||result.latencyMs!<0)throw new Error("Successful results require a non-negative latencyMs.");
  }else if(result.transcript!==undefined){
   throw new Error("Failed results must not contain a transcript.");
  }
  if(result.estimatedCost!==undefined&&(!Number.isFinite(result.estimatedCost)||result.estimatedCost<0))throw new Error("estimatedCost must be non-negative.");
  const identity=result.candidateId+"\u0000"+result.sampleId;
  if(seen.has(identity))throw new Error("Duplicate candidate/sample result: "+result.candidateId+"/"+result.sampleId);
  seen.add(identity);
  const key=[result.candidateId,result.mode,result.environment].join("\u0000");
  const bucket=groups.get(key)??[];
  bucket.push(result);groups.set(key,bucket);
 }
 return [...groups.values()].map(bucket=>{
  const first=bucket[0];
  const successful=bucket.filter(x=>x.status==="success");
  const latencies=successful.map(x=>x.latencyMs as number);
  let wordErrors=0,wordReference=0,charErrors=0,charReference=0;
  for(const result of successful){
   const score=scoreSpeechTranscript(result.referenceText,result.transcript as string);
   wordErrors+=score.substitutions+score.deletions+score.insertions;
   wordReference+=score.referenceWords;
   charErrors+=score.characterSubstitutions+score.characterDeletions+score.characterInsertions;
   charReference+=score.referenceCharacters;
  }
  const costs=bucket.map(x=>x.estimatedCost).filter((x):x is number=>x!==undefined);
  return {
   candidateId:first.candidateId,mode:first.mode,environment:first.environment,
   samples:bucket.length,successes:successful.length,failures:bucket.length-successful.length,
   successRate:successful.length/bucket.length,
   wordErrorRate:wordReference?wordErrors/wordReference:0,
   characterErrorRate:charReference?charErrors/charReference:0,
   medianLatencyMs:percentile(latencies,0.5),p95LatencyMs:percentile(latencies,0.95),
   totalAudioSeconds:bucket.reduce((sum,x)=>sum+x.audioSeconds,0),
   estimatedCost:costs.length===bucket.length?costs.reduce((sum,x)=>sum+x,0):null
  };
 }).sort((a,b)=>a.candidateId.localeCompare(b.candidateId)||a.mode.localeCompare(b.mode)||a.environment.localeCompare(b.environment));
}
