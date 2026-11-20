import {describe,it,expect} from "vitest";
import {evaluateGabrooConversationTurn} from "./gabroo-conversation-quality.js";

describe("Gabroo conversation quality signals",()=>{
 it("rewards a concise response that invites a short-answer learner to elaborate",()=>{
  const result=evaluateGabrooConversationTurn({learnerMessage:"I like football.",gabrooReply:"Nice! What do you enjoy most about football—the teamwork, the excitement, or something else?"});
  expect(result.checks.concise).toBe(true);
  expect(result.checks.asksAtMostOneQuestion).toBe(true);
  expect(result.checks.encouragesLearnerToElaborate).toBe(true);
  expect(result.flags).not.toContain("missing_invitation_after_short_answer");
 });
 it("flags multiple questions and an overlong response",()=>{
  const result=evaluateGabrooConversationTurn({learnerMessage:"I enjoy reading books.",gabrooReply:Array.from({length:100},()=>"reading books are interesting").join(" ")+ " What do you read? Why do you like it?"});
  expect(result.flags).toContain("overlong_reply");
  expect(result.flags).toContain("multiple_questions");
 });
 it("flags a short answer that receives no opportunity to expand",()=>{
  const result=evaluateGabrooConversationTurn({learnerMessage:"Maybe.",gabrooReply:"That is fine. I understand."});
  expect(result.flags).toContain("missing_invitation_after_short_answer");
 });
 it("detects a generic prompt repeated from the previous turn",()=>{
  const result=evaluateGabrooConversationTurn({learnerMessage:"I enjoy cooking.",previousGabrooReplies:["Tell me more."],gabrooReply:"Tell me more."});
  expect(result.flags).toContain("repeated_generic_prompt");
  expect(result.checks.avoidsRepeatedGenericPrompt).toBe(false);
 });
 it("does not demand a follow-up when a short learner turn is a direct question",()=>{
  const result=evaluateGabrooConversationTurn({learnerMessage:"Why?",gabrooReply:"Because the process needs more time."});
  expect(result.flags).not.toContain("missing_invitation_after_short_answer");
 });
 it("reports observable signals without pretending to judge semantic correctness",()=>{
  const result=evaluateGabrooConversationTurn({learnerMessage:"Online classes save travel time.",gabrooReply:"That sounds useful. How does saving travel time change your daily routine?"});
  expect(result.evidence.questionCount).toBe(1);
  expect(result.evidence.replyWordCount).toBeGreaterThan(0);
  expect(result.evidence.learnerKeywordOverlap).toBeGreaterThan(0);
  expect(result.score).toBeGreaterThanOrEqual(0);
  expect(result.score).toBeLessThanOrEqual(100);
 });
 it("does not penalise a thoughtful response for a learner who asked a direct question",()=>{
  const result=evaluateGabrooConversationTurn({learnerMessage:"Why is the sky blue?",gabrooReply:"Sunlight contains many colours. Air molecules scatter blue light more strongly than most other colours. Would you like a simple example?"});
  expect(result.flags).not.toContain("missing_invitation_after_short_answer");
 });
});
