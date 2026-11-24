import type {FastifyInstance} from "fastify";
import type {Pool} from "pg";
import {z} from "zod";
import type {AppConfig} from "./config.js";
import {authenticateLearner} from "./auth.js";
import {chooseGabrooLearningDecision,estimateGabrooSkills,type GabrooSkillEvidence,type GabrooSkill} from "./gabroo-learning-model.js";
import {buildGabrooLessonBlueprint} from "./gabroo-lesson-planner.js";
import {buildGabrooAdaptivePractice,type GabrooExerciseOutcome} from "./gabroo-adaptive-practice.js";

const skillSchema=z.enum(["grammar","vocabulary","pronunciation","fluency","comprehension","confidence"]);
const sourceSchema=z.enum(["placement_assessment","lesson_exercise","conversation","learner_review","human_review"]);
const evidenceSchema=z.object({
 skill:skillSchema,
 score:z.number().min(0).max(1),
 confidence:z.number().gt(0).max(1),
 source:sourceSchema,
 taskId:z.string().trim().min(1).max(160),
 observedAt:z.string().datetime()
}).strict();

/**
 * Internal write boundary for trusted assessment/conversation evaluators.
 * This is deliberately not exposed as a learner-facing arbitrary score API.
 * A task can contribute only one observation per learner/skill/source.
 */
export async function recordGabrooSkillEvidence(pool:Pool,userId:string,input:GabrooSkillEvidence):Promise<boolean>{
 const parsed=evidenceSchema.safeParse(input);
 if(!parsed.success)throw new Error("Invalid Gabroo skill evidence");
 const saved=await pool.query(
  "INSERT INTO gabroo_skill_evidence(user_id,skill,score,confidence,source,task_id,observed_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(user_id,skill,source,task_id) DO NOTHING RETURNING id",
  [userId,parsed.data.skill,parsed.data.score,parsed.data.confidence,parsed.data.source,parsed.data.taskId,parsed.data.observedAt]
 );
 return Boolean(saved.rows[0]);
}

export async function registerGabrooLearningProfileRoutes(app:FastifyInstance,pool:Pool,config:AppConfig){
 app.get("/api/v1/gabroo/learning-profile",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return reply.code(401).send({error:{code:"VERIFIED_ACCOUNT_REQUIRED",message:"Please sign in with your verified account.",request_id:request.id}});
  const preferences=await pool.query<{learning_direction:"ml_to_en"|"en_to_ml"}>(
   "SELECT learning_direction FROM user_preferences WHERE user_id=$1",[learner.id]
  );
  const learningDirection=preferences.rows[0]?.learning_direction??"ml_to_en";
  const [observations,due,exerciseOutcomes]=await Promise.all([
   pool.query<{skill:GabrooSkill;score:string;confidence:string;source:GabrooSkillEvidence["source"];task_id:string;observed_at:Date}>(`
    SELECT skill,score::text,confidence::text,source,task_id,observed_at
    FROM gabroo_skill_evidence
    WHERE user_id=$1 AND observed_at>=now()-interval '180 days'
    ORDER BY observed_at DESC
    LIMIT 300
   `,[learner.id]),
   pool.query<{count:string}>(`
    SELECT count(*)::text AS count FROM gabroo_vocabulary
    WHERE user_id=$1 AND status<>'mastered' AND review_due_at<=now()
   `,[learner.id]),
   pool.query<{skill:GabrooExerciseOutcome["skill"];correct:boolean;difficulty:number|null;observed_at:Date}>(`
    SELECT DISTINCT ON (a.lesson_version_id,a.exercise_id)
      block->>'skill' AS skill,a.is_correct AS correct,
      CASE WHEN block->>'difficulty' ~ '^[1-5]
   `,[learner.id])
  ]);
  const evidence:GabrooSkillEvidence[]=observations.rows.map(row=>({
   skill:row.skill,score:Number(row.score),confidence:Number(row.confidence),
   source:row.source,taskId:row.task_id,observedAt:row.observed_at.toISOString()
  }));
  const estimates=estimateGabrooSkills(evidence);
  const decision=chooseGabrooLearningDecision({
   evidence,learningDirection,dueVocabularyCount:Number(due.rows[0]?.count??0)
  });
  const nextActivity=buildGabrooLessonBlueprint(decision);
  const adaptivePractice=buildGabrooAdaptivePractice(exerciseOutcomes.rows.map(row=>({skill:row.skill,correct:row.correct,difficulty:row.difficulty??undefined,observedAt:row.observed_at.toISOString()})));
  return {
   model:{name:"Gabroo Learning Intelligence Model",version:"1.0.0"},
   learning_direction:learningDirection,
   target_language:decision.targetLanguage,
   support_language:decision.supportLanguage,
   skill_estimates:estimates,
   next_learning_decision:decision,
   next_activity:nextActivity,
   adaptive_practice:adaptivePractice,
   evidence_summary:{observations:evidence.length,skills_with_evidence:estimates.length,window_days:180},
   limitations:[
    "A missing skill estimate means no qualifying evidence was recorded; it does not mean poor ability.",
    "Pronunciation and fluency are not scored from transcript text alone.",
    "Activity and word counts are not proficiency scores."
   ],
   privacy:{owner_only:true,raw_audio_excluded:true,transcripts_excluded:true,training_use:false}
  };
 });
}
 THEN (block->>'difficulty')::int ELSE NULL END AS difficulty,
      a.created_at AS observed_at
    FROM learner_exercise_attempts a
    JOIN lesson_versions lv ON lv.id=a.lesson_version_id
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(lv.content->'blocks')='array' THEN lv.content->'blocks' ELSE '[]'::jsonb END
    ) AS blocks(block)
    WHERE a.user_id=$1 AND block->>'type'='exercise'
      AND block->>'id'=a.exercise_id
      AND block->>'skill' IN ('grammar','vocabulary','comprehension')
    ORDER BY a.lesson_version_id,a.exercise_id,a.created_at DESC
    LIMIT 100
   `,[learner.id])
  ]);
  const evidence:GabrooSkillEvidence[]=observations.rows.map(row=>({
   skill:row.skill,score:Number(row.score),confidence:Number(row.confidence),
   source:row.source,taskId:row.task_id,observedAt:row.observed_at.toISOString()
  }));
  const estimates=estimateGabrooSkills(evidence);
  const decision=chooseGabrooLearningDecision({
   evidence,learningDirection,dueVocabularyCount:Number(due.rows[0]?.count??0)
  });
  const nextActivity=buildGabrooLessonBlueprint(decision);
  const adaptivePractice=buildGabrooAdaptivePractice(exerciseOutcomes.rows.map(row=>({skill:row.skill,correct:row.correct,difficulty:row.difficulty??undefined,observedAt:row.observed_at.toISOString()})));
  return {
   model:{name:"Gabroo Learning Intelligence Model",version:"1.0.0"},
   learning_direction:learningDirection,
   target_language:decision.targetLanguage,
   support_language:decision.supportLanguage,
   skill_estimates:estimates,
   next_learning_decision:decision,
   next_activity:nextActivity,
   adaptive_practice:adaptivePractice,
   evidence_summary:{observations:evidence.length,skills_with_evidence:estimates.length,window_days:180},
   limitations:[
    "A missing skill estimate means no qualifying evidence was recorded; it does not mean poor ability.",
    "Pronunciation and fluency are not scored from transcript text alone.",
    "Activity and word counts are not proficiency scores."
   ],
   privacy:{owner_only:true,raw_audio_excluded:true,transcripts_excluded:true,training_use:false}
  };
 });
}
