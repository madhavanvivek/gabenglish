import {describe,expect,it} from "vitest";
import {defaultLearningCourseContext,learningCourseContextSchema,learningDirectionSchema,publishedLearningCatalogSchema} from "./language-learning.js";

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


describe("published learning catalog contract",()=>{
 const validCatalog={
  learning_direction:"ml_to_en" as const,
  target_language:"en" as const,
  courses:[{
   id:"course-1",code:"english-foundations",title:"English Foundations",description:null,
   direction:"ml_to_en" as const,source_language:"ml" as const,target_language:"en" as const,support_language:"ml" as const,
   progress:{progress_percent:25,completed_lessons:1,total_lessons:4},
   practice:{attempts:7,exercises_attempted:3,correct_attempts:5},
   modules:[{id:"module-1",title:"Everyday English",lessons:[{
    id:"lesson-1",slug:"introductions",title:"Introductions",version_id:"version-1",version:1,
    script_mode:"romanized",register:null,dialect_scope:null,romanisation:"ISO 15919",
    progress:{status:"in_progress" as const,progress_percent:25}
   }]}]
  }],
  publication_policy:{drafts_hidden:true,malayalam_requires_educator_approval:true}
 };
 it("accepts a complete published catalog including learner progress",()=>{
  expect(publishedLearningCatalogSchema.parse(validCatalog)).toEqual(validCatalog);
 });
 it("rejects a catalog whose target language conflicts with its direction",()=>{
  expect(publishedLearningCatalogSchema.safeParse({...validCatalog,target_language:"ml"}).success).toBe(false);
 });
 it("rejects courses from another learning direction",()=>{
  expect(publishedLearningCatalogSchema.safeParse({...validCatalog,courses:[{...validCatalog.courses[0],direction:"en_to_ml"}]}).success).toBe(false);
 });
 it("rejects impossible progress totals and percentages",()=>{
  expect(publishedLearningCatalogSchema.safeParse({...validCatalog,courses:[{...validCatalog.courses[0],progress:{progress_percent:101,completed_lessons:5,total_lessons:4}}]}).success).toBe(false);
 });
 it("rejects impossible exercise practice totals",()=>{
  expect(publishedLearningCatalogSchema.safeParse({...validCatalog,courses:[{...validCatalog.courses[0],practice:{attempts:2,exercises_attempted:3,correct_attempts:3}}]}).success).toBe(false);
 });
 it("rejects more correct attempts than the total attempt count",()=>{
  expect(publishedLearningCatalogSchema.safeParse({...validCatalog,courses:[{...validCatalog.courses[0],practice:{attempts:2,exercises_attempted:1,correct_attempts:3}}]}).success).toBe(false);
 });
 it("rejects negative or fractional practice counters",()=>{
  for(const practice of [
   {attempts:-1,exercises_attempted:0,correct_attempts:0},
   {attempts:1.5,exercises_attempted:1,correct_attempts:1},
   {attempts:2,exercises_attempted:-1,correct_attempts:0}
  ]){
   expect(publishedLearningCatalogSchema.safeParse({...validCatalog,courses:[{...validCatalog.courses[0],practice}]}).success).toBe(false);
  }
 });
 it("accepts an untouched course with zero practice activity",()=>{
  const course={...validCatalog.courses[0],practice:{attempts:0,exercises_attempted:0,correct_attempts:0}};
  expect(publishedLearningCatalogSchema.safeParse({...validCatalog,courses:[course]}).success).toBe(true);
 });
 it("rejects lessons with malformed progress rather than passing them to the learner UI",()=>{
  const course={...validCatalog.courses[0],modules:[{...validCatalog.courses[0].modules[0],lessons:[{...validCatalog.courses[0].modules[0].lessons[0],progress:{status:"finished",progress_percent:100}}]}]};
  expect(publishedLearningCatalogSchema.safeParse({...validCatalog,courses:[course]}).success).toBe(false);
 });
});
