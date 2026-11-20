import {z} from "zod";

export const placementSkillSchema=z.enum(["vocabulary","grammar","sentence_construction","comprehension","fluency","communication","pronunciation"]);
export type PlacementSkill=z.infer<typeof placementSkillSchema>;
export const placementStageSchema=z.enum(["malayalam_mode","mixed_mode","english_practice","english_immersion","expert_communication"]);
export const placementTurnSchema=z.object({prompt_id:z.string().min(1),response:z.string().trim().min(1).max(5000),response_mode:z.enum(["text","voice"]).default("text")});
export const placementSessionStartSchema=z.object({preferred_language:z.enum(["ml","en","mixed"]).default("ml"),display_name:z.string().trim().min(1).max(80).optional(),communication_style:z.enum(["friendly_respectful","casual","playful","calm_professional"]).default("friendly_respectful")});
export const placementConversationRequestSchema=z.object({session_id:z.string().uuid(),turn:placementTurnSchema});
export const placementEvidenceSchema=z.object({
  prompt_id:z.string().min(1),
  source:z.enum(["text","voice_transcript"]),
  observed_skills:z.array(placementSkillSchema).max(0),
  observations:z.array(z.string()),
  grammar_observations:z.array(z.object({category:z.enum(["subject_verb_agreement","verb_form","past_tense_form"]),example:z.string(),note:z.string()})).max(3),
  sample_size:z.enum(["brief","extended"]),
  limitations:z.array(z.string()),
  metrics:z.object({word_count:z.number().int().nonnegative(),unique_word_count:z.number().int().nonnegative(),unique_word_ratio:z.number().min(0).max(1),average_words_per_sentence:z.number().nonnegative(),sentence_count:z.number().int().nonnegative(),connector_count:z.number().int().nonnegative(),has_past_reference:z.boolean(),has_reasoning_marker:z.boolean()})
});
export const placementSkillFindingSchema=z.object({skill:placementSkillSchema,finding:z.string(),confidence:z.enum(["low","medium","high"]),evidence:z.array(z.string())});
export const placementReportSchema=z.object({
  status:z.literal("provisional"),
  recommendation_status:z.literal("not_yet_available"),
  assessment_mode:z.enum(["text","voice_transcript","mixed"]),
  response_count:z.number().int().nonnegative(),
  extended_samples:z.number().int().nonnegative(),
  brief_samples:z.number().int().nonnegative(),
  response_metrics:z.object({average_words_per_response:z.number().nonnegative(),average_unique_word_ratio:z.number().min(0).max(1),average_words_per_sentence:z.number().nonnegative()}),
  grammar_review_items:z.array(z.object({category:z.enum(["subject_verb_agreement","verb_form","past_tense_form"]),example:z.string(),note:z.string()})).max(8),
  observed_patterns:z.array(z.string()),
  limitations:z.array(z.string()),
  next_steps:z.array(z.string())
});
export const placementConversationResponseSchema=z.object({session_id:z.string().uuid(),prompt_id:z.string(),gabroo_message:z.string(),difficulty_band:z.number().int().min(1).max(5),turn_number:z.number().int().positive(),is_complete:z.boolean(),report:placementReportSchema.optional(),gabroo_explanation:z.string().optional(),evidence:z.array(placementEvidenceSchema).optional()});
export type PlacementReport=z.infer<typeof placementReportSchema>;
export type PlacementConversationResponse=z.infer<typeof placementConversationResponseSchema>;
export type PlacementSessionStart=z.infer<typeof placementSessionStartSchema>;
export type PlacementConversationRequest=z.infer<typeof placementConversationRequestSchema>;
export type PlacementEvidence=z.infer<typeof placementEvidenceSchema>;
export const placementAnswerSchema=z.object({question_id:z.string().min(1),option_id:z.string().min(1)});
export const placementSubmissionSchema=z.object({answers:z.array(placementAnswerSchema).min(1).max(20)});
export type PlacementSubmission=z.infer<typeof placementSubmissionSchema>;
export const placementResultSchema=z.object({score:z.number().int().min(0),total:z.number().int().positive(),percentage:z.number().min(0).max(100),suggested_stage:placementStageSchema,notice:z.string()});
export type PlacementResult=z.infer<typeof placementResultSchema>;
