import {describe,expect,it} from "vitest";
import {buildGabrooVoiceAuditionComparison,gabrooVoiceOwnerDecisionSchema} from "./gabroo-voice-audition-comparison.js";
import type {GabrooVoiceAuditionReview} from "./gabroo-voice-audition.js";
import type {GabrooVoiceTechnicalEvidence} from "./gabroo-voice-technical-evidence.js";
import type {GabrooPlaybackRateTrial} from "./gabroo-playback-rate-benchmark.js";
const review=(blindCode:"VOICE-01"|"VOICE-02"|"VOICE-03",reviewerLabel:string):GabrooVoiceAuditionReview=>({blindCode,reviewerLabel,ratings:{keralaMalayalamAuthenticity:5,malayalamPronunciation:5,codeSwitching:5,englishTeachingClarity:5,warmthRespect:5,energyPersonality:5,gentleHumour:5,emotionalRange:5,longSessionComfort:5,slowSpeedIntelligibility:5},rejectionGates:[]});
const technical=(blindCode:"VOICE-01"|"VOICE-02"|"VOICE-03"):GabrooVoiceTechnicalEvidence=>({blindCode,providerName:"Provider",voiceId:"voice",modelVersion:"v1",locale:"ml-IN",processingRegion:"ap-south",commercialRights:"verified",dataRetentionTerms:"verified",modelTrainingTerms:"verified",evidenceReferences:["terms-reviewed"],estimatedCostPerAudioMinuteInr:1,estimatedDailyAudioMinutes:20,recordedAt:"2026-11-19T10:00:00+05:30",trials:Array.from({length:5},(_,i)=>({trialId:"trial-"+i,device:"Android",networkProfile:"wifi",firstAudioLatencyMs:100+i*10,fullResponseLatencyMs:700+i*10,interruptedPlaybackRecovered:true,streamingStable:true,playbackRate:0.75,slowPlaybackNaturalness:4,failed:false}))});
describe("Gabroo unified voice audition packet",()=>{
 it("combines blind ratings and technical measurements without ranking",()=>{
  const rows=buildGabrooVoiceAuditionComparison(["VOICE-01","VOICE-02","VOICE-03"].flatMap(code=>[review(code as "VOICE-01"|"VOICE-02"|"VOICE-03","r1"),review(code as "VOICE-01"|"VOICE-02"|"VOICE-03","r2"),review(code as "VOICE-01"|"VOICE-02"|"VOICE-03","r3")]),[technical("VOICE-01")]);
  expect(rows).toHaveLength(3);expect(rows[0].blindCode).toBe("VOICE-01");
  expect(rows[0].reviewerEvidenceComplete).toBe(true);expect(rows[0].technicalEvidenceComplete).toBe(true);expect(rows[0].eligibleForOwnerReview).toBe(true);
  expect(rows[1].eligibleForOwnerReview).toBe(false);expect(rows[1].technicalTrialCount).toBeNull();
 });
 it("allows an empty packet before evidence collection",()=>{
  const rows=buildGabrooVoiceAuditionComparison([],[]);expect(rows).toHaveLength(3);expect(rows.every(x=>!x.eligibleForOwnerReview)).toBe(true);
 });
 it("rejects duplicate technical evidence for a blind candidate",()=>{
  expect(()=>buildGabrooVoiceAuditionComparison([], [technical("VOICE-01"),technical("VOICE-01")])).toThrow("Duplicate technical evidence");
 });
 it("requires an explicit candidate and timestamp for an owner decision",()=>{
  expect(gabrooVoiceOwnerDecisionSchema.safeParse({status:"approved",decisionOwner:"Owner",rationale:"Reviewed all audition evidence and approve this voice.",reviewedEvidenceReferences:["packet-v1"],decidedAt:"2026-11-19T10:00:00+05:30",blindCode:"VOICE-01"}).success).toBe(true);
  expect(gabrooVoiceOwnerDecisionSchema.safeParse({status:"approved",decisionOwner:"Owner",rationale:"Reviewed all audition evidence and approve this voice.",reviewedEvidenceReferences:["packet-v1"]}).success).toBe(false);
 });

 it("requires client-side trials at every standard speed for playback evidence completeness",()=>{
  const trials:GabrooPlaybackRateTrial[]=[0.75,0.85,1,1.15,1.3,1.5].map((rate,index)=>({trialId:"rate-"+index,blindCode:"VOICE-01",device:"Android",networkProfile:"wifi",requestedRate:rate,appliedRate:rate,playbackMethod:"client_rate_adjustment",intelligibility:4,naturalness:4,audibleArtifacts:[],completed:true}));
  const row=buildGabrooVoiceAuditionComparison([],[],trials)[0];
  expect(row.playbackRateEvidenceComplete).toBe(true);expect(row.playbackRateSummaries).toHaveLength(6);
  const partial=buildGabrooVoiceAuditionComparison([],[],trials.slice(1))[0];
  expect(partial.playbackRateEvidenceComplete).toBe(false);
  const resynthesized=trials.map(x=>({...x,playbackMethod:"provider_resynthesis" as const}));
  expect(buildGabrooVoiceAuditionComparison([],[],resynthesized)[0].playbackRateEvidenceComplete).toBe(false);
 });
});