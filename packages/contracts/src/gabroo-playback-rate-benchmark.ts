import {z} from "zod";
import {GABROO_SPEECH_RATE_MIN,GABROO_SPEECH_RATE_MAX,GABROO_SPEECH_RATE_STEP,gabrooSpeechRateSchema} from "./gabroo-speech.js";

export const GABROO_PLAYBACK_RATE_TEST_POINTS=[0.75,0.85,1,1.15,1.3,1.5] as const;
const rating=z.number().int().min(1).max(5);
export const gabrooPlaybackRateTrialSchema=z.object({
 trialId:z.string().trim().min(1).max(80),blindCode:z.enum(["VOICE-01","VOICE-02","VOICE-03"]),
 device:z.string().trim().min(1).max(120),networkProfile:z.enum(["wifi","mobile_4g","mobile_5g","other"]),
 requestedRate:gabrooSpeechRateSchema,appliedRate:gabrooSpeechRateSchema,
 playbackMethod:z.enum(["client_rate_adjustment","provider_resynthesis"]),
 intelligibility:rating,naturalness:rating,
 audibleArtifacts:z.array(z.enum(["pitch_distortion","chipmunk_effect","robotic_artifact","choppy_audio","clipped_audio","volume_pumping","other"])).max(7),
 completed:z.boolean(),notes:z.string().max(500).optional()
}).strict().superRefine((trial,ctx)=>{
 if(Math.abs(trial.requestedRate-trial.appliedRate)>1e-8)ctx.addIssue({code:"custom",path:["appliedRate"],message:"Applied playback rate must match the requested learner setting."});
});
export type GabrooPlaybackRateTrial=z.infer<typeof gabrooPlaybackRateTrialSchema>;
export interface GabrooPlaybackRateSummary {blindCode:"VOICE-01"|"VOICE-02"|"VOICE-03";rate:number;trialCount:number;completedCount:number;meanIntelligibility:number;meanNaturalness:number;artifactCount:number;clientRateTrials:number;providerResynthesisTrials:number;}
/** Aggregate actual learner playback-rate trials without treating a re-synthesized take as client rate control. */
export function summarizeGabrooPlaybackRateTrials(trials:GabrooPlaybackRateTrial[]):GabrooPlaybackRateSummary[]{
 if(!Array.isArray(trials)||trials.length===0)throw new Error("At least one playback-rate trial is required.");
 const ids=new Set<string>();const groups=new Map<string,GabrooPlaybackRateTrial[]>();
 for(const trial of trials){const parsed=gabrooPlaybackRateTrialSchema.safeParse(trial);if(!parsed.success)throw new Error("Invalid playback-rate trial: "+parsed.error.issues.map(x=>x.path.join(".")+": "+x.message).join("; "));
  if(ids.has(trial.trialId))throw new Error("Duplicate playback-rate trial ID.");ids.add(trial.trialId);
  const key=trial.blindCode+"|"+trial.appliedRate;const bucket=groups.get(key)??[];bucket.push(trial);groups.set(key,bucket);
 }
 return [...groups.values()].map(items=>({blindCode:items[0].blindCode,rate:items[0].appliedRate,trialCount:items.length,
  completedCount:items.filter(x=>x.completed).length,meanIntelligibility:Number((items.reduce((s,x)=>s+x.intelligibility,0)/items.length).toFixed(2)),
  meanNaturalness:Number((items.reduce((s,x)=>s+x.naturalness,0)/items.length).toFixed(2)),
  artifactCount:items.reduce((s,x)=>s+x.audibleArtifacts.length,0),
  clientRateTrials:items.filter(x=>x.playbackMethod==="client_rate_adjustment").length,
  providerResynthesisTrials:items.filter(x=>x.playbackMethod==="provider_resynthesis").length
 })).sort((a,b)=>a.blindCode.localeCompare(b.blindCode)||a.rate-b.rate);
}
export const GABROO_PLAYBACK_RATE_LIMITS={min:GABROO_SPEECH_RATE_MIN,max:GABROO_SPEECH_RATE_MAX,step:GABROO_SPEECH_RATE_STEP} as const;