import {describe,expect,it} from "vitest";
import {summarizeGabrooVoiceAuditions,type GabrooVoiceAuditionReview} from "./gabroo-voice-audition.js";
const review=(overrides:Partial<GabrooVoiceAuditionReview>={}):GabrooVoiceAuditionReview=>({
 blindCode:"VOICE-01",reviewerLabel:"reviewer-1",
 ratings:{keralaMalayalamAuthenticity:5,malayalamPronunciation:5,codeSwitching:5,englishTeachingClarity:5,warmthRespect:5,energyPersonality:5,gentleHumour:5,emotionalRange:5,longSessionComfort:5,slowSpeedIntelligibility:5},
 ratingEvidence:{
  keralaMalayalamAuthenticity:"Natural local intonation in the full sample.",
  malayalamPronunciation:"Clear vowels and consonants.",
  codeSwitching:"Transitions are fluent and understandable.",
  englishTeachingClarity:"Teaching sentence is clear.",
  warmthRespect:"Warm, respectful delivery.",
  energyPersonality:"Lively without shouting.",
  gentleHumour:"Humour remains kind.",
  emotionalRange:"Patient and encouraging tone.",
  longSessionComfort:"Comfortable over repeated listening.",
  slowSpeedIntelligibility:"Clear at the tested slow rate."
 },
 rejectionGates:[],...overrides
});
describe("Gabroo blind voice audition scorecards",()=>{
 it("scores each reviewer independently and requires three reviewers for owner review",()=>{
  const result=summarizeGabrooVoiceAuditions([review(),review({reviewerLabel:"reviewer-2"}),review({reviewerLabel:"reviewer-3"})])[0];
  expect(result.reviewerCount).toBe(3);expect(result.meanWeightedScore).toBe(100);
  expect(result.scoreRange).toEqual({min:100,max:100});expect(result.eligibleForOwnerReview).toBe(true);
 });
 it("does not allow a high score to compensate for a rejection gate",()=>{
  const result=summarizeGabrooVoiceAuditions([review({rejectionGates:["overfamiliar_address"],evidenceNotes:"The sample uses an over-familiar form of address."}),review({reviewerLabel:"reviewer-2"}),review({reviewerLabel:"reviewer-3"})])[0];
  expect(result.meanWeightedScore).toBe(100);expect(result.eligibleForOwnerReview).toBe(false);
  expect(result.rejectionGates).toEqual(["overfamiliar_address"]);
 });
 it("keeps incomplete review sets ineligible and rejects duplicate reviewers",()=>{
  expect(summarizeGabrooVoiceAuditions([review()])[0].eligibleForOwnerReview).toBe(false);
  expect(()=>summarizeGabrooVoiceAuditions([review(),review()])).toThrow("Duplicate reviewer");
 });
 it("normalizes reviewer labels and rejects case/whitespace duplicate identities",()=>{
  expect(()=>summarizeGabrooVoiceAuditions([
   review({reviewerLabel:" Kerala Reviewer "}),
   review({reviewerLabel:"kerala reviewer"})
  ])).toThrow("Duplicate reviewer");
  const result=summarizeGabrooVoiceAuditions([review({reviewerLabel:"  Reviewer One  "})])[0];
  expect(result.weightedScoresByReviewer[0].reviewerLabel).toBe("Reviewer One");
 });
 it("requires evidence notes for extreme ratings and rejection gates",()=>{
  const noExtremeEvidence={...review(),ratingEvidence:{...review().ratingEvidence,keralaMalayalamAuthenticity:undefined}};
  expect(()=>summarizeGabrooVoiceAuditions([noExtremeEvidence])).toThrow("Add a short evidence note");
  expect(()=>summarizeGabrooVoiceAuditions([review({rejectionGates:["overfamiliar_address"]})])).toThrow("Explain the observed rejection gate");
 });
 it("validates the fixed 1-to-5 rubric",()=>{
  expect(()=>summarizeGabrooVoiceAuditions([review({ratings:{...review().ratings,slowSpeedIntelligibility:6}})])).toThrow("Invalid voice audition review");
 });
});