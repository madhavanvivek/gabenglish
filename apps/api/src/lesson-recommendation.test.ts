import {describe,expect,it} from "vitest";
import {selectNextLessonRecommendation,type RecommendationCandidate} from "./lesson-recommendation.js";

const candidate=(overrides:Partial<RecommendationCandidate>):RecommendationCandidate=>({
 lessonId:"lesson-a",courseId:"course-a",title:"Daily routines",slug:"daily-routines",
 moduleTitle:"Everyday English",progressStatus:null,progressPercent:0,
 courseSort:1,moduleSort:1,lessonSort:1,...overrides
});

describe("stage-aware lesson recommendation",()=>{
 it("continues an in-progress lesson before suggesting a new lesson",()=>{
  const result=selectNextLessonRecommendation(2,[
   candidate({lessonId:"new",lessonSort:1}),
   candidate({lessonId:"continue",lessonSort:9,progressStatus:"in_progress",progressPercent:45})
  ]);
  expect(result).toMatchObject({lessonId:"continue",reason:"continue_learning",progressPercent:45,stage:2});
 });
 it("selects the next lesson in curriculum order when none is in progress",()=>{
  const result=selectNextLessonRecommendation(1,[
   candidate({lessonId:"later",lessonSort:2}),
   candidate({lessonId:"first",lessonSort:1})
  ]);
  expect(result).toMatchObject({lessonId:"first",reason:"next_in_sequence"});
 });
 it("never recommends a completed lesson",()=>{
  expect(selectNextLessonRecommendation(3,[candidate({progressStatus:"completed",progressPercent:100})])).toBeNull();
 });
 it("returns no recommendation when the current stage has no eligible content",()=>{
  expect(selectNextLessonRecommendation(5,[])).toBeNull();
 });
 it("uses stable id ordering when sequence metadata ties",()=>{
  const result=selectNextLessonRecommendation(1,[
   candidate({lessonId:"z"}),
   candidate({lessonId:"a"})
  ]);
  expect(result?.lessonId).toBe("a");
 });
});
