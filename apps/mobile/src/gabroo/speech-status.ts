import { z } from "zod";

export const gabrooSpeechStatusSchema = z.object({
  available: z.boolean(),
  supported_languages: z.array(z.enum(["ml", "en"])).min(1).max(2),
  speech_rate: z.object({
    minimum: z.number().finite().min(0.5).max(1.5),
    maximum: z.number().finite().min(0.5).max(2),
  }).strict().refine(value => value.minimum < value.maximum, "Speech-rate minimum must be below maximum."),
  consent_required: z.literal(true),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.supported_languages).size !== value.supported_languages.length) {
    ctx.addIssue({ code: "custom", path: ["supported_languages"], message: "Supported languages must be unique." });
  }
});

export type GabrooSpeechStatus = z.infer<typeof gabrooSpeechStatusSchema>;

export function parseGabrooSpeechStatus(value: unknown): GabrooSpeechStatus {
  return gabrooSpeechStatusSchema.parse(value);
}
