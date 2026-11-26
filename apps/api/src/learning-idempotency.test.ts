import {describe,expect,it} from "vitest";
import {isSameExerciseSubmission} from "./learning-idempotency";

const stored={lesson_id:"lesson-1",lesson_version_id:"version-2",exercise_id:"exercise-1",response:"hello"};

describe("exercise submission idempotency",()=>{
 it("accepts a replay of the exact original submission",()=>{
  expect(isSameExerciseSubmission(stored,{lessonId:"lesson-1",lessonVersionId:"version-2",exerciseId:"exercise-1",response:"hello"})).toBe(true);
 });
 it.each([
  {lessonId:"lesson-2",lessonVersionId:"version-2",exerciseId:"exercise-1",response:"hello"},
  {lessonId:"lesson-1",lessonVersionId:"version-3",exerciseId:"exercise-1",response:"hello"},
  {lessonId:"lesson-1",lessonVersionId:"version-2",exerciseId:"exercise-2",response:"hello"},
  {lessonId:"lesson-1",lessonVersionId:"version-2",exerciseId:"exercise-1",response:"different"}
 ])("rejects a reused key for a different payload: %o",requested=>{
  expect(isSameExerciseSubmission(stored,requested)).toBe(false);
 });
});
