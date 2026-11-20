import {describe,expect,it} from "vitest";
import {evaluateSentencePracticeAnswer,listSentencePracticeExercises} from "./sentence-practice.js";

describe("sentence construction practice",()=>{
 it("provides a bounded set of reviewed beginner sentence patterns",()=>{
  const exercises=listSentencePracticeExercises();
  expect(exercises).toHaveLength(8);
  expect(new Set(exercises.map(item=>item.id)).size).toBe(exercises.length);
  for(const item of exercises){
   expect(item.options.length).toBeGreaterThanOrEqual(2);
   expect(item.options.some(option=>option.id===item.correctOptionId)).toBe(true);
   expect(item.explanationEn.length).toBeGreaterThan(10);
   expect(item.explanationMl.length).toBeGreaterThan(10);
  }
 });
 it("evaluates only known options and returns bilingual explanation",()=>{
  expect(evaluateSentencePracticeAnswer("question-01","b")).toMatchObject({correct:true});
  expect(evaluateSentencePracticeAnswer("question-01","a")?.correct).toBe(false);
  expect(evaluateSentencePracticeAnswer("question-01","unknown")).toBeNull();
  expect(evaluateSentencePracticeAnswer("not-a-real-exercise","a")).toBeNull();
 });
 it("returns fresh option arrays so callers cannot mutate the catalogue",()=>{
  const first=listSentencePracticeExercises();
  first[0]!.options[0]!.text="changed";
  expect(listSentencePracticeExercises()[0]!.options[0]!.text).not.toBe("changed");
 });
});
