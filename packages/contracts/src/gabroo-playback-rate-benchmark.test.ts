import {describe,expect,it} from "vitest";
import {GABROO_PLAYBACK_RATE_TEST_POINTS,GABROO_PLAYBACK_RATE_LIMITS,summarizeGabrooPlaybackRateTrials,type GabrooPlaybackRateTrial} from "./gabroo-playback-rate-benchmark.js";
const trial=(overrides:Partial<GabrooPlaybackRateTrial>={}):GabrooPlaybackRateTrial=>({trialId:"trial-1",blindCode:"VOICE-01",device:"Android test device",networkProfile:"wifi",requestedRate:0.75,appliedRate:0.75,playbackMethod:"client_rate_adjustment",intelligibility:5,naturalness:4,audibleArtifacts:[],completed:true,...overrides});
describe("Gabroo learner playback-speed benchmark",()=>{
 it("uses the approved learner speed range and test points",()=>{expect(GABROO_PLAYBACK_RATE_LIMITS).toEqual({min:0.75,max:1.5,step:0.05});expect(GABROO_PLAYBACK_RATE_TEST_POINTS).toEqual([0.75,0.85,1,1.15,1.3,1.5]);});
 it("summarizes intelligibility, naturalness and artifacts separately",()=>{
  const rows=summarizeGabrooPlaybackRateTrials([trial(),trial({trialId:"trial-2",intelligibility:3,naturalness:2,audibleArtifacts:["pitch_distortion","choppy_audio"],completed:false})]);
  expect(rows[0].trialCount).toBe(2);expect(rows[0].completedCount).toBe(1);expect(rows[0].meanIntelligibility).toBe(4);
  expect(rows[0].meanNaturalness).toBe(3);expect(rows[0].artifactCount).toBe(2);expect(rows[0].clientRateTrials).toBe(2);
 });
 it("does not count provider re-synthesis as learner-controlled playback",()=>{
  const rows=summarizeGabrooPlaybackRateTrials([trial({playbackMethod:"provider_resynthesis"})]);
  expect(rows[0].clientRateTrials).toBe(0);expect(rows[0].providerResynthesisTrials).toBe(1);
 });
 it("rejects requested/applied rate mismatches and duplicate trial IDs",()=>{
  expect(()=>summarizeGabrooPlaybackRateTrials([trial({appliedRate:1})])).toThrow("must match");
  expect(()=>summarizeGabrooPlaybackRateTrials([trial(),trial()])).toThrow("Duplicate playback-rate trial ID");
 });
 it("rejects rates outside the learner control range",()=>{expect(()=>summarizeGabrooPlaybackRateTrials([trial({requestedRate:0.5 as 0.75})])).toThrow("Invalid playback-rate trial");});
});