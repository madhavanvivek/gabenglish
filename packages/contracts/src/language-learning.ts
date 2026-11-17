import {z} from "zod";

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
