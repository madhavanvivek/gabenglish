import type {GabrooSkill} from "./gabroo-learning-model.js";

export type GabrooExerciseOutcome={skill:Extract<GabrooSkill,"grammar"|"vocabulary"|"comprehension">;correct:boolean;observedAt:string};
export type GabrooAdaptivePractice={
 skill:GabrooExerciseOutcome["skill"];
 recent_attempts:number;
 correct_count:number;
 action:"introduce_next_challenge"|"reinforce_current_pattern"|"continue_current_challenge";
 rationale:string;
 proficiency_change:false;
};

/**
 * Suggests the next exercise challenge from recent authored-task outcomes.
 * This is exercise sequencing only; it never updates GLIM skill scores.
 */
export function buildGabrooAdaptivePractice(outcomes:readonly GabrooExerciseOutcome[]):GabrooAdaptivePractice[]{
 const skills=["grammar","vocabulary","comprehension"] as const;
 return skills.flatMap(skill=>{
  const recent=outcomes.filter(item=>item.skill===skill&&Number.isFinite(Date.parse(item.observedAt)))
   .sort((a,b)=>Date.parse(b.observedAt)-Date.parse(a.observedAt)).slice(0,8);
  if(recent.length===0)return [];
  const correct=recent.filter(item=>item.correct).length;
  const action=recent.length>=5&&correct/recent.length>=0.8
   ?"introduce_next_challenge" as const
   :recent.length>=3&&correct/recent.length<=0.4
    ?"reinforce_current_pattern" as const
    :"continue_current_challenge" as const;
  const rationale=action==="introduce_next_challenge"
   ?"Recent practice is consistently successful; offer a slightly more challenging exercise, without changing the learner's proficiency estimate."
   :action==="reinforce_current_pattern"
    ?"Recent practice shows repeated difficulty; revisit the same pattern with a clearer example and more support."
    :"There is not yet a strong enough pattern to change the exercise challenge.";
  return [{skill,recent_attempts:recent.length,correct_count:correct,action,rationale,proficiency_change:false as const}];
 });
}
