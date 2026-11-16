import {describe,expect,it} from "vitest";
import {learnerPreferencesPatchSchema,otpRequestSchema,otpVerifySchema} from "./auth.js";

describe("passwordless OTP contracts",()=>{
 it("accepts any syntactically valid email address",()=>{
  expect(otpRequestSchema.safeParse({channel:"email",destination:"learner@yahoo.com"}).success).toBe(true);
  expect(otpRequestSchema.safeParse({channel:"email",destination:"learner@outlook.com"}).success).toBe(true);
 });
 it("requires E.164 phone format",()=>{
  expect(otpRequestSchema.safeParse({channel:"phone",destination:"+919876543210"}).success).toBe(true);
  expect(otpRequestSchema.safeParse({channel:"phone",destination:"9876543210"}).success).toBe(false);
 });
 it("requires a six-digit code and UUID challenge",()=>{
  expect(otpVerifySchema.safeParse({challenge_id:"550e8400-e29b-41d4-a716-446655440000",code:"123456"}).success).toBe(true);
  expect(otpVerifySchema.safeParse({challenge_id:"550e8400-e29b-41d4-a716-446655440000",code:"12345"}).success).toBe(false);
  expect(otpVerifySchema.safeParse({challenge_id:"not-a-uuid",code:"123456"}).success).toBe(false);
 });
});


describe("learner Gabroo speech preferences",()=>{
 it("accepts playback rates in the supported range",()=>{
  expect(learnerPreferencesPatchSchema.safeParse({gabroo_speech_rate:0.75}).success).toBe(true);
  expect(learnerPreferencesPatchSchema.safeParse({gabroo_speech_rate:1}).success).toBe(true);
  expect(learnerPreferencesPatchSchema.safeParse({gabroo_speech_rate:1.5}).success).toBe(true);
  expect(learnerPreferencesPatchSchema.safeParse({gabroo_speech_rate:0.85}).success).toBe(true);
 });
 it("rejects playback rates outside the supported range",()=>{
  expect(learnerPreferencesPatchSchema.safeParse({gabroo_speech_rate:0.7}).success).toBe(false);
  expect(learnerPreferencesPatchSchema.safeParse({gabroo_speech_rate:1.51}).success).toBe(false);
  expect(learnerPreferencesPatchSchema.safeParse({gabroo_speech_rate:1.03}).success).toBe(false);
 });
});
