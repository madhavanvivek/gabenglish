import {z} from "zod";
import {summarizeGabrooVoiceAuditions,type GabrooVoiceAuditionReview} from "./gabroo-voice-audition.js";
import {summarizeGabrooVoiceTechnicalEvidence,type GabrooVoiceTechnicalEvidence} from "./gabroo-voice-technical-evidence.js";
import {GABROO_PLAYBACK_RATE_TEST_POINTS,summarizeGabrooPlaybackRateTrials,type GabrooPlaybackRateTrial,type GabrooPlaybackRateSummary} from "./gabroo-playback-rate-benchmark.js";

export const GABROO_VOICE_AUDITION_BLIND_CODES=["VOICE-01","VOICE-02","VOICE-03"] as const;
export interface GabrooVoiceAuditionComparisonRow {
 blindCode:typeof GABROO_VOICE_AUDITION_BLIND_CODES[number];
 reviewerCount:number;meanWeightedScore:number|null;scoreRange:{min:number;max:number}|null;
 humanRejectionGates:string[];technicalTrialCount:number|null;
 medianFirstAudioLatencyMs:number|null;p95FirstAudioLatencyMs:number|null;
 medianFullResponseLatencyMs:number|null;p95FullResponseLatencyMs:number|null;
 failureRatePercent:number|null;streamingStabilityRatePercent:number|null;
 slowPlaybackMeanRating:number|null;estimatedCostPerAudioMinuteInr:number|null;
 commercialRights:"verified"|"pending"|"rejected"|"not_submitted";
 dataRetentionTerms:"verified"|"pending"|"rejected"|"not_submitted";
 modelTrainingTerms:"verified"|"pending"|"rejected"|"not_submitted";
 playbackRateEvidenceComplete:boolean;playbackRateSummaries:GabrooPlaybackRateSummary[];\n reviewerEvidenceComplete:boolean;technicalEvidenceComplete:boolean;eligibleForOwnerReview:boolean;
}


/** Playback evidence is complete only when every standard speed has a client-side trial. */
function summarizePlaybackEvidence(trials:GabrooPlaybackRateTrial[]):GabrooPlaybackRateSummary[]{
 if(trials.length===0)return [];
 return summarizeGabrooPlaybackRateTrials(trials);
}
\n/** Combines blind listener, technical and playback-rate evidence without ranking or selecting a voice. */
export function buildGabrooVoiceAuditionComparison(
 reviews:GabrooVoiceAuditionReview[],technicalEvidence:GabrooVoiceTechnicalEvidence[]
):GabrooVoiceAuditionComparisonRow[]{
 if(!Array.isArray(reviews)||!Array.isArray(technicalEvidence))throw new Error("Voice audition evidence must be supplied as arrays.");
 const human=reviews.length?summarizeGabrooVoiceAuditions(reviews):[];
 const technical=technicalEvidence.map(item=>summarizeGabrooVoiceTechnicalEvidence(item));\n const playback=summarizePlaybackEvidence(playbackRateTrials);
 const seen=new Set<string>();
 for(const item of technical){if(seen.has(item.blindCode))throw new Error("Duplicate technical evidence for blind candidate.");seen.add(item.blindCode);}
 const humanByCode=new Map(human.map(x=>[x.blindCode,x]));
 const technicalByCode=new Map(technical.map(x=>[x.blindCode,x]));
 return GABROO_VOICE_AUDITION_BLIND_CODES.map(blindCode=>{
  const h=humanByCode.get(blindCode),t=technicalByCode.get(blindCode),playbackRows=playback.filter(x=>x.blindCode===blindCode),
   rights=t?.commercialRights??"not_submitted",retention=t?.dataRetentionTerms??"not_submitted",training=t?.modelTrainingTerms??"not_submitted";
  const reviewerEvidenceComplete=Boolean(h&&h.reviewerCount>=3&&h.rejectionGates.length===0);
  const technicalEvidenceComplete=Boolean(t?.eligibleForOwnerReview);
  return {blindCode,reviewerCount:h?.reviewerCount??0,meanWeightedScore:h?.meanWeightedScore??null,
   scoreRange:h?.scoreRange??null,humanRejectionGates:h?.rejectionGates??[],
   technicalTrialCount:t?.trialCount??null,medianFirstAudioLatencyMs:t?.medianFirstAudioLatencyMs??null,
   p95FirstAudioLatencyMs:t?.p95FirstAudioLatencyMs??null,medianFullResponseLatencyMs:t?.medianFullResponseLatencyMs??null,
   p95FullResponseLatencyMs:t?.p95FullResponseLatencyMs??null,failureRatePercent:t?.failureRatePercent??null,
   streamingStabilityRatePercent:t?.streamingStabilityRatePercent??null,slowPlaybackMeanRating:t?.slowPlaybackMeanRating??null,
   estimatedCostPerAudioMinuteInr:t?.estimatedCostPerAudioMinuteInr??null,
   commercialRights:rights,dataRetentionTerms:retention,modelTrainingTerms:training,
   playbackRateEvidenceComplete:GABROO_PLAYBACK_RATE_TEST_POINTS.every(rate=>playbackRows.some(x=>x.rate===rate&&x.clientRateTrials>0)),\n   playbackRateSummaries:playbackRows,reviewerEvidenceComplete,technicalEvidenceComplete,eligibleForOwnerReview:reviewerEvidenceComplete&&technicalEvidenceComplete
  };
 });
}

export const gabrooVoiceOwnerDecisionSchema=z.object({
 status:z.enum(["pending","approved","rejected"]),
 blindCode:z.enum(GABROO_VOICE_AUDITION_BLIND_CODES).optional(),
 decisionOwner:z.string().trim().min(1).max(120),
 rationale:z.string().trim().min(20).max(2000),
 reviewedEvidenceReferences:z.array(z.string().trim().min(1).max(300)).min(1).max(30),
 decidedAt:z.string().datetime({offset:true}).optional()
}).strict().superRefine((decision,ctx)=>{
 if(decision.status==="pending"&&decision.decidedAt!==undefined)ctx.addIssue({code:"custom",path:["decidedAt"],message:"Pending decisions cannot have a decision timestamp."});
 if(decision.status!=="pending"&&(!decision.blindCode||!decision.decidedAt))ctx.addIssue({code:"custom",path:["blindCode"],message:"Approved or rejected decisions require a candidate and decision timestamp."});
});
export type GabrooVoiceOwnerDecision=z.infer<typeof gabrooVoiceOwnerDecisionSchema>;