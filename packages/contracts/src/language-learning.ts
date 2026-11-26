import {z} from "zod";
import {learnerLessonContentSchema} from "./lesson-content.js";

/**
 * A learning direction identifies the language being acquired, not the
 * language used for explanations. Keep these dimensions independent.
 */
export const learningDirectionSchema=z.enum(["ml_to_en","en_to_ml"]);
export type LearningDirection=z.infer<typeof learningDirectionSchema>;

export const targetLanguageSchema=z.enum(["en","ml"]);
export type TargetLanguage=z.infer<typeof targetLanguageSchema>;

export const learningCourseContextSchema=z.object({
 learning_direction:learningDirectionSchema,
 target_language:targetLanguageSchema,
 support_language:z.enum(["en","ml"])
}).superRefine((value,ctx)=>{
 const expected=value.learning_direction==="ml_to_en"?"en":"ml";
 if(value.target_language!==expected){
  ctx.addIssue({code:z.ZodIssueCode.custom,path:["target_language"],message:"Target language does not match the selected learning direction."});
 }
 if(value.support_language===value.target_language){
  ctx.addIssue({code:z.ZodIssueCode.custom,path:["support_language"],message:"Support language must differ from the target language in the initial bilingual course pairs."});
 }
});
export type LearningCourseContext=z.infer<typeof learningCourseContextSchema>;

export const defaultLearningCourseContext:Record<LearningDirection,LearningCourseContext>={
 ml_to_en:{learning_direction:"ml_to_en",target_language:"en",support_language:"ml"},
 en_to_ml:{learning_direction:"en_to_ml",target_language:"ml",support_language:"en"}
};


export const learnerLessonProgressSchema=z.object({
 status:z.enum(["not_started","in_progress","completed"]),
 progress_percent:z.number().finite().min(0).max(100)
});
export type LearnerLessonProgress=z.infer<typeof learnerLessonProgressSchema>;

export const publishedLearningLessonSchema=z.object({
 id:z.string().min(1),
 slug:z.string().nullable(),
 title:z.string().min(1),
 version_id:z.string().min(1),
 version:z.number().int().positive().nullable(),
 script_mode:z.string().nullable(),
 register:z.string().nullable(),
 dialect_scope:z.string().nullable(),
 romanisation:z.string().nullable(),
 progress:learnerLessonProgressSchema.nullable()
});
export type PublishedLearningLesson=z.infer<typeof publishedLearningLessonSchema>;

const publishedLearningCourseSchema=z.object({
 id:z.string().min(1),
 code:z.string().min(1),
 title:z.string().min(1),
 description:z.string().nullable(),
 direction:learningDirectionSchema,
 source_language:z.enum(["en","ml"]),
 target_language:targetLanguageSchema,
 support_language:z.enum(["en","ml"]),
 progress:z.object({
  progress_percent:z.number().finite().min(0).max(100),
  completed_lessons:z.number().int().nonnegative(),
  total_lessons:z.number().int().nonnegative()
 }).superRefine((value,ctx)=>{
  if(value.completed_lessons>value.total_lessons){
   ctx.addIssue({code:z.ZodIssueCode.custom,path:["completed_lessons"],message:"Completed lessons cannot exceed the course total."});
  }
 }),
 practice:z.object({
  attempts:z.number().int().nonnegative(),
  exercises_attempted:z.number().int().nonnegative(),
  correct_attempts:z.number().int().nonnegative(),
  exercises_to_review:z.number().int().nonnegative()
 }).superRefine((value,ctx)=>{
  if(value.correct_attempts>value.attempts){
   ctx.addIssue({code:z.ZodIssueCode.custom,path:["correct_attempts"],message:"Correct attempts cannot exceed all attempts."});
  }
  if(value.exercises_attempted>value.attempts){
   ctx.addIssue({code:z.ZodIssueCode.custom,path:["exercises_attempted"],message:"Distinct exercises attempted cannot exceed all attempts."});
  }
  if(value.exercises_to_review>value.exercises_attempted){
   ctx.addIssue({code:z.ZodIssueCode.custom,path:["exercises_to_review"],message:"Exercises to review cannot exceed distinct exercises attempted."});
  }
 }),
 modules:z.array(z.object({
  id:z.string().min(1),
  title:z.string().min(1),
  lessons:z.array(publishedLearningLessonSchema)
 }))
}).superRefine((course,ctx)=>{
 const expected=defaultLearningCourseContext[course.direction];
 if(course.source_language!==expected.support_language||course.target_language!==expected.target_language||course.support_language!==expected.support_language){
  ctx.addIssue({code:z.ZodIssueCode.custom,path:["target_language"],message:"Published course languages do not match its learning direction."});
 }
});
export const publishedLearningCatalogSchema=z.object({
 learning_direction:learningDirectionSchema,
 target_language:targetLanguageSchema,
 courses:z.array(publishedLearningCourseSchema),
 publication_policy:z.object({
  drafts_hidden:z.boolean(),
  malayalam_requires_educator_approval:z.boolean()
 })
}).superRefine((catalog,ctx)=>{
 const expected=defaultLearningCourseContext[catalog.learning_direction].target_language;
 if(catalog.target_language!==expected){
  ctx.addIssue({code:z.ZodIssueCode.custom,path:["target_language"],message:"Catalog target language does not match its learning direction."});
 }
 for(const [index,course] of catalog.courses.entries()){
  if(course.direction!==catalog.learning_direction){
   ctx.addIssue({code:z.ZodIssueCode.custom,path:["courses",index,"direction"],message:"Catalog contains a course from another learning direction."});
  }
 }
});
export type PublishedLearningCatalog=z.infer<typeof publishedLearningCatalogSchema>;

