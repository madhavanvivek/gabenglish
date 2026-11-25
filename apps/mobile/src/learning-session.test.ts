import {describe,expect,it} from "vitest";
import {createExerciseSubmissionIdempotencyKey,createLearningSessionId,isLearningSessionId} from "./learning-session";

describe("learning session identities",()=>{
 it("creates UUIDs for deliberate practice sessions",()=>{
  const id=createLearningSessionId();
  expect(isLearningSessionId(id)).toBe(true);
 });
 it("creates a fresh UUID for each submission idempotency key",()=>{
  const first=createExerciseSubmissionIdempotencyKey();
  const second=createExerciseSubmissionIdempotencyKey();
  expect(isLearningSessionId(first)).toBe(true);
  expect(isLearningSessionId(second)).toBe(true);
  expect(second).not.toBe(first);
 });
 it("rejects malformed session identifiers",()=>{
  expect(isLearningSessionId("")).toBe(false);
  expect(isLearningSessionId("not-a-uuid")).toBe(false);
  expect(isLearningSessionId("00000000-0000-0000-0000-000000000000")).toBe(false);
 });
});
