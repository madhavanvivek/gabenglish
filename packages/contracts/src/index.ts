import {z} from "zod";
export const correctionModeSchema=z.enum(["gentle","balanced","detailed"]);
export type CorrectionMode=z.infer<typeof correctionModeSchema>;
export const languageModeSchema=z.enum(["ml","en","mixed"]);
export type LanguageMode=z.infer<typeof languageModeSchema>;
export const apiErrorSchema=z.object({error:z.object({code:z.string(),message:z.string(),request_id:z.string(),details:z.array(z.record(z.string(),z.unknown())).optional()})});
export type ApiError=z.infer<typeof apiErrorSchema>;
export const tutorTextTurnSchema=z.object({input:z.object({type:z.literal("text"),text:z.string().trim().min(1).max(5000)}),correction_mode:correctionModeSchema.default("balanced")});
export type TutorTextTurn=z.infer<typeof tutorTextTurnSchema>;

export * from "./placement.js";
export * from "./auth.js";

export * from "./gabroo-speech.js";

export * from "./gabroo-avatar.js";
export * from "./gabroo-conversation.js";

export * from "./gabroo-recognition.js";

export * from "./language-learning.js";

export * from "./lesson-content.js";

export * from "./lesson-exercises.js";
