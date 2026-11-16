import {describe,expect,it} from "vitest";
import {otpRequestSchema,otpVerifySchema} from "./auth.js";

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
