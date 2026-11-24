import {z} from "zod";
import type {GabrooSkillEvidence,GabrooSkill} from "./gabroo-learning-model.js";

const skillSchema=z.enum(["grammar","vocabulary","pronunciation","fluency","comprehension","confidence"]);
const rubricResultSchema=z.object({
 skill:skillSchema,
 score:z.number().min(0).max(1),
 confidence:z.number().gt(0).max(1),
 taskId:z.string().trim().min(1).max(160),
 observedAt:z.string().datetime(),
 method:z.enum(["objective_task","learner_review","audio_analysis","human_audio_review","human_language_review"])
}).strict();

export type GabrooRubricResult=z.infer<typeof rubricResultSchema>;
export type GabrooAssessmentSource="placement_assessment"|"learner_review"|"human_review";

/**
 * Converts explicit rubric outcomes into GLIM evidence. This adapter never
 * derives scores from transcript length, lexical counts or heuristic hints.
 * Audio-only skills require an audio-capable evaluator or human audio review.
 */
export function mapGabrooRubricResults(
 results:readonly unknown[],
 source:GabrooAssessmentSource
):GabrooSkillEvidence[]{
 const mapped:GabrooSkillEvidence[]=[];
 for(const raw of results){
  const parsed=rubricResultSchema.safeParse(raw);
  if(!parsed.success)continue;
  const item=parsed.data;
  const audioSkill=item.skill==="pronunciation"||item.skill==="fluency";
  const audioMethod=item.method==="audio_analysis"||item.method==="human_audio_review";
  if(audioSkill&&!audioMethod)continue;
  if(item.method==="learner_review"&&source!=="learner_review")continue;
  if(item.method==="human_audio_review"||item.method==="human_language_review"){
   if(source!=="human_review")continue;
  }
  if(item.method==="objective_task"&&source!=="placement_assessment")continue;
  mapped.push({
   skill:item.skill as GabrooSkill,
   score:item.score,
   confidence:item.confidence,
   source,
   taskId:item.taskId,
   observedAt:item.observedAt
  });
 }
 return mapped;
}
