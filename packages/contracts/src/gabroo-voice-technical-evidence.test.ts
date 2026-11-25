import {describe,expect,it} from "vitest";
import {summarizeGabrooVoiceTechnicalEvidence,type GabrooVoiceTechnicalEvidence} from "./gabroo-voice-technical-evidence.js";
const evidence=(overrides:Partial<GabrooVoiceTechnicalEvidence>={}):GabrooVoiceTechnicalEvidence=>({
 blindCode:"VOICE-01",providerName:"Provider A",voiceId:"voice-a",modelVersion:"v1",locale:"ml-IN",processingRegion:"ap-south",
 commercialRights:"verified",dataRetentionTerms:"verified",modelTrainingTerms:"verified",evidenceReferences:["terms://reviewed"],
 estimatedCostPerAudioMinuteInr:0.8,estimatedDailyAudioMinutes:30,recordedAt:"2026-11-19T10:00:00+05:30",
 trials:Array.from({length:5},(_,i)=>({trialId:"trial-"+i,device:"Android test device",networkProfile:"wifi" as const,
  firstAudioLatencyMs:100+i*10,fullResponseLatencyMs:800+i*20,interruptedPlaybackRecovered:true,streamingStable:true,
  playbackRate:i===0?1:0.75,slowPlaybackNaturalness:4,failed:false})),...overrides
});
describe("Gabroo voice technical audition evidence",()=>{
 it("summarizes repeated latency, reliability, slow playback and evidence completeness",()=>{
  const result=summarizeGabrooVoiceTechnicalEvidence(evidence());
  expect(result.trialCount).toBe(5);expect(result.medianFirstAudioLatencyMs).toBe(120);
  expect(result.p95FirstAudioLatencyMs).toBe(140);expect(result.medianFullResponseLatencyMs).toBe(840);
  expect(result.failureRatePercent).toBe(0);expect(result.streamingStabilityRatePercent).toBe(100);
  expect(result.slowPlaybackMeanRating).toBe(4);expect(result.eligibleForOwnerReview).toBe(true);
 });
 it("keeps evidence incomplete while rights or terms are pending",()=>{
  const result=summarizeGabrooVoiceTechnicalEvidence(evidence({commercialRights:"pending"}));
  expect(result.eligibleForOwnerReview).toBe(false);
 });
 it("requires at least five trials, evidence references, and both normal and slow speed samples",()=>{
  expect(summarizeGabrooVoiceTechnicalEvidence(evidence({trials:evidence().trials.slice(0,2)})).eligibleForOwnerReview).toBe(false);
  expect(summarizeGabrooVoiceTechnicalEvidence(evidence({evidenceReferences:[]})).eligibleForOwnerReview).toBe(false);
  expect(summarizeGabrooVoiceTechnicalEvidence(evidence({trials:evidence().trials.map(x=>({...x,playbackRate:0.75}))})).eligibleForOwnerReview).toBe(false);
  expect(summarizeGabrooVoiceTechnicalEvidence(evidence({trials:evidence().trials.map(x=>({...x,playbackRate:1}))})).eligibleForOwnerReview).toBe(false);
 });
 it("rejects duplicate trial IDs so repeated rows cannot inflate evidence counts",()=>{
  const first=evidence().trials[0];
  const duplicate={...first,device:"Second Android device"};
  expect(()=>summarizeGabrooVoiceTechnicalEvidence(evidence({trials:[first,duplicate,...evidence().trials.slice(2)]}))).toThrow("Trial IDs must be unique");
 });
 it("rejects inconsistent latency measurements",()=>{
  expect(()=>summarizeGabrooVoiceTechnicalEvidence(evidence({trials:[{...evidence().trials[0],firstAudioLatencyMs:900,fullResponseLatencyMs:800}]}))).toThrow("Full response latency");
 });
});