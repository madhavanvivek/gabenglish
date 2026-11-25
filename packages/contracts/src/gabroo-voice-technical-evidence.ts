import {z} from "zod";

export const gabrooVoiceTechnicalTrialSchema=z.object({
 trialId:z.string().trim().min(1).max(80),device:z.string().trim().min(1).max(120),
 networkProfile:z.enum(["wifi","mobile_4g","mobile_5g","other"]),
 firstAudioLatencyMs:z.number().int().min(0).max(120000),
 fullResponseLatencyMs:z.number().int().min(0).max(300000),
 interruptedPlaybackRecovered:z.boolean(),streamingStable:z.boolean(),
 playbackRate:z.number().min(0.5).max(1.5),slowPlaybackNaturalness:z.number().int().min(1).max(5),
 failed:z.boolean()
}).strict().superRefine((trial,ctx)=>{
 if(trial.fullResponseLatencyMs<trial.firstAudioLatencyMs)ctx.addIssue({code:"custom",path:["fullResponseLatencyMs"],message:"Full response latency cannot be lower than first-audio latency."});
});

export const gabrooVoiceTechnicalEvidenceSchema=z.object({
 blindCode:z.enum(["VOICE-01","VOICE-02","VOICE-03"]),
 providerName:z.string().trim().min(1).max(120),voiceId:z.string().trim().min(1).max(160),
 modelVersion:z.string().trim().min(1).max(120),locale:z.string().trim().min(2).max(32),
 processingRegion:z.string().trim().min(2).max(120),
 commercialRights:z.enum(["verified","pending","rejected"]),
 dataRetentionTerms:z.enum(["verified","pending","rejected"]),
 modelTrainingTerms:z.enum(["verified","pending","rejected"]),
 evidenceReferences:z.array(z.string().trim().min(1).max(300)).max(20),
 estimatedCostPerAudioMinuteInr:z.number().min(0).nullable(),
 estimatedDailyAudioMinutes:z.number().min(0).max(1440).nullable(),
 trials:z.array(gabrooVoiceTechnicalTrialSchema).min(1).max(100),
 recordedAt:z.string().datetime({offset:true}),
 notes:z.string().max(2000).optional()
}).strict().superRefine((evidence,ctx)=>{
 const seenTrialIds=new Set<string>();
 evidence.trials.forEach((trial,index)=>{
  if(seenTrialIds.has(trial.trialId)){
   ctx.addIssue({code:"custom",path:["trials",index,"trialId"],message:"Trial IDs must be unique; repeated measurements cannot count as independent trials."});
  }
  seenTrialIds.add(trial.trialId);
 });
});

export type GabrooVoiceTechnicalEvidence=z.infer<typeof gabrooVoiceTechnicalEvidenceSchema>;
export interface GabrooVoiceTechnicalSummary {
 blindCode:"VOICE-01"|"VOICE-02"|"VOICE-03";trialCount:number;failureRatePercent:number;
 medianFirstAudioLatencyMs:number;p95FirstAudioLatencyMs:number;
 medianFullResponseLatencyMs:number;p95FullResponseLatencyMs:number;
 interruptionRecoveryRatePercent:number;streamingStabilityRatePercent:number;
 slowPlaybackMeanRating:number;estimatedCostPerAudioMinuteInr:number|null;
 estimatedDailyAudioMinutes:number|null;commercialRights:GabrooVoiceTechnicalEvidence["commercialRights"];
 dataRetentionTerms:GabrooVoiceTechnicalEvidence["dataRetentionTerms"];
 modelTrainingTerms:GabrooVoiceTechnicalEvidence["modelTrainingTerms"];
 evidenceComplete:boolean;eligibleForOwnerReview:boolean;
}
const percentile=(values:number[],p:number)=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.max(0,Math.ceil(sorted.length*p)-1)];};
const median=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);const middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;};

/** Summarize measured trials. Readiness is evidence completeness, never provider approval. */
export function summarizeGabrooVoiceTechnicalEvidence(input:GabrooVoiceTechnicalEvidence):GabrooVoiceTechnicalSummary{
 const parsed=gabrooVoiceTechnicalEvidenceSchema.safeParse(input);
 if(!parsed.success)throw new Error("Invalid voice technical evidence: "+parsed.error.issues.map(x=>x.path.join(".")+": "+x.message).join("; "));
 const value=parsed.data,trials=value.trials;
 const first=trials.map(x=>x.firstAudioLatencyMs),full=trials.map(x=>x.fullResponseLatencyMs);
 const evidenceComplete=value.evidenceReferences.length>0&&value.commercialRights==="verified"&&value.dataRetentionTerms==="verified"&&value.modelTrainingTerms==="verified"&&trials.length>=5&&trials.every(x=>x.slowPlaybackNaturalness>=3);
 return {blindCode:value.blindCode,trialCount:trials.length,
  failureRatePercent:Number((trials.filter(x=>x.failed).length/trials.length*100).toFixed(2)),
  medianFirstAudioLatencyMs:median(first),p95FirstAudioLatencyMs:percentile(first,0.95),
  medianFullResponseLatencyMs:median(full),p95FullResponseLatencyMs:percentile(full,0.95),
  interruptionRecoveryRatePercent:Number((trials.filter(x=>x.interruptedPlaybackRecovered).length/trials.length*100).toFixed(2)),
  streamingStabilityRatePercent:Number((trials.filter(x=>x.streamingStable).length/trials.length*100).toFixed(2)),
  slowPlaybackMeanRating:Number((trials.reduce((sum,x)=>sum+x.slowPlaybackNaturalness,0)/trials.length).toFixed(2)),
  estimatedCostPerAudioMinuteInr:value.estimatedCostPerAudioMinuteInr,estimatedDailyAudioMinutes:value.estimatedDailyAudioMinutes,
  commercialRights:value.commercialRights,dataRetentionTerms:value.dataRetentionTerms,modelTrainingTerms:value.modelTrainingTerms,
  evidenceComplete,eligibleForOwnerReview:evidenceComplete
 };
}