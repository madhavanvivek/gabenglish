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
 it("passes only bounded learner-owned profile preferences into policy context",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"gentle_correction",supportLanguage:"ml",preferredName:"  Anu K  ",learningGoal:"Speak confidently at work",profileCorrectionPreference:"detailed"});
  expect(policy.learnerContext).toEqual({preferredName:"Anu K",learningGoal:"Speak confidently at work",profileCorrectionPreference:"detailed"});
 });
 it("omits blank profile values rather than inventing learner details",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"free_flow",supportLanguage:"ml",preferredName:" ",learningGoal:null});
  expect(policy.learnerContext).toEqual({});
 });
 it("includes only bounded learner-approved memory entries",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"free_flow",supportLanguage:"ml",learnerMemory:[{category:"saved_phrase",memoryKey:"Useful phrase",content:"Could you please clarify?"}]});
  expect(policy.learnerMemory).toEqual([{category:"saved_phrase",memoryKey:"Useful phrase",content:"Could you please clarify?"}]);
  expect(buildGabrooTeachingPolicy({mode:"free_flow",supportLanguage:"ml"}).learnerMemory).toEqual([]);
 });
 it("adds bounded difficult and due vocabulary without turning chat into forced quizzes",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"free_flow",supportLanguage:"ml",vocabularyFocus:[
   {term:"hesitate",meaning:"to pause before doing something",reason:"difficult"},
   {term:"confident",meaning:"feeling sure of yourself",reason:"due"},
   ...Array.from({length:6},(_,index)=>({term:"word"+index,meaning:"meaning"+index,reason:"due" as const}))
  ]});
  expect(policy.vocabularyFocus).toHaveLength(5);
  expect(policy.vocabularyFocus[0]).toEqual({term:"hesitate",meaning:"to pause before doing something",reason:"difficult"});
  expect(policy.responseGuidance.join(" ")).toContain("Do not turn every conversation into a quiz");
  expect(policy.responseGuidance.join(" ")).toContain("learner is learning English");
  expect(buildGabrooTeachingPolicy({mode:"free_flow",supportLanguage:"ml"}).vocabularyFocus).toEqual([]);
 });
 it("uses only sufficiently evidenced learner skill gaps and avoids proficiency claims",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"gentle_correction",supportLanguage:"ml",skillFocus:[
   {skillKey:"grammar",accuracy:0.4,attemptCount:8},
   {skillKey:"vocabulary",accuracy:0.5,attemptCount:5},
   {skillKey:"pronunciation",accuracy:0.1,attemptCount:4},
   {skillKey:"fluency",accuracy:0.3,attemptCount:9},
   {skillKey:"writing",accuracy:0.2,attemptCount:12}
  ]});
  expect(policy.skillFocus).toHaveLength(3);
  expect(policy.skillFocus.map(item=>item.skillKey)).toEqual(["grammar","vocabulary","fluency"]);
  expect(policy.responseGuidance.join(" ")).toContain("do not invent specific errors");
  expect(buildGabrooTeachingPolicy({mode:"free_flow",supportLanguage:"ml"}).skillFocus).toEqual([]);
 });
 it("defines distinct correction and learning goals for each mode",()=>{
  const modes=["free_flow","gentle_correction","detailed_correction","topic_practice","role_play","vocabulary_building","confidence_practice"] as const;
  const policies=modes.map(mode=>buildGabrooTeachingPolicy({mode,supportLanguage:"en"}));
  expect(new Set(policies.map(x=>x.primaryGoal)).size).toBeGreaterThanOrEqual(5);
 });
 it("keeps English acquisition and Malayalam support as separate language roles",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"gentle_correction",supportLanguage:"ml",learningDirection:"ml_to_en",targetLanguage:"en"});
  expect(policy.learningDirection).toBe("ml_to_en");
  expect(policy.targetLanguage).toBe("en");
  expect(policy.supportLanguage).toBe("ml");
  expect(policy.responseGuidance.join(" ")).toContain("learner is learning English");
 });
 it("teaches Malayalam acquisition through English with script, romanisation and register safeguards",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"topic_practice",supportLanguage:"en",learningDirection:"en_to_ml",targetLanguage:"ml",stage:2});
  expect(policy.learningDirection).toBe("en_to_ml");
  expect(policy.targetLanguage).toBe("ml");
  expect(policy.supportLanguage).toBe("en");
  expect(policy.stageGuidance).toContain("Malayalam Stage 2");
  expect(policy.responseGuidance.join(" ")).toContain("show Malayalam script");
  expect(policy.responseGuidance.join(" ")).toContain("Never assume casual slang");
 });
 it("does not infer a Malayalam proficiency stage when none is supplied",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"free_flow",supportLanguage:"en",learningDirection:"en_to_ml"});
  expect(policy.stageGuidance).toContain("stage is not yet available");
  expect(policy.stageGuidance).toContain("do not infer proficiency");
 });


 it("preserves the target-language contract across every teaching mode and both learning directions",()=>{
  const modes=["free_flow","gentle_correction","detailed_correction","topic_practice","role_play","vocabulary_building","confidence_practice"] as const;
  for(const mode of modes){
   const english=buildGabrooTeachingPolicy({mode,supportLanguage:"ml",learningDirection:"ml_to_en",targetLanguage:"en"});
   expect(english.learningDirection).toBe("ml_to_en");
   expect(english.targetLanguage).toBe("en");
   expect(english.supportLanguage).toBe("ml");
   expect(english.responseGuidance.join(" ")).toContain("learner is learning English");
   const malayalam=buildGabrooTeachingPolicy({mode,supportLanguage:"en",learningDirection:"en_to_ml",targetLanguage:"ml"});
   expect(malayalam.learningDirection).toBe("en_to_ml");
   expect(malayalam.targetLanguage).toBe("ml");
   expect(malayalam.supportLanguage).toBe("en");
   expect(malayalam.responseGuidance.join(" ")).toContain("learner is learning Malayalam");
   expect(malayalam.responseGuidance.join(" ")).toContain("Never assume casual slang");
   expect(malayalam.addressPolicy).toContain("Never use 'eda', 'edi'");
  }
 });
 it("keeps Malayalam script and register guidance available when learning direction is Malayalam",()=>{
  for(const stage of [1,2,3,4,5] as const){
   const policy=buildGabrooTeachingPolicy({mode:"topic_practice",supportLanguage:"en",learningDirection:"en_to_ml",targetLanguage:"ml",stage});
   expect(policy.stageGuidance).toContain(`Malayalam Stage ${stage}`);
   expect(policy.stageGuidance).toContain("register");
  }
 });
});
