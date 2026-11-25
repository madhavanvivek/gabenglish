import {describe,it,expect} from "vitest";
import {buildGabrooLessonBlueprint} from "./gabroo-lesson-planner.js";
import type {GabrooLearningDecision} from "./gabroo-learning-model.js";

const decision=(overrides:Partial<GabrooLearningDecision>={}):GabrooLearningDecision=>({
 status:"practice_recommendation",focusSkill:"grammar",
 reason:"Repeated evidence identifies grammar as a practice focus.",
 activity:"guided_example",correctionStyle:"gentle",
 targetLanguage:"en",supportLanguage:"ml",evidenceUsed:4,...overrides
});

describe("Gabroo adaptive lesson planner",()=>{
 it("builds a diagnostic activity without inventing a level when evidence is absent",()=>{
  const plan=buildGabrooLessonBlueprint(decision({
   status:"needs_placement",focusSkill:null,activity:"placement_task",evidenceUsed:0
  }));
  expect(plan.format).toBe("diagnostic_check");
  expect(plan.focus_skill).toBeNull();
  expect(plan.scoring_boundary).toContain("Do not infer a level");
 });
 it("builds a grammar example-to-recall sequence",()=>{
  const plan=buildGabrooLessonBlueprint(decision());
  expect(plan.format).toBe("guided_example_then_recall");
  expect(plan.steps.length).toBeGreaterThanOrEqual(4);
  expect(plan.target_language).toBe("en");
  expect(plan.support_language).toBe("ml");
 });
 it("routes due vocabulary to spaced retrieval",()=>{
  const plan=buildGabrooLessonBlueprint(decision({
   focusSkill:"vocabulary",activity:"retrieval_practice"
  }));
  expect(plan.format).toBe("spaced_retrieval");
  expect(plan.completion_check).toContain("target word");
 });
 it("requires validated audio for pronunciation and fluency",()=>{
  for(const skill of ["pronunciation","fluency"] as const){
   const plan=buildGabrooLessonBlueprint(decision({
    focusSkill:skill,activity:"speaking_prompt"
   }));
   expect(plan.scoring_boundary).toContain("validated audio");
  }
 });
 it("keeps free conversation balanced and non-corrective",()=>{
  const plan=buildGabrooLessonBlueprint(decision({
   status:"balanced_practice",focusSkill:null,activity:"speaking_prompt",correctionStyle:"none"
  }));
  expect(plan.focus_skill).toBeNull();
  expect(plan.correction_style).toBe("none");
 });
 it("uses learner self-report rather than inferred confidence",()=>{
  const plan=buildGabrooLessonBlueprint(decision({
   focusSkill:"confidence",activity:"confidence_prompt",correctionStyle:"none"
  }));
  expect(plan.format).toBe("confidence_warmup");
  expect(plan.scoring_boundary).toContain("learner self-report");
 });
});
