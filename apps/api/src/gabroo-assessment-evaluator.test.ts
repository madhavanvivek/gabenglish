import {describe,it,expect} from "vitest";
import {mapGabrooRubricResults,aggregatePlacementEvidenceBySkill} from "./gabroo-assessment-evaluator.js";

const task=(overrides:Record<string,unknown>={})=>({
 skill:"grammar",score:0.7,confidence:0.85,taskId:"placement-q1",
 observedAt:"2026-11-24T10:00:00.000Z",method:"objective_task",...overrides
});

describe("GLIM rubric evidence adapter",()=>{
 it("maps explicit objective placement outcomes without deriving scores",()=>{
  const result=mapGabrooRubricResults([task()], "placement_assessment");
  expect(result).toEqual([{
   skill:"grammar",score:0.7,confidence:0.85,source:"placement_assessment",
   taskId:"placement-q1",observedAt:"2026-11-24T10:00:00.000Z"
  }]);
 });
 it("does not convert text heuristics or objective text tasks into pronunciation evidence",()=>{
  expect(mapGabrooRubricResults([
   task({skill:"pronunciation",method:"objective_task"}),
   task({skill:"fluency",method:"objective_task"})
  ],"placement_assessment")).toEqual([]);
 });
 it("accepts pronunciation and fluency only from audio-capable evaluation",()=>{
  const result=mapGabrooRubricResults([
   task({skill:"pronunciation",method:"audio_analysis"}),
   task({skill:"fluency",method:"audio_analysis"})
  ],"placement_assessment");
  expect(result.map(item=>item.skill)).toEqual(["pronunciation","fluency"]);
 });
 it("requires learner-review provenance for self-reported evidence",()=>{
  const item=task({skill:"confidence",method:"learner_review"});
  expect(mapGabrooRubricResults([item],"placement_assessment")).toEqual([]);
  expect(mapGabrooRubricResults([item],"learner_review")).toHaveLength(1);
 });
 it("requires human-review provenance for human assessments",()=>{
  const item=task({skill:"comprehension",method:"human_language_review"});
  expect(mapGabrooRubricResults([item],"placement_assessment")).toEqual([]);
  expect(mapGabrooRubricResults([item],"human_review")).toHaveLength(1);
 });
 it("drops malformed or untraceable rubric outcomes",()=>{
  expect(mapGabrooRubricResults([
   task({score:1.4}),task({taskId:" "}),task({confidence:0})
  ],"placement_assessment")).toEqual([]);
 });

 it("rejects incompatible evaluator methods for a skill",()=>{
  expect(mapGabrooRubricResults([
   task({skill:"confidence",method:"objective_task"}),
   task({skill:"grammar",method:"audio_analysis"}),
   task({skill:"pronunciation",method:"human_language_review"})
  ],"human_review")).toEqual([]);
 });
 it("keeps only one observation per skill and task in a batch",()=>{
  const result=mapGabrooRubricResults([
   task({score:0.6}),task({score:0.95})
  ],"placement_assessment");
  expect(result).toHaveLength(1);
  expect(result[0]?.score).toBe(0.6);
 });

 it("collapses multiple items into one skill observation per assessment sitting",()=>{
  const mapped=mapGabrooRubricResults([
   task({taskId:"q1",score:1}),task({taskId:"q2",score:0})
  ],"placement_assessment");
  const aggregated=aggregatePlacementEvidenceBySkill(mapped,"attempt-123");
  expect(aggregated).toHaveLength(1);
  expect(aggregated[0]).toMatchObject({
   skill:"grammar",score:0.5,confidence:0.85,
   source:"placement_assessment",taskId:"attempt-123:grammar"
  });
 });
});
