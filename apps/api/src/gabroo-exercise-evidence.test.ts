import {describe,it,expect} from "vitest";
import {buildLessonExerciseEvidenceTaskId} from "./gabroo-exercise-evidence.js";

describe("lesson exercise evidence task identity",()=>{
 it("uses one stable identity for an exercise within a deliberate learning session",()=>{
  const input={lessonVersionId:"version-1",exerciseId:"past-tense",learningSessionId:"session-1"};
  expect(buildLessonExerciseEvidenceTaskId(input)).toBe("lesson-exercise-session:session-1:past-tense");
  expect(buildLessonExerciseEvidenceTaskId(input)).toBe(buildLessonExerciseEvidenceTaskId(input));
 });
 it("deduplicates legacy submissions without a session id by published exercise",()=>{
  const input={lessonVersionId:"version-1",exerciseId:"past-tense"};
  expect(buildLessonExerciseEvidenceTaskId(input)).toBe("lesson-exercise:version-1:past-tense");
  expect(buildLessonExerciseEvidenceTaskId(input)).toBe(buildLessonExerciseEvidenceTaskId(input));
 });
 it("keeps separate sessions as separate evidence tasks",()=>{
  expect(buildLessonExerciseEvidenceTaskId({lessonVersionId:"v1",exerciseId:"q1",learningSessionId:"s1"}))
   .not.toBe(buildLessonExerciseEvidenceTaskId({lessonVersionId:"v1",exerciseId:"q1",learningSessionId:"s2"}));
 });
});
