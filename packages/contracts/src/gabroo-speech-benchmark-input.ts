import {z} from "zod";
import {gabrooRecognitionLanguageSchema} from "./gabroo-recognition.js";

export const gabrooSpeechBenchmarkResultSchema=z.object({
 candidateId:z.string().trim().min(1).max(120),
 sampleId:z.string().trim().min(1).max(160),
 mode:gabrooRecognitionLanguageSchema,
 environment:z.enum(["quiet","moderate_noise"]),
 status:z.enum(["success","failure"]),
 referenceText:z.string().min(1).max(12000),
 transcript:z.string().max(12000).optional(),
 latencyMs:z.number().finite().nonnegative().optional(),
 audioSeconds:z.number().finite().positive(),
 estimatedCost:z.number().finite().nonnegative().optional()
}).strict().superRefine((value,ctx)=>{
 if(value.status==="success"){
  if(!value.transcript?.trim())ctx.addIssue({code:"custom",path:["transcript"],message:"Successful results require a non-empty transcript."});
  if(value.latencyMs===undefined)ctx.addIssue({code:"custom",path:["latencyMs"],message:"Successful results require latencyMs."});
 }else if(value.transcript!==undefined){
  ctx.addIssue({code:"custom",path:["transcript"],message:"Failed results must not include transcript output."});
 }
});
export type ValidatedSpeechBenchmarkResult=z.infer<typeof gabrooSpeechBenchmarkResultSchema>;

export interface SpeechBenchmarkJsonlIssue {
 line:number;
 message:string;
}

/**
 * Parse a local JSONL text export. The caller is responsible for reading the
 * file from approved local storage; this function never accesses the file
 * system, audio, network or provider credentials.
 */
export function parseSpeechBenchmarkJsonl(source:string):{
 results:ValidatedSpeechBenchmarkResult[];
 issues:SpeechBenchmarkJsonlIssue[];
}{
 if(typeof source!=="string")throw new TypeError("Benchmark JSONL source must be text.");
 const results:ValidatedSpeechBenchmarkResult[]=[];
 const issues:SpeechBenchmarkJsonlIssue[]=[];
 const lines=source.split(/\r?\n/u);
 const seen=new Set<string>();
 for(let index=0;index<lines.length;index++){
  const line=lines[index].trim();
  if(!line)continue;
  let parsed:unknown;
  try{parsed=JSON.parse(line);}
  catch{issues.push({line:index+1,message:"Invalid JSON."});continue;}
  const result=gabrooSpeechBenchmarkResultSchema.safeParse(parsed);
  if(!result.success){
   issues.push({line:index+1,message:result.error.issues.map(issue=>issue.path.join(".")+": "+issue.message).join("; ")});
   continue;
  }
  const identity=result.data.candidateId+"\\u0000"+result.data.sampleId;
  if(seen.has(identity)){
   issues.push({line:index+1,message:"Duplicate candidate/sample result."});
   continue;
  }
  seen.add(identity);
  results.push(result.data);
 }
 return {results,issues};
}
