import type {GabrooSkill} from "./gabroo-learning-model.js";

export type GabrooExerciseOutcome={skill:Extract<GabrooSkill,"grammar"|"vocabulary"|"comprehension">;correct:boolean;difficulty?:number;observedAt:string};
export type GabrooAdaptivePractice={
 skill:GabrooExerciseOutcome["skill"];
 recent_attempts:number;
 correct_count:number;
 action:"introduce_next_challenge"|"reinforce_current_pattern"|"continue_current_challenge";
 current_difficulty:number|null;
 target_difficulty:number|null;
 rationale:string;
 proficiency_change:false;
};

/**
 * Selects an authored challenge band from recent task outcomes. This is
 * curriculum sequencing only; it never updates GLIM proficiency estimates.
 */
export function buildGabrooAdaptivePractice(outcomes:readonly GabrooExerciseOutcome[]):GabrooAdaptivePractice[]{
 const skills=["grammar","vocabulary","comprehension"] as const;
 return skills.flatMap(skill=>{
  const recent=outcomes.filter(item=>item.skill===skill&&Number.isFinite(Date.parse(item.observedAt))&&
    (item.difficulty===undefined||(Number.isInteger(item.difficulty)&&item.difficulty>=1&&item.difficulty<=5)))
   .sort((a,b)=>Date.parse(b.observedAt)-Date.parse(a.observedAt)).slice(0,8);
  if(recent.length===0)return [];
  const correct=recent.filter(item=>item.correct).length;
  const action=recent.length>=5&&correct/recent.length>=0.8
   ?"introduce_next_challenge" as const
   :recent.length>=3&&correct/recent.length<=0.4
    ?"reinforce_current_pattern" as const
    :"continue_current_challenge" as const;
  const levels=recent.map(item=>item.difficulty).filter((value):value is number=>value!==undefined).sort((a,b)=>a-b);
  const currentDifficulty=levels.length?levels[Math.floor((levels.length-1)/2)]!:null;
  const targetDifficulty=currentDifficulty===null?null:
   action==="introduce_next_challenge"?Math.min(5,currentDifficulty+1):
   action==="reinforce_current_pattern"?Math.max(1,currentDifficulty-1):currentDifficulty;
  const rationale=targetDifficulty===null
   ?"Recent outcomes guide skill reinforcement, but authored difficulty metadata is missing; keep the current challenge band."
   :action==="introduce_next_challenge"
    ?"Repeated success supports moving one authored difficulty band higher."
    :action==="reinforce_current_pattern"
     ?"Repeated difficulty supports moving one authored difficulty band lower and revisiting the pattern."
     :"Keep the current authored difficulty band while collecting more evidence.";
  return [{skill,recent_attempts:recent.length,correct_count:correct,action,current_difficulty:currentDifficulty,target_difficulty:targetDifficulty,rationale,proficiency_change:false as const}];
 });
}
