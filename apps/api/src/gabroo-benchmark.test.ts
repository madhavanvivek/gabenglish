import {describe,expect,it} from "vitest";
import {buildGabrooBenchmarkPolicy,getGabrooBenchmarkPolicyVersion,GABROO_EVALUATION_DIMENSIONS} from "./gabroo-benchmark.js";
import {GABROO_PROVIDER_ADAPTER_VERSION} from "./gabroo-openai-provider.js";

describe("Gabroo benchmark policy",()=>{
 it("uses the live English-learning policy for the scenario stage",()=>{
  const policy=buildGabrooBenchmarkPolicy({
   id:"C02",title:"Doubt interrupts role-play",mode:"role_play",direction:"ml_to_en",
   supportLanguage:"ml",stage:2,history:[{role:"assistant",content:"Welcome."}],
   message:"What is the difference between could and can?",expected:[],critical:[]
  });
  expect(policy.learningDirection).toBe("ml_to_en");
  expect(policy.targetLanguage).toBe("en");
  expect(policy.stageGuidance).toContain("Stage 2 Malayalam + English Mix");
  expect(policy.responseGuidance.join(" ")).toContain("resolve that doubt first");
 });
 it("uses Malayalam as target and English as support for Malayalam learners",()=>{
  const policy=buildGabrooBenchmarkPolicy({
   id:"M01",title:"Learn Malayalam",mode:"gentle_correction",direction:"en_to_ml",
   supportLanguage:"en",stage:1,history:[],message:"How do I greet someone politely?",
   expected:[],critical:[]
  });
  expect(policy.targetLanguage).toBe("ml");
  expect(policy.supportLanguage).toBe("en");
  expect(policy.stageGuidance).toContain("Malayalam Stage 1");
  expect(policy.addressPolicy).toContain("Never use 'eda', 'edi'");
 });
 it("produces a stable policy fingerprint and changes it when the stage changes",()=>{
  const base={
   id:"C01",title:"Beginner",mode:"gentle_correction" as const,direction:"ml_to_en" as const,
   supportLanguage:"ml" as const,history:[],message:"I am go to office yesterday.",
   expected:[],critical:[]
  };
  const first=getGabrooBenchmarkPolicyVersion({...base,stage:1});
  expect(getGabrooBenchmarkPolicyVersion({...base,stage:1})).toBe(first);
  expect(getGabrooBenchmarkPolicyVersion({...base,stage:2})).not.toBe(first);
 });
 it("exposes the complete human review rubric",()=>{
  expect(GABROO_EVALUATION_DIMENSIONS).toEqual([
   "intent_response","malayalam_naturalness","code_switching","english_correctness",
   "level_fit","correction_quality","continuity","tutor_warmth","safety_respect","latency_reliability"
  ]);
 });
 it("uses a versioned provider adapter for repeatable comparisons",()=>{
  expect(GABROO_PROVIDER_ADAPTER_VERSION).toBe("1");
 });

});
