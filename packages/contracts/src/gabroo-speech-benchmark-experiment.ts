import {z} from "zod";

const safeSettingSchema=z.object({
 key:z.string().trim().min(1).max(80).regex(/^[a-zA-Z][a-zA-Z0-9_.-]*$/u),
 value:z.union([z.string().max(240),z.number().finite(),z.boolean()])
}).strict().superRefine((setting,ctx)=>{
 if(/(api.?key|secret|token|authorization|password|credential|cookie|email|phone|user.?id|speaker.?id)/iu.test(setting.key)){
  ctx.addIssue({code:"custom",path:["key"],message:"Sensitive or identifying setting keys are not allowed."});
 }
 if(typeof setting.value==="string"&&/(bearer\s|sk-[a-z0-9]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/iu.test(setting.value)){
  ctx.addIssue({code:"custom",path:["value"],message:"Credential-like values are not allowed."});
 }
});

export const gabrooSpeechBenchmarkExperimentSchema=z.object({
 experimentId:z.string().trim().min(1).max(120),
 startedAt:z.string().datetime({offset:true}),
 corpusVersion:z.string().trim().min(1).max(120),
 corpusSha256:z.string().regex(/^[a-f0-9]{64}$/u),
 sampleCount:z.number().int().positive().max(100_000),
 split:z.enum(["held_out","tuning"]),
 operatorLabel:z.string().trim().min(1).max(80),
 candidates:z.array(z.object({
  candidateId:z.string().trim().min(1).max(120),
  providerName:z.string().trim().min(1).max(120),
  modelVersion:z.string().trim().min(1).max(160),
  region:z.string().trim().min(1).max(80),
  settings:z.array(safeSettingSchema).max(40)
 }).strict()).min(1).max(20),
 notes:z.string().max(1000).optional()
}).strict().superRefine((experiment,ctx)=>{
 const ids=new Set<string>();
 for(const [index,candidate] of experiment.candidates.entries()){
  if(ids.has(candidate.candidateId))ctx.addIssue({code:"custom",path:["candidates",index,"candidateId"],message:"Candidate IDs must be unique within an experiment."});
  ids.add(candidate.candidateId);
  const keys=new Set<string>();
  for(const [settingIndex,setting] of candidate.settings.entries()){
   if(keys.has(setting.key))ctx.addIssue({code:"custom",path:["candidates",index,"settings",settingIndex,"key"],message:"Setting keys must be unique per candidate."});
   keys.add(setting.key);
  }
 }
});
export type GabrooSpeechBenchmarkExperiment=z.infer<typeof gabrooSpeechBenchmarkExperimentSchema>;

export function parseGabrooSpeechBenchmarkExperiment(source:string):GabrooSpeechBenchmarkExperiment{
 let value:unknown;
 try{value=JSON.parse(source);}catch{throw new Error("Experiment metadata must be valid JSON.");}
 const parsed=gabrooSpeechBenchmarkExperimentSchema.safeParse(value);
 if(!parsed.success)throw new Error("Invalid experiment metadata: "+parsed.error.issues.map(issue=>issue.path.join(".")+": "+issue.message).join("; "));
 return parsed.data;
}

/** Verify candidates were evaluated on the exact same sample IDs in each mode/environment. */
export function assertComparableSpeechBenchmarkResults(results:{candidateId:string;sampleId:string;mode:string;environment:string}[]):void{
 if(!Array.isArray(results)||results.length===0)throw new Error("At least one result is required for comparison.");
 const groups=new Map<string,Map<string,Set<string>>>();
 for(const result of results){
  const dimension=JSON.stringify([result.mode,result.environment]);
  const candidates=groups.get(dimension)??new Map<string,Set<string>>();
  const samples=candidates.get(result.candidateId)??new Set<string>();
  if(samples.has(result.sampleId))throw new Error("Duplicate sample result for candidate "+result.candidateId+".");
  samples.add(result.sampleId);candidates.set(result.candidateId,samples);groups.set(dimension,candidates);
 }
 for(const candidates of groups.values()){
  const sets=[...candidates.values()];
  if(sets.length<2)continue;
  const expected=[...sets[0]].sort();
  for(const actualSet of sets.slice(1)){
   const actual=[...actualSet].sort();
   if(expected.length!==actual.length||expected.some((sample,index)=>sample!==actual[index])){
    throw new Error("Candidate results are not comparable: sample sets differ.");
   }
  }
 }
}
