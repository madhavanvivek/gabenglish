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
 * Each evaluation method is restricted to the skills it can validly assess.
 */
export function mapGabrooRubricResults(
 results:readonly unknown[],
 source:GabrooAssessmentSource
):GabrooSkillEvidence[]{
 const mapped:GabrooSkillEvidence[]=[];
 const seen=new Set<string>();
 for(const raw of results){
  const parsed=rubricResultSchema.safeParse(raw);
  if(!parsed.success)continue;
  const item=parsed.data;
  const audioSkill=item.skill==="pronunciation"||item.skill==="fluency";
  const allowedByMethod=
   item.method==="objective_task"
    ? !audioSkill&&item.skill!=="confidence"
    : item.method==="learner_review"
     ? item.skill==="confidence"
     : item.method==="audio_analysis"||item.method==="human_audio_review"
      ? audioSkill
      : !audioSkill;
  if(!allowedByMethod)continue;
  if(item.method==="learner_review"&&source!=="learner_review")continue;
  if((item.method==="human_audio_review"||item.method==="human_language_review")&&source!=="human_review")continue;
  if(item.method==="objective_task"&&source!=="placement_assessment")continue;
  if(item.method==="audio_analysis"&&source!=="placement_assessment")continue;
  const identity=item.skill+"|"+item.taskId;
  if(seen.has(identity))continue;
  seen.add(identity);
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

const objectivePlacementItems=[
 {questionId:"q1",skill:"grammar",confidence:0.8},
 {questionId:"q2",skill:"grammar",confidence:0.8},
 {questionId:"q3",skill:"grammar",confidence:0.8},
 {questionId:"q4",skill:"comprehension",confidence:0.7},
 {questionId:"q5",skill:"grammar",confidence:0.8}
] as const;

/**
 * Scores only server-defined, objectively keyed placement items. The caller
 * supplies the verified answer key outcome, never a client-provided score.
 * Confidence is a provisional item-reliability weight, not learner ability.
 */
export function buildObjectivePlacementRubricResults(input:{
 answers:readonly {questionId:string;correct:boolean}[];
 observedAt:string;
}):GabrooRubricResult[]{
 const answerMap=new Map(input.answers.map(answer=>[answer.questionId,answer.correct]));
 return objectivePlacementItems.flatMap(item=>{
  const correct=answerMap.get(item.questionId);
  if(correct===undefined)return [];
  return [{
   skill:item.skill,
   score:correct?1:0,
   confidence:item.confidence,
   taskId:"placement-pilot-1:"+item.questionId,
   observedAt:input.observedAt,
   method:"objective_task" as const
  }];
 });
}
