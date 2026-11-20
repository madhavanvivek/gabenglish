import {z} from "zod";

export const GABROO_VOICE_AUDITION_DIMENSIONS = [
 {key:"keralaMalayalamAuthenticity",label:"Kerala Malayalam authenticity",weight:15},
 {key:"malayalamPronunciation",label:"Malayalam pronunciation and naturalness",weight:15},
 {key:"codeSwitching",label:"Malayalam-English code-switching",weight:12},
 {key:"englishTeachingClarity",label:"English teaching clarity",weight:10},
 {key:"warmthRespect",label:"Warmth, respect and friendliness",weight:10},
 {key:"energyPersonality",label:"Energy and personality",weight:8},
 {key:"gentleHumour",label:"Gentle humour without teasing harm",weight:6},
 {key:"emotionalRange",label:"Emotional range and patience",weight:6},
 {key:"longSessionComfort",label:"Long-session comfort",weight:10},
 {key:"slowSpeedIntelligibility",label:"Slow-speed intelligibility",weight:8}
] as const;

export const GABROO_VOICE_AUDITION_REJECTION_GATES = [
 "disrespectful_or_patronising",
 "overfamiliar_address",
 "caricatured_or_unnatural_malayalam",
 "meaning_changing_pronunciation_or_codeswitch",
 "tiring_harsh_childish_or_aggressive",
 "unintelligible_at_slow_speed",
 "unacceptable_commercial_or_privacy_terms"
] as const;

const rating=z.number().int().min(1).max(5);
const ratingsSchema=z.object({
 keralaMalayalamAuthenticity:rating,malayalamPronunciation:rating,codeSwitching:rating,
 englishTeachingClarity:rating,warmthRespect:rating,energyPersonality:rating,
 gentleHumour:rating,emotionalRange:rating,longSessionComfort:rating,
 slowSpeedIntelligibility:rating
}).strict();

export const gabrooVoiceAuditionReviewSchema=z.object({
 blindCode:z.enum(["VOICE-01","VOICE-02","VOICE-03"]),
 reviewerLabel:z.string().trim().min(1).max(80),
 ratings:ratingsSchema,
 rejectionGates:z.array(z.enum(GABROO_VOICE_AUDITION_REJECTION_GATES)).max(7),
 evidenceNotes:z.string().max(1200).optional()
}).strict();

export type GabrooVoiceAuditionReview=z.infer<typeof gabrooVoiceAuditionReviewSchema>;
export interface GabrooVoiceAuditionCandidateSummary {
 blindCode:"VOICE-01"|"VOICE-02"|"VOICE-03";
 reviewerCount:number;
 weightedScoresByReviewer:{reviewerLabel:string;score:number}[];
 meanWeightedScore:number|null;
 scoreRange:{min:number;max:number}|null;
 rejectionGates:string[];
 eligibleForOwnerReview:boolean;
}

const WEIGHTS=Object.fromEntries(GABROO_VOICE_AUDITION_DIMENSIONS.map(x=>[x.key,x.weight])) as Record<keyof GabrooVoiceAuditionReview["ratings"],number>;

/** Calculate independent scorecards. This never ranks candidates or approves a voice. */
export function summarizeGabrooVoiceAuditions(reviews:GabrooVoiceAuditionReview[]):GabrooVoiceAuditionCandidateSummary[]{
 if(!Array.isArray(reviews)||reviews.length===0)throw new Error("At least one blind audition review is required.");
 const seen=new Set<string>();
 const groups=new Map<string,GabrooVoiceAuditionReview[]>();
 for(const review of reviews){
  const parsed=gabrooVoiceAuditionReviewSchema.safeParse(review);
  if(!parsed.success)throw new Error("Invalid voice audition review: "+parsed.error.issues.map(x=>x.path.join(".")+": "+x.message).join("; "));
  const identity=review.blindCode+"|"+review.reviewerLabel;
  if(seen.has(identity))throw new Error("Duplicate reviewer scorecard for blind candidate.");
  seen.add(identity);
  const bucket=groups.get(review.blindCode)??[];bucket.push(review);groups.set(review.blindCode,bucket);
 }
 return [...groups.entries()].map(([blindCode,items])=>{
  const weightedScoresByReviewer=items.map(review=>({
   reviewerLabel:review.reviewerLabel,
   score:Number(GABROO_VOICE_AUDITION_DIMENSIONS.reduce((sum,dimension)=>sum+(review.ratings[dimension.key]/5)*WEIGHTS[dimension.key],0).toFixed(2))
  })).sort((a,b)=>a.reviewerLabel.localeCompare(b.reviewerLabel));
  const scores=weightedScoresByReviewer.map(x=>x.score);
  const rejectionGates=[...new Set(items.flatMap(x=>x.rejectionGates))].sort();
  return {
   blindCode:blindCode as GabrooVoiceAuditionCandidateSummary["blindCode"],
   reviewerCount:items.length,weightedScoresByReviewer,
   meanWeightedScore:scores.length?Number((scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(2)):null,
   scoreRange:scores.length?{min:Math.min(...scores),max:Math.max(...scores)}:null,
   rejectionGates,eligibleForOwnerReview:items.length>=3&&rejectionGates.length===0
  };
 }).sort((a,b)=>a.blindCode.localeCompare(b.blindCode));
}
