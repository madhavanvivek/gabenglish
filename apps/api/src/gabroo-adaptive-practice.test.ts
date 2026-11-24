import {describe,it,expect} from "vitest";
import {buildGabrooAdaptivePractice} from "./gabroo-adaptive-practice.js";

const outcomes=(correct:boolean[],skill:"grammar"|"vocabulary"|"comprehension"="grammar",difficulty=3)=>correct.map((value,index)=>({
 skill,correct:value,difficulty,observedAt:new Date(Date.UTC(2026,10,20+index)).toISOString()
}));

describe("Gabroo adaptive exercise sequencing",()=>{
 it("offers a harder exercise only after repeated strong results",()=>{
  const [result]=buildGabrooAdaptivePractice(outcomes([true,true,true,true,true]));
  expect(result).toMatchObject({action:"introduce_next_challenge",recent_attempts:5,correct_count:5,current_difficulty:3,target_difficulty:4,proficiency_change:false});
 });
 it("reinforces the same pattern after repeated difficulty",()=>{
  const [result]=buildGabrooAdaptivePractice(outcomes([false,false,true,false]));
  expect(result?.action).toBe("reinforce_current_pattern");
 });
 it("does not change challenge from a small sample",()=>{
  const [result]=buildGabrooAdaptivePractice(outcomes([true,true]));
  expect(result?.action).toBe("continue_current_challenge");
 });
 it("keeps recommendations separated by skill",()=>{
  const result=buildGabrooAdaptivePractice([
   ...outcomes([true,true,true,true,true],"grammar"),
   ...outcomes([false,false,false],"vocabulary")
  ]);
  expect(result.find(item=>item.skill==="grammar")?.action).toBe("introduce_next_challenge");
  expect(result.find(item=>item.skill==="vocabulary")?.action).toBe("reinforce_current_pattern");
 });
 it("moves down one difficulty band after repeated difficulty",()=>{\n  const [result]=buildGabrooAdaptivePractice(outcomes([false,false,false], "grammar", 4));\n  expect(result).toMatchObject({action:"reinforce_current_pattern",current_difficulty:4,target_difficulty:3});\n });\n it("keeps difficulty unchanged when metadata is absent",()=>{\n  const [result]=buildGabrooAdaptivePractice([{skill:"grammar",correct:true,observedAt:"2026-11-24T10:00:00.000Z"}]);\n  expect(result).toMatchObject({current_difficulty:null,target_difficulty:null});\n });\n it("ignores malformed timestamps",()=>{
  expect(buildGabrooAdaptivePractice([{skill:"grammar",correct:true,observedAt:"invalid"}])).toEqual([]);
 });
});
