import {describe,expect,it} from "vitest";
import {summarizeGabrooSpeechHumanReviews,type GabrooSpeechHumanReview} from "./gabroo-speech-benchmark-human-review.js";
const review=(overrides:Partial<GabrooSpeechHumanReview>={}):GabrooSpeechHumanReview=>({
 candidateId:"candidate-a",sampleId:"ml-01",mode:"ml-en",environment:"quiet",
 reviewerLabel:"reviewer-1",meaningPreservation:5,codeSwitchHandling:4,
 readability:4,intelligibility:5,issueTags:[],...overrides
});
describe("Gabroo speech human review scoring",()=>{
 it("summarizes independent ratings and flags disagreement or missing second review",()=>{
  const summary=summarizeGabrooSpeechHumanReviews([
   review(),review({reviewerLabel:"reviewer-2",meaningPreservation:2,codeSwitchHandling:2})
  ])[0];
  expect(summary.reviewedSamples).toBe(1);
  expect(summary.reviewerCount).toBe(2);
  expect(summary.meanMeaningPreservation).toBe(3.5);
  expect(summary.meanCodeSwitchHandling).toBe(3);
  expect(summary.samplesNeedingAdjudication).toEqual(["ml-01"]);
 });
 it("requires code-switch rating only for mixed-language samples",()=>{
  expect(()=>summarizeGabrooSpeechHumanReviews([review({codeSwitchHandling:undefined})])).toThrow("require a code-switch");
  expect(()=>summarizeGabrooSpeechHumanReviews([review({mode:"ml-IN"})])).toThrow("only applicable");
 });
 it("rejects duplicate reviewer submissions and out-of-range ratings",()=>{
  expect(()=>summarizeGabrooSpeechHumanReviews([review(),review()])).toThrow("Duplicate reviewer");
  expect(()=>summarizeGabrooSpeechHumanReviews([review({meaningPreservation:6})])).toThrow("Invalid human review");
 });
 it("does not treat one reviewer as a complete double-review",()=>{
  const summary=summarizeGabrooSpeechHumanReviews([review({mode:"ml-IN",codeSwitchHandling:undefined})])[0];
  expect(summary.samplesNeedingAdjudication).toEqual(["ml-01"]);
  expect(summary.meanCodeSwitchHandling).toBeNull();
 });
});
