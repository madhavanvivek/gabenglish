import {describe,expect,it} from "vitest";
import {summarizeGabrooSpeechHumanReviews,type GabrooSpeechHumanReview} from "./gabroo-speech-benchmark-human-review.js";
const review=(overrides:Partial<GabrooSpeechHumanReview>={}):GabrooSpeechHumanReview=>({
 candidateId:"candidate-a",sampleId:"ml-01",mode:"ml-en",environment:"quiet",
 reviewerLabel:"reviewer-1",meaningPreservation:5,contentCompleteness:5,languageFidelity:5,codeSwitchHandling:4,
 readability:4,intelligibility:5,issueTags:[],...overrides
});
describe("Gabroo speech human review scoring",()=>{
 it("summarizes independent ratings and flags disagreement or missing second review",()=>{
  const summary=summarizeGabrooSpeechHumanReviews([
   review(),review({reviewerLabel:"reviewer-2",meaningPreservation:2,codeSwitchHandling:2})
  ])[0];
  expect(summary.reviewedSamples).toBe(1);
  expect(summary.reviewerCount).toBe(2);
  expect(summary.reviewerPairs).toBe(6);
  expect(summary.meanAbsoluteRatingDifference).toBe(0.83);
  expect(summary.exactRatingAgreementPercent).toBe(66.67);
  expect(summary.meanMeaningPreservation).toBe(3.5);
  expect(summary.meanContentCompleteness).toBe(5);
  expect(summary.meanLanguageFidelity).toBe(5);
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
 it("flags critical omissions even when numeric ratings do not disagree",()=>{
  const summary=summarizeGabrooSpeechHumanReviews([
   review({issueTags:["key_content_omitted"]}),
   review({reviewerLabel:"reviewer-2",issueTags:[]})
  ])[0];
  expect(summary.samplesNeedingAdjudication).toEqual(["ml-01"]);
 });
 it("tracks content completeness and language fidelity separately",()=>{
  const summary=summarizeGabrooSpeechHumanReviews([
   review({contentCompleteness:2,languageFidelity:4}),
   review({reviewerLabel:"reviewer-2",contentCompleteness:4,languageFidelity:5})
  ])[0];
  expect(summary.meanContentCompleteness).toBe(3);
  expect(summary.meanLanguageFidelity).toBe(4.5);
  expect(summary.samplesNeedingAdjudication).toEqual(["ml-01"]);
 });
});
