import {describe,expect,it} from "vitest";
import {initialVocabularyReview,scheduleVocabularyReview,type RecallRating} from "./vocabulary-scheduler.js";
describe("vocabulary spaced repetition scheduler",()=>{
 const at=new Date("2026-11-25T00:00:00.000Z");
 it("starts new vocabulary as due immediately",()=>{expect(initialVocabularyReview(at)).toMatchObject({repetitions:0,intervalDays:0,easeFactor:2.5,dueAt:at});});
 it("schedules successful recall progressively",()=>{
  const first=scheduleVocabularyReview(initialVocabularyReview(at),4,at);
  expect(first.intervalDays).toBe(1);
  const second=scheduleVocabularyReview(first,5,first.dueAt);
  expect(second.intervalDays).toBe(3);
  const third=scheduleVocabularyReview(second,5,second.dueAt);
  expect(third.intervalDays).toBeGreaterThan(3);
 });
 it("resets the repetition run after a difficult recall",()=>{
  const prior={repetitions:4,intervalDays:12,easeFactor:2.5};
  const next=scheduleVocabularyReview(prior,2,at);
  expect(next).toMatchObject({repetitions:0,intervalDays:1,lastRating:2});
 });
 it("does not let ease factor fall below 1.3",()=>{
  const next=scheduleVocabularyReview({repetitions:2,intervalDays:3,easeFactor:1.31},0,at);
  expect(next.easeFactor).toBe(1.3);
 });
 it("caps ease factor at four",()=>{
  const next=scheduleVocabularyReview({repetitions:2,intervalDays:3,easeFactor:3.99},5,at);
  expect(next.easeFactor).toBe(4);
 });
 it("rejects corrupted persisted schedule state",()=>{
  const invalid=[
   {repetitions:-1,intervalDays:0,easeFactor:2.5},
   {repetitions:1.5,intervalDays:0,easeFactor:2.5},
   {repetitions:0,intervalDays:-1,easeFactor:2.5},
   {repetitions:0,intervalDays:1.5,easeFactor:2.5},
   {repetitions:0,intervalDays:0,easeFactor:1.29},
   {repetitions:0,intervalDays:0,easeFactor:4.01},
   {repetitions:0,intervalDays:0,easeFactor:Number.NaN}
  ];
  for(const state of invalid)expect(()=>scheduleVocabularyReview(state,4,at)).toThrow();
 });
 it("rejects date overflow rather than returning an invalid due date",()=>{
  const nearLimit=new Date(8640000000000000-1000);
  expect(()=>scheduleVocabularyReview({repetitions:0,intervalDays:0,easeFactor:2.5},4,nearLimit)).toThrow();
 });
 it("rejects an invalid initial review timestamp",()=>{
  expect(()=>initialVocabularyReview(new Date("invalid"))).toThrow();
 });
 it("rejects invalid ratings and dates",()=>{
  expect(()=>scheduleVocabularyReview({repetitions:0,intervalDays:0,easeFactor:2.5},6 as unknown as RecallRating,at)).toThrow();
  expect(()=>scheduleVocabularyReview({repetitions:0,intervalDays:0,easeFactor:2.5},3,new Date("invalid"))).toThrow();
 });
});
