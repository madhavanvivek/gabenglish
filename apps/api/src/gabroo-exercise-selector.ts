import type {LearnerLessonContent} from "@gabenglish/contracts";
import type {GabrooAdaptivePractice} from "./gabroo-adaptive-practice.js";

export type GabrooExerciseCandidate=Extract<LearnerLessonContent["blocks"][number],{type:"exercise"}>;
export type GabrooExerciseSelection={
 exercise:GabrooExerciseCandidate|null;
 reason:"targeted_skill"|"next_unseen_exercise"|"review_available"|"no_exercises";
 focus_skill:"grammar"|"vocabulary"|"comprehension"|null;
 target_difficulty:number|null;
};

/** Select only learner-safe, published exercises; never returns answer keys. */
export function selectGabrooNextExercise(input:{
 content:LearnerLessonContent;
 attemptedExerciseIds:readonly string[];
 adaptivePractice:readonly GabrooAdaptivePractice[];
}):GabrooExerciseSelection{
 const exercises=input.content.blocks.filter((block):block is GabrooExerciseCandidate=>block.type==="exercise");
 if(exercises.length===0)return {exercise:null,reason:"no_exercises",focus_skill:null,target_difficulty:null};
 const attempted=new Set(input.attemptedExerciseIds);
 const unseen=exercises.filter(item=>!attempted.has(item.id));
 const priorities:Record<GabrooAdaptivePractice["action"],number>={
  reinforce_current_pattern:0,continue_current_challenge:1,introduce_next_challenge:2
 };
 const guidance=[...input.adaptivePractice].sort((a,b)=>priorities[a.action]-priorities[b.action]||a.skill.localeCompare(b.skill));
 for(const item of guidance){
  const candidates=unseen.filter(exercise=>exercise.skill===item.skill);
  if(candidates.length===0)continue;
  const preferredDifficulty=item.action==="reinforce_current_pattern"?item.current_difficulty:item.target_difficulty;
  const selected=preferredDifficulty===null?candidates[0]!:candidates
   .filter(exercise=>exercise.difficulty!==undefined)
   .sort((a,b)=>Math.abs(a.difficulty!-preferredDifficulty)-Math.abs(b.difficulty!-preferredDifficulty)||a.difficulty!-b.difficulty!)[0]??candidates[0]!;
  return {exercise:selected,reason:"targeted_skill",focus_skill:item.skill,target_difficulty:item.target_difficulty};
 }
 if(unseen[0])return {exercise:unseen[0],reason:"next_unseen_exercise",focus_skill:unseen[0].skill??null,target_difficulty:unseen[0].difficulty??null};
 const review=exercises[0]!;
 return {exercise:review,reason:"review_available",focus_skill:review.skill??null,target_difficulty:review.difficulty??null};
}
