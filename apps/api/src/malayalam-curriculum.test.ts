import {describe,it,expect} from "vitest";
import {malayalamCurriculum} from "./malayalam-curriculum.js";
describe("Malayalam curriculum draft",()=>{
 it("is a distinct English-supported Malayalam course and remains unpublished",()=>{
  expect(malayalamCurriculum).toMatchObject({learningDirection:"en_to_ml",sourceLanguage:"en",targetLanguage:"ml",supportLanguage:"en",status:"draft_unreviewed",publicationEnabled:false});
 });
 it("provides staged progression and distinct practical modules",()=>{
  expect(malayalamCurriculum.stages.map(stage=>stage.number)).toEqual([1,2,3]);
  expect(malayalamCurriculum.units.length).toBeGreaterThanOrEqual(12);
  expect(new Set(malayalamCurriculum.units.map(unit=>unit.module)).size).toBeGreaterThanOrEqual(5);
 });
 it("requires native script with optional romanisation and educator review",()=>{
  expect(malayalamCurriculum.units.every(unit=>unit.scriptMode==="native_with_optional_romanisation")).toBe(true);
  expect(malayalamCurriculum.units.every(unit=>unit.educatorReviewStatus==="not_reviewed"&&unit.publicationStatus==="draft")).toBe(true);
  expect(malayalamCurriculum.units.every(unit=>unit.dialectScope==="broadly_understandable_kerala")).toBe(true);
 });
});
