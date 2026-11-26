import {describe,expect,it} from "vitest";
import {defaultLearningCourseContext,learningCourseContextSchema,learningDirectionSchema,publishedLearningCatalogSchema,learningLessonDetailSchema,learningExerciseAttemptHistorySchema,learningExerciseAttemptResultSchema,learningLessonProgressSaveSchema,learningLessonProgressUpdateSchema,learningExerciseAttemptSubmitSchema} from "./language-learning.js";

describe("bidirectional learning contracts",()=>{
 it("requires exercise attempts to identify their published lesson version",()=>{
  expect(learningExerciseAttemptSubmitSchema.safeParse({lesson_version_id:"version-1",submission_id:"00000000-0000-4000-8000-000000000009",response:"hello"}).success).toBe(true);
  for(const value of [
   {response:"hello"},
   {lesson_version_id:"",response:"hello"},
   {lesson_version_id:"version-1",response:"   "},
   {lesson_version_id:"version-1",response:"x".repeat(2001)},
   {lesson_version_id:"version-1",response:"hello",extra:true}
  ])expect(learningExerciseAttemptSubmitSchema.safeParse(value).success).toBe(false);
 });
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
   practice:{attempts:7,exercises_attempted:3,correct_attempts:5,exercises_to_review:1},
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
  expect(publishedLearningCatalogSchema.safeParse({...validCatalog,courses:[{...validCatalog.courses[0],practice:{attempts:2,exercises_attempted:3,correct_attempts:3,exercises_to_review:1}}]}).success).toBe(false);
 });
 it("rejects more correct attempts than the total attempt count",()=>{
  expect(publishedLearningCatalogSchema.safeParse({...validCatalog,courses:[{...validCatalog.courses[0],practice:{attempts:2,exercises_attempted:1,correct_attempts:3,exercises_to_review:1}}]}).success).toBe(false);
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
 it("rejects a review count larger than the distinct exercises attempted",()=>{
  const practice={attempts:3,exercises_attempted:2,correct_attempts:1,exercises_to_review:3};
  expect(publishedLearningCatalogSchema.safeParse({...validCatalog,courses:[{...validCatalog.courses[0],practice}]}).success).toBe(false);
 });
 it("accepts an untouched course with zero practice activity",()=>{
  const course={...validCatalog.courses[0],practice:{attempts:0,exercises_attempted:0,correct_attempts:0,exercises_to_review:0}};
  expect(publishedLearningCatalogSchema.safeParse({...validCatalog,courses:[course]}).success).toBe(true);
 });
 it("rejects lessons with malformed progress rather than passing them to the learner UI",()=>{
  const course={...validCatalog.courses[0],modules:[{...validCatalog.courses[0].modules[0],lessons:[{...validCatalog.courses[0].modules[0].lessons[0],progress:{status:"finished",progress_percent:100}}]}]};
  expect(publishedLearningCatalogSchema.safeParse({...validCatalog,courses:[course]}).success).toBe(false);
 });
});


describe("learner lesson detail contract",()=>{
 const validLesson={lesson:{id:"lesson-1",slug:"introductions",title:"Introductions",version_id:"version-1",version:1,learning_direction:"ml_to_en" as const,source_language:"ml" as const,target_language:"en" as const,support_language:"ml" as const,content:{schema_version:1 as const,blocks:[{type:"exercise" as const,id:"greeting",instruction:"Translate",prompt:"നമസ്കാരം",response_type:"text" as const}]},script_mode:"romanized",register:null,dialect_scope:null,romanisation:"ISO 15919"},progress:{status:"in_progress" as const,progress_percent:25,updated_at:"2026-11-26T08:00:00.000Z"}};
 it("accepts a complete learner-safe lesson response",()=>{expect(learningLessonDetailSchema.parse(validLesson)).toEqual(validLesson);});
 it("accepts a lesson with no saved progress",()=>{expect(learningLessonDetailSchema.safeParse({...validLesson,progress:null}).success).toBe(true);});
 it("rejects lesson language metadata that conflicts with its direction",()=>{expect(learningLessonDetailSchema.safeParse({...validLesson,lesson:{...validLesson.lesson,target_language:"ml"}}).success).toBe(false);});
 it("rejects invalid exercise content and progress percentages",()=>{
  expect(learningLessonDetailSchema.safeParse({...validLesson,lesson:{...validLesson.lesson,content:{schema_version:1,blocks:[]}}}).success).toBe(false);
  expect(learningLessonDetailSchema.safeParse({...validLesson,progress:{...validLesson.progress,progress_percent:120}}).success).toBe(false);
 });
});



