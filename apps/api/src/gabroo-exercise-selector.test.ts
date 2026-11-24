import {describe,it,expect} from "vitest";
import {selectGabrooNextExercise} from "./gabroo-exercise-selector.js";
import type {LearnerLessonContent} from "@gabenglish/contracts";

const lesson: LearnerLessonContent={schema_version:1,blocks:[
 {type:"exercise",id:"grammar-1",skill:"grammar",difficulty:2,instruction:"Choose",prompt:"Pick one",response_type:"single_choice",options:[{id:"a",label:"A"},{id:"b",label:"B"}]},
 {type:"exercise",id:"grammar-advanced",skill:"grammar",difficulty:4,instruction:"Choose",prompt:"Pick one",response_type:"single_choice",options:[{id:"a",label:"A"},{id:"b",label:"B"}]},
 {type:"exercise",id:"vocab-1",skill:"vocabulary",difficulty:4,instruction:"Choose",prompt:"Pick one",response_type:"single_choice",options:[{id:"a",label:"A"},{id:"b",label:"B"}]},
 {type:"exercise",id:"comp-1",skill:"comprehension",difficulty:3,instruction:"Choose",prompt:"Pick one",response_type:"single_choice",options:[{id:"a",label:"A"},{id:"b",label:"B"}]}
]};
const guidance=(skill:"grammar"|"vocabulary"|"comprehension",action:"reinforce_current_pattern"|"continue_current_challenge"|"introduce_next_challenge")=>({
 skill,recent_attempts:4,correct_count:1,action,current_difficulty:3,target_difficulty:4,rationale:"test only",proficiency_change:false as const
});

describe("Gabroo next exercise selector",()=>{
 it("chooses the recommended skill among unseen published exercises",()=>{
  const result=selectGabrooNextExercise({content:lesson,attemptedExerciseIds:["vocab-1","comp-1"],adaptivePractice:[guidance("grammar","reinforce_current_pattern")]});
  expect(result).toMatchObject({exercise:{id:"grammar-1"},reason:"targeted_skill"});
 });
 it("chooses the closest authored difficulty to the adaptive target",()=>{
  const result=selectGabrooNextExercise({content:lesson,attemptedExerciseIds:["grammar-1","vocab-1","comp-1"],adaptivePractice:[{...guidance("grammar","introduce_next_challenge"),target_difficulty:4}]});
  expect(result.exercise?.id).toBe("grammar-advanced");
 });
 it("chooses a skill-matched unseen exercise first",()=>{
  const result=selectGabrooNextExercise({content:lesson,attemptedExerciseIds:[],adaptivePractice:[guidance("vocabulary","reinforce_current_pattern")]});
  expect(result.exercise?.id).toBe("vocab-1");
 });
 it("falls back to the next unseen exercise when no skill guidance matches",()=>{
  const result=selectGabrooNextExercise({content:lesson,attemptedExerciseIds:["grammar-1"],adaptivePractice:[]});
  expect(result).toMatchObject({exercise:{id:"vocab-1"},reason:"next_unseen_exercise"});
 });
 it("offers review when all published exercises have been attempted",()=>{
  const result=selectGabrooNextExercise({content:lesson,attemptedExerciseIds:["grammar-1","vocab-1","comp-1"],adaptivePractice:[]});
  expect(result).toMatchObject({exercise:{id:"grammar-1"},reason:"review_available"});
 });
 it("returns no exercise for a lesson without exercises",()=>{
  const result=selectGabrooNextExercise({content:{schema_version:1,blocks:[{type:"text",body:"Hello"}]},attemptedExerciseIds:[],adaptivePractice:[]});
  expect(result).toEqual({exercise:null,reason:"no_exercises",focus_skill:null,target_difficulty:null});
 });
});
