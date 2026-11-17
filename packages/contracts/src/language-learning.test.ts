import {describe,expect,it} from "vitest";
import {defaultLearningCourseContext,learningCourseContextSchema,learningDirectionSchema} from "./language-learning.js";

describe("bidirectional learning contracts",()=>{
 it("supports the two explicitly approved learning directions",()=>{
  expect(learningDirectionSchema.safeParse("ml_to_en").success).toBe(true);
  expect(learningDirectionSchema.safeParse("en_to_ml").success).toBe(true);
  expect(learningDirectionSchema.safeParse("en_to_fr").success).toBe(false);
 });
 it("provides separate target and support languages for both directions",()=>{
  expect(learningCourseContextSchema.parse(defaultLearningCourseContext.ml_to_en)).toEqual({
   learning_direction:"ml_to_en",target_language:"en",support_language:"ml"
  });
  expect(learningCourseContextSchema.parse(defaultLearningCourseContext.en_to_ml)).toEqual({
   learning_direction:"en_to_ml",target_language:"ml",support_language:"en"
  });
 });
 it("rejects a target language that conflicts with the selected direction",()=>{
  expect(learningCourseContextSchema.safeParse({
   learning_direction:"en_to_ml",target_language:"en",support_language:"ml"
  }).success).toBe(false);
 });
 it("rejects using the target language as its own support language in the initial pairs",()=>{
  expect(learningCourseContextSchema.safeParse({
   learning_direction:"ml_to_en",target_language:"en",support_language:"en"
  }).success).toBe(false);
 });
});
