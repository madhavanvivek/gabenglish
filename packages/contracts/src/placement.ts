import {z} from "zod";
export const placementAnswerSchema=z.object({question_id:z.string().min(1),option_id:z.string().min(1)});
export const placementSubmissionSchema=z.object({answers:z.array(placementAnswerSchema).min(1).max(20)});
export type PlacementSubmission=z.infer<typeof placementSubmissionSchema>;
export const placementResultSchema=z.object({score:z.number().int().min(0),total:z.number().int().positive(),percentage:z.number().min(0).max(100),suggested_stage:z.enum(["malayalam_mode","mixed_mode","english_practice"]),notice:z.string()});
export type PlacementResult=z.infer<typeof placementResultSchema>;
