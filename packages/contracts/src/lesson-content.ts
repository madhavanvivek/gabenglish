import {z} from "zod";

export const lessonTextBlockSchema=z.object({type:z.literal("text"),heading:z.string().trim().min(1).max(120).optional(),body:z.string().trim().min(1).max(4000)});
export const lessonVocabularyBlockSchema=z.object({type:z.literal("vocabulary"),items:z.array(z.object({term:z.string().trim().min(1).max(120),meaning:z.string().trim().min(1).max(240),pronunciation:z.string().trim().max(120).optional(),example:z.string().trim().max(500).optional()})).min(1).max(30)});
export const lessonExampleBlockSchema=z.object({type:z.literal("examples"),items:z.array(z.object({target:z.string().trim().min(1).max(500),support:z.string().trim().max(500).optional(),note:z.string().trim().max(500).optional()})).min(1).max(20)});
export const lessonExerciseBlockSchema=z.object({type:z.literal("exercise"),skill:z.enum(["grammar","vocabulary","comprehension"]).optional(),id:z.string().regex(/^[a-z0-9_-]{1,64}$/i),instruction:z.string().trim().min(1).max(500),prompt:z.string().trim().min(1).max(1000),response_type:z.enum(["text","single_choice"]),options:z.array(z.object({id:z.string().regex(/^[a-z0-9_-]{1,32}$/i),label:z.string().trim().min(1).max(300)})).max(8).optional()}).superRefine((value,ctx)=>{
 if(value.response_type==="single_choice"&&(!value.options||value.options.length<2))ctx.addIssue({code:z.ZodIssueCode.custom,path:["options"],message:"Choice exercises require at least two options."});
 if(value.response_type==="text"&&value.options!==undefined)ctx.addIssue({code:z.ZodIssueCode.custom,path:["options"],message:"Text exercises cannot include choice options."});
});
export const lessonContentBlockSchema=z.union([lessonTextBlockSchema,lessonVocabularyBlockSchema,lessonExampleBlockSchema,lessonExerciseBlockSchema]);
export const learnerLessonContentSchema=z.object({schema_version:z.literal(1),blocks:z.array(lessonContentBlockSchema).min(1).max(80)});
export type LearnerLessonContent=z.infer<typeof learnerLessonContentSchema>;

/** Parse and project learner-safe content; authoring-only fields never pass through. */
export function projectLearnerLessonContent(input:unknown):LearnerLessonContent|null{
 const parsed=learnerLessonContentSchema.safeParse(input);
 return parsed.success?parsed.data:null;
}
