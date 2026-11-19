import {z} from "zod";

const ratingSchema=z.number().int().min(1).max(5);
export const gabrooSpeechHumanReviewSchema=z.object({
 candidateId:z.string().trim().min(1).max(120),
 sampleId:z.string().trim().min(1).max(160),
 mode:z.enum(["ml-IN","en-IN","ml-en"]),
 environment:z.enum(["quiet","moderate_noise"]),
 reviewerLabel:z.string().trim().min(1).max(80),
 meaningPreservation:ratingSchema,
 contentCompleteness:ratingSchema,
 languageFidelity:ratingSchema,
 codeSwitchHandling:ratingSchema.optional(),
 readability:ratingSchema,
 intelligibility:ratingSchema,
 issueTags:z.array(z.enum([
  "meaning_changed","key_content_omitted","hallucinated_words",
  "malayalam_script_error","english_span_error","code_switch_lost",
  "number_or_name_error","unintelligible","other"
 ])).max(12),
 notes:z.string().max(500).optional()
}).strict().superRefine((review,ctx)=>{
 if(review.mode==="ml-en"&&review.codeSwitchHandling===undefined){
  ctx.addIssue({code:"custom",path:["codeSwitchHandling"],message:"Mixed-language reviews require a code-switch handling rating."});
 }
 if(review.mode!=="ml-en"&&review.codeSwitchHandling!==undefined){
  ctx.addIssue({code:"custom",path:["codeSwitchHandling"],message:"Code-switch handling rating is only applicable to mixed-language reviews."});
 }
});
export type GabrooSpeechHumanReview=z.infer<typeof gabrooSpeechHumanReviewSchema>;

export interface GabrooSpeechHumanReviewSummary{
 candidateId:string;mode:"ml-IN"|"en-IN"|"ml-en";environment:"quiet"|"moderate_noise";
 reviewedSamples:number;reviewCount:number;reviewerCount:number;
 meanMeaningPreservation:number;meanContentCompleteness:number;meanLanguageFidelity:number;meanCodeSwitchHandling:number|null;
 meanReadability:number;meanIntelligibility:number;
 samplesNeedingAdjudication:string[];
}

/** Aggregate independent ratings; never infer a winner or replace reviewer adjudication. */
export function summarizeGabrooSpeechHumanReviews(reviews:GabrooSpeechHumanReview[]):GabrooSpeechHumanReviewSummary[]{
 if(!Array.isArray(reviews)||reviews.length===0)throw new Error("At least one human review is required.");
 const seen=new Set<string>();
 const groups=new Map<string,GabrooSpeechHumanReview[]>();
 for(const review of reviews){
  const parsed=gabrooSpeechHumanReviewSchema.safeParse(review);
  if(!parsed.success)throw new Error("Invalid human review: "+parsed.error.issues.map(x=>x.path.join(".")+": "+x.message).join("; "));
  const identity=JSON.stringify([review.candidateId,review.sampleId,review.reviewerLabel]);
  if(seen.has(identity))throw new Error("Duplicate reviewer submission for candidate/sample.");
  seen.add(identity);
  const key=JSON.stringify([review.candidateId,review.mode,review.environment]);
  const bucket=groups.get(key)??[];bucket.push(review);groups.set(key,bucket);
 }
 return [...groups.values()].map(bucket=>{
  const first=bucket[0];
  const bySample=new Map<string,GabrooSpeechHumanReview[]>();
  for(const review of bucket){const list=bySample.get(review.sampleId)??[];list.push(review);bySample.set(review.sampleId,list);}
  const mean=(values:number[])=>values.reduce((sum,value)=>sum+value,0)/values.length;
  const samplesNeedingAdjudication=[...bySample.entries()]
   .filter(([,items])=>items.length<2||Math.max(...items.map(x=>x.meaningPreservation))-Math.min(...items.map(x=>x.meaningPreservation))>=2||
    Math.max(...items.map(x=>x.contentCompleteness))-Math.min(...items.map(x=>x.contentCompleteness))>=2||
    Math.max(...items.map(x=>x.languageFidelity))-Math.min(...items.map(x=>x.languageFidelity))>=2||
    Math.max(...items.map(x=>x.readability))-Math.min(...items.map(x=>x.readability))>=2||
    Math.max(...items.map(x=>x.intelligibility))-Math.min(...items.map(x=>x.intelligibility))>=2||
    (first.mode==="ml-en"&&Math.max(...items.map(x=>x.codeSwitchHandling??0))-Math.min(...items.map(x=>x.codeSwitchHandling??0))>=2))
   .map(([sampleId])=>sampleId).sort();
  const codeSwitch=bucket.map(x=>x.codeSwitchHandling).filter((x):x is number=>x!==undefined);
  return {
   candidateId:first.candidateId,mode:first.mode,environment:first.environment,
   reviewedSamples:bySample.size,reviewCount:bucket.length,
   reviewerCount:new Set(bucket.map(x=>x.reviewerLabel)).size,
   meanMeaningPreservation:Number(mean(bucket.map(x=>x.meaningPreservation)).toFixed(2)),
   meanContentCompleteness:Number(mean(bucket.map(x=>x.contentCompleteness)).toFixed(2)),
   meanLanguageFidelity:Number(mean(bucket.map(x=>x.languageFidelity)).toFixed(2)),
   meanCodeSwitchHandling:codeSwitch.length?Number(mean(codeSwitch).toFixed(2)):null,
   meanReadability:Number(mean(bucket.map(x=>x.readability)).toFixed(2)),
   meanIntelligibility:Number(mean(bucket.map(x=>x.intelligibility)).toFixed(2)),
   samplesNeedingAdjudication
  };
 }).sort((a,b)=>a.candidateId.localeCompare(b.candidateId)||a.mode.localeCompare(b.mode)||a.environment.localeCompare(b.environment));
}
