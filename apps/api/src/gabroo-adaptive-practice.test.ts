import {describe,it,expect} from "vitest";
import {buildGabrooAdaptivePractice} from "./gabroo-adaptive-practice.js";

const outcomes=(correct:boolean[],skill:"grammar"|"vocabulary"|"comprehension"="grammar")=>correct.map((value,index)=>({
 skill,correct:value,observedAt:new Date(Date.UTC(2026,10,20+index)).toISOString()
}));

describe("Gabroo adaptive exercise sequencing",()=>{
 it("offers a harder exercise only after repeated strong results",()=>{
  const [result]=buildGabrooAdaptivePractice(outcomes([true,true,true,true,true]));
  expect(result).toMatchObject({action:"introduce_next_challenge",recent_attempts:5,correct_count:5,proficiency_change:false});
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
 it("ignores malformed timestamps",()=>{
  expect(buildGabrooAdaptivePractice([{skill:"grammar",correct:true,observedAt:"invalid"}])).toEqual([]);
 });
});
