import {describe,it,expect} from "vitest";
import {buildGabrooTeachingPolicy} from "./gabroo-teaching-policy.js";

describe("Gabroo stage-aware bilingual teaching context",()=>{
 it("uses the learner's selected English stage and Malayalam support direction",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"free_flow",supportLanguage:"ml",learningDirection:"ml_to_en",targetLanguage:"en",stage:2});
  expect(policy.learningDirection).toBe("ml_to_en");
  expect(policy.targetLanguage).toBe("en");
  expect(policy.stageGuidance).toContain("Stage 2 Malayalam + English Mix");
 });
 it("switches stage guidance and target language for English speakers learning Malayalam",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"free_flow",supportLanguage:"en",learningDirection:"en_to_ml",targetLanguage:"ml",stage:4});
  expect(policy.learningDirection).toBe("en_to_ml");
  expect(policy.targetLanguage).toBe("ml");
  expect(policy.stageGuidance).toContain("Malayalam Stage 4");
  expect(policy.responseGuidance.join(" ")).toContain("Keep Malayalam as the learning target");
 });
 it("does not invent a confirmed stage when none has been selected",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"free_flow",supportLanguage:"ml",learningDirection:"ml_to_en",targetLanguage:"en"});
  expect(policy.stageGuidance).toContain("stage is not yet available");
 });
});
