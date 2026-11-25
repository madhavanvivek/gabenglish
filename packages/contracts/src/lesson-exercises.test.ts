import {describe,expect,it} from "vitest";
import {authoredExerciseSchema,evaluateAuthoredExercise} from "./lesson-exercises.js";

describe("authored exercise evaluation",()=>{
 const choice={type:"exercise",id:"greeting",instruction:"Choose the greeting",prompt:"Morning",response_type:"single_choice",options:[{id:"morning",label:"Good morning"},{id:"night",label:"Good night"}],correct_option_id:"morning",correct_feedback:"Exactly right.",incorrect_feedback:"Try the time-of-day clue."};
 it("accepts supported skill attribution and bounded difficulty",()=>{
  expect(authoredExerciseSchema.safeParse({...choice,skill:"grammar"}).success).toBe(true);
  expect(authoredExerciseSchema.safeParse({...choice,skill:"pronunciation"}).success).toBe(false);
  expect(authoredExerciseSchema.safeParse({...choice,difficulty:5}).success).toBe(true);
  expect(authoredExerciseSchema.safeParse({...choice,difficulty:6}).success).toBe(false);
 });
 it("validates choice answer keys against available options",()=>{
  expect(authoredExerciseSchema.safeParse(choice).success).toBe(true);
  expect(authoredExerciseSchema.safeParse({...choice,correct_option_id:"missing"}).success).toBe(false);
 });
 it("checks choice responses without returning the answer key",()=>{
  expect(evaluateAuthoredExercise(choice,"morning")).toEqual({correct:true,feedback:"Exactly right."});
  expect(evaluateAuthoredExercise(choice,"night")).toEqual({correct:false,feedback:"Try the time-of-day clue."});
  expect(evaluateAuthoredExercise(choice,"unknown")).toBeNull();
 });
 it("supports skill and difficulty metadata on text-response exercises",()=>{
  const exercise={type:"exercise",id:"vocab",skill:"vocabulary",difficulty:2,instruction:"Translate",prompt:"Good morning",response_type:"text",accepted_answers:["Good morning"]};
  expect(authoredExerciseSchema.safeParse(exercise).success).toBe(true);
  expect(authoredExerciseSchema.safeParse({...exercise,skill:"pronunciation"}).success).toBe(false);
  expect(authoredExerciseSchema.safeParse({...exercise,difficulty:0}).success).toBe(false);
 });
 it("normalises repeated whitespace inside accepted text answers",()=>{
  const exercise={type:"exercise",id:"phrase",instruction:"Translate",prompt:"Good morning",response_type:"text",accepted_answers:["Good morning"]};
  expect(evaluateAuthoredExercise(exercise,"  GOOD   MORNING  ")?.correct).toBe(true);
  expect(evaluateAuthoredExercise(exercise,"GOOD\tMORNING")?.correct).toBe(true);
 });
 it("normalises accepted text answers",()=>{
  const exercise={type:"exercise",id:"hello",instruction:"Translate",prompt:"Hello",response_type:"text",accepted_answers:["Hello","Hi there"]};
  expect(evaluateAuthoredExercise(exercise,"  HELLO  ")?.correct).toBe(true);
  expect(evaluateAuthoredExercise(exercise,"Goodbye")?.correct).toBe(false);
 });
 it("rejects missing or malformed answer rubrics",()=>{
  expect(evaluateAuthoredExercise({type:"exercise",id:"q",response_type:"text"},"answer")).toBeNull();
  expect(evaluateAuthoredExercise(choice," ".repeat(3))).toBeNull();
 });
});