export const learningLessonDetailSchema=z.object({
 lesson:z.object({
  id:z.string().min(1),slug:z.string().nullable(),title:z.string().min(1),version_id:z.string().min(1),version:z.number().int().positive(),
  learning_direction:learningDirectionSchema,source_language:z.enum(["en","ml"]),target_language:targetLanguageSchema,support_language:z.enum(["en","ml"]),
  content:learnerLessonContentSchema,script_mode:z.string().min(1),register:z.string().nullable(),dialect_scope:z.string().nullable(),romanisation:z.string().nullable()
 }).superRefine((lesson,ctx)=>{
  const expected=defaultLearningCourseContext[lesson.learning_direction];
  if(lesson.source_language!==expected.support_language||lesson.target_language!==expected.target_language||lesson.support_language!==expected.support_language){
   ctx.addIssue({code:z.ZodIssueCode.custom,path:["target_language"],message:"Lesson languages do not match its learning direction."});
  }
 }),
 progress:z.object({status:z.enum(["not_started","in_progress","completed"]),progress_percent:z.number().finite().min(0).max(100),updated_at:z.string().datetime()}).nullable()
});
export type LearningLessonDetailContract=z.infer<typeof learningLessonDetailSchema>;


export const learningLessonProgressUpdateSchema=z.object({
 progress_percent:z.number().finite().int().min(0).max(100)
}).strict();
export type LearningLessonProgressUpdateContract=z.infer<typeof learningLessonProgressUpdateSchema>;

export const learningLessonProgressSaveSchema=z.object({
 lesson_id:z.string().min(1),
 learning_direction:learningDirectionSchema,
 progress:z.object({
  status:z.enum(["not_started","in_progress","completed"]),
  progress_percent:z.number().finite().int().min(0).max(100),
  updated_at:z.string().datetime()
 }).superRefine((progress,ctx)=>{
  if((progress.status==="not_started"&&progress.progress_percent!==0)||(progress.status==="in_progress"&&(progress.progress_percent===0||progress.progress_percent===100))||(progress.status==="completed"&&progress.progress_percent!==100)){
   ctx.addIssue({code:z.ZodIssueCode.custom,path:["status"],message:"Lesson progress status must agree with its percentage."});
  }
 }),
 course_progress:z.object({
  progress_percent:z.number().finite().min(0).max(100),
  completed_lessons:z.number().int().nonnegative(),
  total_lessons:z.number().int().nonnegative()
 }).superRefine((progress,ctx)=>{
  if(progress.completed_lessons>progress.total_lessons){
   ctx.addIssue({code:z.ZodIssueCode.custom,path:["completed_lessons"],message:"Completed lessons cannot exceed the course total."});
  }
 })
});
export type LearningLessonProgressSaveContract=z.infer<typeof learningLessonProgressSaveSchema>;

export const learningExerciseAttemptResultSchema=z.object({
 lesson_id:z.string().min(1),
 exercise_id:z.string().min(1),
 result:z.object({
  correct:z.boolean(),
  feedback:z.string()
 })
});

export const learningExerciseAttemptHistorySchema=z.object({
 lesson_id:z.string().min(1),
 exercise_id:z.string().min(1),
 current_version_id:z.string().min(1),
 attempts:z.array(z.object({
  id:z.string().min(1),
  lesson_version_id:z.string().min(1),
  response:z.string(),
  correct:z.boolean(),
  feedback:z.string().nullable(),
  attempted_at:z.string().datetime()
 }))
}).superRefine((history,ctx)=>{
 history.attempts.forEach((attempt,index)=>{
  if(attempt.lesson_version_id!==history.current_version_id){
   ctx.addIssue({code:z.ZodIssueCode.custom,path:["attempts",index,"lesson_version_id"],message:"Attempt history must belong to the current published lesson version."});
  }
 });
});
export type LearningExerciseAttemptResultContract=z.infer<typeof learningExerciseAttemptResultSchema>;
export type LearningExerciseAttemptHistoryContract=z.infer<typeof learningExerciseAttemptHistorySchema>;
