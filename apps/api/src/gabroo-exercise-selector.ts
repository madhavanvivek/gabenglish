import type {LearnerLessonContent} from "@gabenglish/contracts";
import type {GabrooAdaptivePractice} from "./gabroo-adaptive-practice.js";

export type GabrooExerciseCandidate=Extract<LearnerLessonContent["blocks"][number],{type:"exercise"}>;
export type GabrooExerciseSelection={
 exercise:GabrooExerciseCandidate|null;
 reason:"targeted_skill"|"next_unseen_exercise"|"review_available"|"no_exercises";
 focus_skill:"grammar"|"vocabulary"|"comprehension"|null;
};

/**
 * Selects only learner-safe exercises from the currently published lesson.
 * It never exposes authored answer keys and does not invent missing exercises.
 */
export function selectGabrooNextExercise(input:{
 content:LearnerLessonContent;
 attemptedExerciseIds:readonly string[];
 adaptivePractice:readonly GabrooAdaptivePractice[];
}):GabrooExerciseSelection{
 const exercises=input.content.blocks.filter((block):block is GabrooExerciseCandidate=>block.type==="exercise");
 if(exercises.length===0)return {exercise:null,reason:"no_exercises",focus_skill:null};
 const attempted=new Set(input.attemptedExerciseIds);
 const unseen=exercises.filter(item=>!attempted.has(item.id));
 const priorities:Record<GabrooAdaptivePractice["action"],number>={
  reinforce_current_pattern:0,continue_current_challenge:1,introduce_next_challenge:2
 };
 const guidance=[...input.adaptivePractice].sort((a,b)=>priorities[a.action]-priorities[b.action]||a.skill.localeCompare(b.skill));
 for(const item of guidance){
  const match=unseen.find(exercise=>exercise.skill===item.skill);
  if(match)return {exercise:match,reason:"targeted_skill",focus_skill:item.skill};
 }
 if(unseen[0])return {exercise:unseen[0],reason:"next_unseen_exercise",focus_skill:unseen[0].skill??null};
 const review=exercises[0]!;
 return {exercise:review,reason:"review_available",focus_skill:review.skill??null};
}
