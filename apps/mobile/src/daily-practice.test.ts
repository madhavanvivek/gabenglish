import {describe,expect,it} from "vitest";
import {buildDailySpeakingChallenge,localPracticeDateKey} from "./daily-practice.js";
describe("daily speaking challenge",()=>{
 it("formats the learner device-local calendar date without UTC conversion",()=>{
  const date=new Date(2026,10,25,23,45,0);
  expect(localPracticeDateKey(date)).toBe("2026-11-25");
 });
 it("returns a stable challenge for the same calendar date",()=>{
  expect(buildDailySpeakingChallenge("2026-11-25")).toEqual(buildDailySpeakingChallenge("2026-11-25"));
 });
 it("rotates the general challenge across dates",()=>{
  expect(buildDailySpeakingChallenge("2026-11-25").title).not.toBe(buildDailySpeakingChallenge("2026-11-26").title);
 });
 it("chooses the weakest skill with enough evidence for a practice opportunity",()=>{
  const challenge=buildDailySpeakingChallenge("2026-11-25",[
   {skill_key:"vocabulary",attempt_count:8,accuracy:.4,evidence_status:"practice_opportunity"},
   {skill_key:"grammar",attempt_count:7,accuracy:.6,evidence_status:"developing_exercise_performance"},
   {skill_key:"fluency",attempt_count:2,accuracy:.2,evidence_status:"building_evidence"}
  ]);
  expect(challenge.skillKey).toBe("vocabulary");
  expect(challenge.focus).toBe("Use precise words");
 });
 it("does not infer a weakness from insufficient or strong evidence",()=>{
  const challenge=buildDailySpeakingChallenge("2026-11-25",[
   {skill_key:"grammar",attempt_count:2,accuracy:.2,evidence_status:"building_evidence"},
   {skill_key:"vocabulary",attempt_count:10,accuracy:.9,evidence_status:"strong_exercise_performance"}
  ]);
  expect(challenge.skillKey).toBeNull();
 });
 it("provides a general practice when no skill evidence exists",()=>{
  expect(buildDailySpeakingChallenge("2026-11-25").skillKey).toBeNull();
 });
});
