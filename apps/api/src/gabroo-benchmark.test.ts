import {describe,expect,it} from "vitest";
import {buildGabrooBenchmarkMessages,getGabrooBenchmarkPolicyVersion,GABROO_EVALUATION_DIMENSIONS} from "./gabroo-benchmark.js";

describe("buildGabrooBenchmarkMessages",()=>{
 it("injects the live English-learning policy and keeps conversation history",()=>{
  const messages=buildGabrooBenchmarkMessages({
   id:"C02",title:"Doubt interrupts role-play",mode:"role_play",direction:"ml_to_en",
   supportLanguage:"ml",stage:2,
   history:[{role:"assistant",content:"Welcome. What would you like?"}],
   message:"What is the difference between could and can?",
   expected:[],critical:[]
  });
  expect(messages).toHaveLength(3);
  expect(messages[0].content).toContain('"learningDirection":"ml_to_en"');
  expect(messages[0].content).toContain("Stage 2 Malayalam + English Mix");
  expect(messages[0].content).toContain("resolve that doubt first");
  expect(messages[1]).toEqual({role:"assistant",content:"Welcome. What would you like?"});
  expect(messages[2]).toEqual({role:"user",content:"What is the difference between could and can?"});
 });
 it("uses the Malayalam target and English support policy for Malayalam learners",()=>{
  const [system]=buildGabrooBenchmarkMessages({
   id:"M01",title:"Learn Malayalam",mode:"gentle_correction",direction:"en_to_ml",
   supportLanguage:"en",stage:1,history:[],message:"How do I greet someone politely?",
   expected:[],critical:[]
  });
  expect(system.content).toContain('"targetLanguage":"ml"');
  expect(system.content).toContain('"supportLanguage":"en"');
  expect(system.content).toContain("Malayalam Stage 1");
  expect(system.content).toContain("Never use 'eda', 'edi'");
 });
});
