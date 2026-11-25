import {z} from "zod";

export const authoredChoiceExerciseSchema=z.object({
 type:z.literal("exercise"),id:z.string().regex(/^[a-z0-9_-]{1,64}$/i),
 stage:z.number().int().min(1).max(5).optional(),
 skill_key:z.enum(["vocabulary","pronunciation","sentence_formation","grammar","listening","speaking","fluency","comprehension","conversation","writing"]).optional(),
 instruction:z.string().trim().min(1).max(500),prompt:z.string().trim().min(1).max(1000),
 response_type:z.literal("single_choice"),
 options:z.array(z.object({id:z.string().regex(/^[a-z0-9_-]{1,32}$/i),label:z.string().trim().min(1).max(300)})).min(2).max(8),
 correct_option_id:z.string().regex(/^[a-z0-9_-]{1,32}$/i),
 correct_feedback:z.string().trim().max(1000).optional(),incorrect_feedback:z.string().trim().max(1000).optional()
}).superRefine((value,ctx)=>{
 if(!value.options.some(option=>option.id===value.correct_option_id))ctx.addIssue({code:z.ZodIssueCode.custom,path:["correct_option_id"],message:"Correct option must be one of the exercise options."});
});
export const authoredTextExerciseSchema=z.object({
 type:z.literal("exercise"),id:z.string().regex(/^[a-z0-9_-]{1,64}$/i),
 stage:z.number().int().min(1).max(5).optional(),
 skill_key:z.enum(["vocabulary","pronunciation","sentence_formation","grammar","listening","speaking","fluency","comprehension","conversation","writing"]).optional(),
 instruction:z.string().trim().min(1).max(500),prompt:z.string().trim().min(1).max(1000),
 response_type:z.literal("text"),accepted_answers:z.array(z.string().trim().min(1).max(500)).min(1).max(30),
 correct_feedback:z.string().trim().max(1000).optional(),incorrect_feedback:z.string().trim().max(1000).optional()
});
export const authoredExerciseSchema=z.union([authoredChoiceExerciseSchema,authoredTextExerciseSchema]);
export type AuthoredExercise=z.infer<typeof authoredExerciseSchema>;

export function evaluateAuthoredExercise(input:unknown,response:string):{correct:boolean;feedback:string}|null{
 const parsed=authoredExerciseSchema.safeParse(input);
 if(!parsed.success)return null;
 const exercise=parsed.data;
 const submitted=response.trim();
 if(!submitted||submitted.length>2000)return null;
 const correct=exercise.response_type==="single_choice"
  ?exercise.options.some(option=>option.id===submitted)&&submitted===exercise.correct_option_id
  :exercise.accepted_answers.some(answer=>answer.normalize("NFKC").trim().toLocaleLowerCase().replace(/\\s+/g," ")===submitted.normalize("NFKC").trim().toLocaleLowerCase().replace(/\\s+/g," "));
 if(exercise.response_type==="single_choice"&&!exercise.options.some(option=>option.id===submitted))return null;
 return {correct,feedback:correct?(exercise.correct_feedback??"Good work. Your answer is correct."):(exercise.incorrect_feedback??"Not quite. Review the lesson and try again.")};
}
