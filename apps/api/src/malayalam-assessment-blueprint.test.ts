import {describe,it,expect} from "vitest";
import {malayalamAssessmentBlueprint} from "./malayalam-assessment-blueprint.js";
describe("Malayalam assessment blueprint",()=>{
 it("remains a separate, unpublished en-to-ml assessment",()=>{
  expect(malayalamAssessmentBlueprint).toMatchObject({direction:"en_to_ml",sourceLanguage:"en",targetLanguage:"ml",status:"draft_unreviewed",publicationEnabled:false,scoringEnabled:false,proficiencyLabel:null});
 });
 it("covers six distinct evidence domains with explicit limitations",()=>{
  expect(malayalamAssessmentBlueprint.tasks.map(task=>task.skill)).toEqual(["listening_comprehension","functional_vocabulary","phrase_recall","sentence_construction","conversational_response","script_recognition"]);
  expect(malayalamAssessmentBlueprint.tasks.every(task=>task.limitations.length>0)).toBe(true);
  expect(malayalamAssessmentBlueprint.tasks.find(task=>task.skill==="script_recognition")?.limitations.join(" ")).toContain("explicitly enabled");
 });
 it("does not silently enable publication or automated scoring",()=>{
  expect(malayalamAssessmentBlueprint.publicationEnabled).toBe(false);
  expect(malayalamAssessmentBlueprint.scoringEnabled).toBe(false);
 });
});
