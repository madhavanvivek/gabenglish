import {z} from "zod";

export const otpChannelSchema=z.enum(["email","phone"]);
export const otpRequestSchema=z.discriminatedUnion("channel",[
 z.object({channel:z.literal("email"),destination:z.string().trim().email().max(254)}),
 z.object({channel:z.literal("phone"),destination:z.string().trim().regex(/^\+[1-9]\d{7,14}$/)})
]);
export type OtpRequest=z.infer<typeof otpRequestSchema>;
export const otpVerifySchema=z.object({challenge_id:z.string().uuid(),code:z.string().regex(/^\d{6}$/)});
export type OtpVerify=z.infer<typeof otpVerifySchema>;
export const otpChallengeResponseSchema=z.object({challenge_id:z.string().uuid(),channel:otpChannelSchema,masked_destination:z.string(),expires_in_seconds:z.number().int().positive(),resend_after_seconds:z.number().int().nonnegative()});

export const authRegisterRequestSchema=z.object({
 email:z.string().trim().email().max(254),
 password:z.string().min(10).max(128),
 display_name:z.string().trim().min(1).max(80).optional()
});
export type AuthRegisterRequest=z.infer<typeof authRegisterRequestSchema>;

export const authLoginRequestSchema=z.object({
 email:z.string().trim().email().max(254),
 password:z.string().min(1).max(128)
});
export type AuthLoginRequest=z.infer<typeof authLoginRequestSchema>;

export const authRefreshRequestSchema=z.object({refresh_token:z.string().min(40).max(256)});
export type AuthRefreshRequest=z.infer<typeof authRefreshRequestSchema>;

export const learnerProfilePatchSchema=z.object({
 display_name:z.string().trim().min(1).max(80).optional(),
 locale:z.string().trim().min(2).max(20).optional(),
 timezone:z.string().trim().min(2).max(80).optional()
}).refine(value=>Object.keys(value).length>0);
export type LearnerProfilePatch=z.infer<typeof learnerProfilePatchSchema>;

export const learnerPreferencesPatchSchema=z.object({
 learning_direction:z.enum(["ml_to_en","en_to_ml"]).optional(),
 support_language:z.enum(["ml","en"]).optional(),
 learning_goal:z.string().trim().max(200).nullable().optional(),
 correction_mode:z.enum(["gentle","balanced","detailed"]).optional(),
 daily_target_minutes:z.number().int().min(1).max(240).optional(),
 reminders_enabled:z.boolean().optional(),
 gabroo_speech_rate:z.number().min(0.75).max(1.5).refine(value=>Math.abs(value*100-Math.round(value*100))<1e-8&&Math.round(value*100)%5===0).optional()
}).refine(value=>Object.keys(value).length>0);
export type LearnerPreferencesPatch=z.infer<typeof learnerPreferencesPatchSchema>;

export const learnerConsentRequestSchema=z.object({
 purpose:z.enum(["voice_processing","voice_retention","transcript_retention","analytics","personalized_learning"]),
 policy_version:z.string().trim().min(1).max(40),
 granted:z.boolean()
});
export type LearnerConsentRequest=z.infer<typeof learnerConsentRequestSchema>;

export const authTokenResponseSchema=z.object({
 access_token:z.string().min(20),
 refresh_token:z.string().min(40),
 token_type:z.literal("Bearer"),
 expires_in:z.number().int().positive()
});
export type AuthTokenResponse=z.infer<typeof authTokenResponseSchema>;
