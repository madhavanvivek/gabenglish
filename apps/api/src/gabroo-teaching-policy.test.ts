import {describe,it,expect} from "vitest";
import {buildGabrooTeachingPolicy} from "./gabroo-teaching-policy.js";

describe("Gabroo teaching policy",()=>{
 it("keeps free-flow conversation natural and correction-light",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"free_flow",supportLanguage:"ml"});
  expect(policy.correction).toBe("none");
  expect(policy.primaryGoal).toBe("communicate");
  expect(policy.responseGuidance.some(x=>x.includes("natural conversation"))).toBe(true);
 });
 it("enforces respectful neutral address by default",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"gentle_correction",supportLanguage:"ml"});
  expect(policy.addressPolicy).toContain("Never use 'eda', 'edi'");
  expect(policy.addressPolicy).toContain("respectful neutral language");
 });
 it("adapts guidance to all five learner stages without claiming a stage when unknown",()=>{
  for(const stage of [1,2,3,4,5] as const){
   expect(buildGabrooTeachingPolicy({mode:"topic_practice",supportLanguage:"ml",stage}).stageGuidance).toContain(`Stage ${stage}`);
  }
  expect(buildGabrooTeachingPolicy({mode:"topic_practice",supportLanguage:"ml"}).stageGuidance).toContain("not yet available");
 });
 it("defines distinct correction and learning goals for each mode",()=>{
  const modes=["free_flow","gentle_correction","detailed_correction","topic_practice","role_play","vocabulary_building","confidence_practice"] as const;
  const policies=modes.map(mode=>buildGabrooTeachingPolicy({mode,supportLanguage:"en"}));
  expect(new Set(policies.map(x=>x.primaryGoal)).size).toBeGreaterThanOrEqual(5);
 });
});
