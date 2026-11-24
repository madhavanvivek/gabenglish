import {describe,it,expect} from "vitest";
import {chooseGabrooLearningDecision,estimateGabrooSkills,type GabrooSkillEvidence} from "./gabroo-learning-model.js";

const evidence:GabrooSkillEvidence[]=[
 {skill:"grammar",score:0.35,confidence:0.9,source:"placement_assessment",observedAt:"2026-11-20T10:00:00.000Z",taskId:"placement-1"},
 {skill:"grammar",score:0.45,confidence:0.8,source:"conversation",observedAt:"2026-11-21T10:00:00.000Z",taskId:"conversation-2"},
 {skill:"vocabulary",score:0.8,confidence:0.9,source:"placement_assessment",observedAt:"2026-11-20T10:00:00.000Z",taskId:"placement-1"},
 {skill:"vocabulary",score:0.75,confidence:0.8,source:"conversation",observedAt:"2026-11-21T10:00:00.000Z",taskId:"conversation-2"}
];

describe("Gabroo Learning Intelligence Model v1",()=>{
 it("does not infer proficiency when no evidence exists",()=>{
  const decision=chooseGabrooLearningDecision({evidence:[],learningDirection:"ml_to_en"});
  expect(decision.status).toBe("needs_placement");
  expect(decision.focusSkill).toBeNull();
  expect(decision.activity).toBe("placement_task");
  expect(decision.evidenceUsed).toBe(0);
 });
 it("aggregates skill evidence with confidence weighting",()=>{
  const result=estimateGabrooSkills(evidence);
  const grammar=result.find(item=>item.skill==="grammar");
  expect(grammar?.score).toBe(0.4);
  expect(grammar?.evidenceCount).toBe(2);
 });
 it("ignores malformed, unlinked or out-of-range observations",()=>{
  const result=estimateGabrooSkills([
   ...evidence,
   {skill:"grammar",score:2,confidence:1,source:"conversation",observedAt:"2026-11-22T00:00:00Z",taskId:"bad-score"},
   {skill:"grammar",score:0.1,confidence:1,source:"conversation",observedAt:"not-a-date",taskId:"bad-date"},
   {skill:"grammar",score:0.1,confidence:1,source:"conversation",observedAt:"2026-11-22T00:00:00Z",taskId:" "}
  ]);
  expect(result.find(item=>item.skill==="grammar")?.evidenceCount).toBe(2);
 });
 it("chooses a repeatedly evidenced weakest skill, not a single low score",()=>{
  const decision=chooseGabrooLearningDecision({evidence,learningDirection:"ml_to_en"});
  expect(decision.status).toBe("practice_recommendation");
  expect(decision.focusSkill).toBe("grammar");
  expect(decision.activity).toBe("guided_example");
  expect(decision.targetLanguage).toBe("en");
  expect(decision.supportLanguage).toBe("ml");
 });
 it("uses a balanced activity when evidence is not repeated or reliable enough",()=>{
  const decision=chooseGabrooLearningDecision({evidence:[evidence[0]!],learningDirection:"en_to_ml"});
  expect(decision.status).toBe("balanced_practice");
  expect(decision.focusSkill).toBeNull();
  expect(decision.targetLanguage).toBe("ml");
  expect(decision.supportLanguage).toBe("en");
 });
 it("respects a request for free conversation instead of forcing instruction",()=>{
  const decision=chooseGabrooLearningDecision({evidence,learningDirection:"ml_to_en",learnerAskedForFreeConversation:true});
  expect(decision.status).toBe("balanced_practice");
  expect(decision.activity).toBe("speaking_prompt");
  expect(decision.correctionStyle).toBe("none");
  expect(decision.focusSkill).toBeNull();
 });
 it("uses spaced-repetition context for due vocabulary practice",()=>{
  const vocabularyEvidence:GabrooSkillEvidence[]=[
   {skill:"vocabulary",score:0.4,confidence:0.9,source:"placement_assessment",observedAt:"2026-11-20T10:00:00Z",taskId:"p1"},
   {skill:"vocabulary",score:0.45,confidence:0.9,source:"conversation",observedAt:"2026-11-21T10:00:00Z",taskId:"c1"}
  ];
  const decision=chooseGabrooLearningDecision({evidence:vocabularyEvidence,learningDirection:"ml_to_en",dueVocabularyCount:3});
  expect(decision.focusSkill).toBe("vocabulary");
  expect(decision.activity).toBe("retrieval_practice");
 });
});
