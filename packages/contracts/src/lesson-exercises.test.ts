import {describe,expect,it} from "vitest";
import {authoredExerciseSchema,evaluateAuthoredExercise} from "./lesson-exercises.js";

describe("authored exercise evaluation",()=>{
 const choice={type:"exercise",id:"greeting",instruction:"Choose the greeting",prompt:"Morning",response_type:"single_choice",options:[{id:"morning",label:"Good morning"},{id:"night",label:"Good night"}],correct_option_id:"morning",correct_feedback:"Exactly right.",incorrect_feedback:"Try the time-of-day clue."};
 it("validates choice answer keys against available options",()=>{
  expect(authoredExerciseSchema.safeParse(choice).success).toBe(true);
  expect(authoredExerciseSchema.safeParse({...choice,correct_option_id:"missing"}).success).toBe(false);
 });
 it("checks choice responses without returning the answer key",()=>{
  expect(evaluateAuthoredExercise(choice,"morning")).toEqual({correct:true,feedback:"Exactly right."});
  expect(evaluateAuthoredExercise(choice,"night")).toEqual({correct:false,feedback:"Try the time-of-day clue."});
  expect(evaluateAuthoredExercise(choice,"unknown")).toBeNull();
 });
 it("normalises accepted text answers",()=>{
  const exercise={type:"exercise",id:"hello",instruction:"Translate",prompt:"Hello",response_type:"text",accepted_answers:["Hello","Hi there"]};
  expect(evaluateAuthoredExercise(exercise,"  HELLO  ")?.correct).toBe(true);
  expect(evaluateAuthoredExercise(exercise,"  Hi   there  ")?.correct).toBe(true);
  expect(evaluateAuthoredExercise(exercise,"\\tＨＥＬＬＯ\\u00a0")?.correct).toBe(true);
  expect(evaluateAuthoredExercise(exercise,"  hello\n  ")?.correct).toBe(true);
  expect(evaluateAuthoredExercise(exercise,"Goodbye")?.correct).toBe(false);
 });
 it("rejects missing or malformed answer rubrics",()=>{
  expect(evaluateAuthoredExercise({type:"exercise",id:"q",response_type:"text"},"answer")).toBeNull();
  expect(evaluateAuthoredExercise(choice," ".repeat(3))).toBeNull();
 });
});