describe("learner exercise attempt response contracts",()=>{
 const history={lesson_id:"lesson-1",exercise_id:"greeting",current_version_id:"version-2",attempts:[{id:"attempt-1",lesson_version_id:"version-2",response:"Hello",correct:true,feedback:"Well done",attempted_at:"2026-11-26T08:00:00.000Z"}]};
 it("accepts a valid submitted exercise result",()=>{
  expect(learningExerciseAttemptResultSchema.parse({lesson_id:"lesson-1",exercise_id:"greeting",result:{correct:true,feedback:"Correct"}})).toMatchObject({result:{correct:true}});
 });
 it("rejects malformed submitted exercise results",()=>{
  expect(learningExerciseAttemptResultSchema.safeParse({lesson_id:"lesson-1",exercise_id:"greeting",result:{correct:"yes",feedback:"Correct"}}).success).toBe(false);
 });
 it("accepts an empty or populated attempt history",()=>{
  expect(learningExerciseAttemptHistorySchema.safeParse(history).success).toBe(true);
  expect(learningExerciseAttemptHistorySchema.safeParse({...history,attempts:[]}).success).toBe(true);
 });
 it("rejects history entries with invalid timestamps or mismatched version identity",()=>{
  expect(learningExerciseAttemptHistorySchema.safeParse({...history,attempts:[{...history.attempts[0],attempted_at:"yesterday"}]}).success).toBe(false);
  expect(learningExerciseAttemptHistorySchema.safeParse({...history,current_version_id:""}).success).toBe(false);
  expect(learningExerciseAttemptHistorySchema.safeParse({...history,attempts:[{...history.attempts[0],lesson_version_id:"old-version"}]}).success).toBe(false);
 });
});


describe("saved lesson progress response contract",()=>{
 const valid={
  lesson_id:"lesson-1",learning_direction:"ml_to_en" as const,
  progress:{status:"in_progress" as const,progress_percent:60,updated_at:"2026-11-26T08:00:00.000Z"},
  course_progress:{progress_percent:30,completed_lessons:1,total_lessons:4}
 };
 it("accepts a complete saved progress response",()=>{
  expect(learningLessonProgressSaveSchema.parse(valid)).toEqual(valid);
 });
 it("rejects impossible lesson status and percentage combinations",()=>{
  for(const progress of [
   {status:"not_started",progress_percent:10,updated_at:valid.progress.updated_at},
   {status:"in_progress",progress_percent:0,updated_at:valid.progress.updated_at},
   {status:"in_progress",progress_percent:100,updated_at:valid.progress.updated_at},
   {status:"completed",progress_percent:90,updated_at:valid.progress.updated_at}
  ]){
   expect(learningLessonProgressSaveSchema.safeParse({...valid,progress}).success).toBe(false);
  }
 });
 it("rejects malformed timestamps and impossible course totals",()=>{
  expect(learningLessonProgressSaveSchema.safeParse({...valid,progress:{...valid.progress,updated_at:"just now"}}).success).toBe(false);
  expect(learningLessonProgressSaveSchema.safeParse({...valid,course_progress:{...valid.course_progress,completed_lessons:5}}).success).toBe(false);
  expect(learningLessonProgressSaveSchema.safeParse({...valid,course_progress:{...valid.course_progress,progress_percent:101}}).success).toBe(false);
 });
});


describe("lesson progress update request contract",()=>{
 it("accepts whole-number progress bound to a lesson version",()=>{
  for(const progress_percent of [0,25,50,75,100]){
   expect(learningLessonProgressUpdateSchema.parse({lesson_version_id:"version-1",progress_percent})).toEqual({lesson_version_id:"version-1",progress_percent});
  }
 });
 it("rejects fractions, out-of-range values, non-numbers, missing versions and extra fields",()=>{
  for(const value of [
   {lesson_version_id:"version-1",progress_percent:12.5},
   {lesson_version_id:"version-1",progress_percent:-1},
   {lesson_version_id:"version-1",progress_percent:101},
   {lesson_version_id:"version-1",progress_percent:"50"},
   {lesson_version_id:"",progress_percent:50},
   {progress_percent:50},
   {lesson_version_id:"version-1",progress_percent:50,lesson_id:"another-lesson"},
   {},
   null
  ]){
   expect(learningLessonProgressUpdateSchema.safeParse(value).success).toBe(false);
  }
 });
});
