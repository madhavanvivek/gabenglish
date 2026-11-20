import {describe,it,expect} from "vitest";
import {buildGabrooTeachingPolicy,buildGabrooLearnerTurnGuidance} from "./gabroo-teaching-policy.js";

describe("Gabroo learner-turn adaptation",()=>{
 it("encourages a small expansion after a brief answer",()=>{
  const guidance=buildGabrooLearnerTurnGuidance({latestLearnerMessage:"I like it."});
  expect(guidance).toContain("contribution is brief");
  expect(guidance).toContain("one small expansion");
 });
 it("answers direct questions before inviting further discussion",()=>{
  for(const message of ["Why does this happen?","How can I improve my English","എങ്ങനെ ഇത് ചെയ്യാം?"]){
   const guidance=buildGabrooLearnerTurnGuidance({latestLearnerMessage:message});
   expect(guidance).toContain("Answer that question clearly first");
   expect(guidance).toContain("Do not withhold the answer");
  }
 });
 it("resolves explicit confusion before asking the learner to elaborate",()=>{
  for(const message of ["I don't understand","I'm confused","Please explain this again","എനിക്ക് മനസ്സിലായില്ല"]){
   const guidance=buildGabrooLearnerTurnGuidance({latestLearnerMessage:message});
   expect(guidance).toContain("Answer that question clearly first");
   expect(guidance).toContain("Do not withhold the answer");
  }
 });
 it("deepens a substantial contribution instead of asking the learner to repeat it",()=>{
  const message="I believe technology can improve education because students can learn at their own pace, explore difficult subjects in different ways, receive immediate feedback, and practise skills whenever they have time.";
  const guidance=buildGabrooLearnerTurnGuidance({latestLearnerMessage:message});
  expect(guidance).toContain("substantial contribution");
  expect(guidance).toContain("one thoughtful follow-up");
 });
 it("uses a relevant follow-up for a moderate contribution",()=>{
  const guidance=buildGabrooLearnerTurnGuidance({latestLearnerMessage:"I use online lessons because they are flexible for my work schedule."});
  expect(guidance).toContain("moderate amount");
  expect(guidance).toContain("moves their idea forward");
 });
 it("does not assume an interest before the learner has spoken",()=>{
  expect(buildGabrooLearnerTurnGuidance({})).toContain("do not assume an interest");
 });
 it("adds adaptive guidance to the model policy using the current learner message",()=>{
  const policy=buildGabrooTeachingPolicy({mode:"free_flow",supportLanguage:"ml",latestLearnerMessage:"I like it."});
  expect(policy.responseGuidance.join(" ")).toContain("contribution is brief");
 });
});

describe("Gabroo teaching policy",()=>{
 it("prioritises learner participation while allowing concise knowledge contributions in every mode",()=>{
  const modes=["free_flow","gentle_correction","detailed_correction","topic_practice","role_play","vocabulary_building","confidence_practice"] as const;
  for(const mode of modes){
   const guidance=buildGabrooTeachingPolicy({mode,supportLanguage:"ml"}).responseGuidance.join(" ");
   expect(guidance).toContain("help the learner express more of their own ideas");
   expect(guidance).toContain("listen–contribute–invite–listen");
   expect(guidance).toContain("invite elaboration");
   expect(guidance).toContain("Follow the learner’s chosen thread");
   expect(guidance).toContain("Do not correct every sentence");
  }
 });
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

});
