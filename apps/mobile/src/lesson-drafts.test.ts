import {beforeEach,describe,expect,it,vi} from "vitest";

const {storage}=vi.hoisted(()=>({storage:new Map<string,string>()}));
vi.mock("expo-secure-store",()=>({
 getItemAsync:async(key:string)=>storage.get(key)??null,
 setItemAsync:async(key:string,value:string)=>{storage.set(key,value);},
 deleteItemAsync:async(key:string)=>{storage.delete(key);}
}));

import {clearLessonAnswerDraft,readLessonAnswerDraft,writeLessonAnswerDraft} from "./lesson-drafts";

describe("versioned lesson answer drafts",()=>{
 beforeEach(()=>storage.clear());
 it("restores answers for the exact lesson version",async()=>{
  await writeLessonAnswerDraft("lesson-1","version-1",{"exercise-1":"hello"});
  expect(await readLessonAnswerDraft("lesson-1","version-1")).toEqual({"exercise-1":"hello"});
  expect(await readLessonAnswerDraft("lesson-1","version-2")).toEqual({});
 });
 it("does not restore malformed, oversized, or unexpected data",async()=>{
  await writeLessonAnswerDraft("lesson-1","version-1",{"exercise-1":"hello"});
  const key=[...storage.keys()][0]!;
  storage.set(key,JSON.stringify({"bad id":"hello"}));
  expect(await readLessonAnswerDraft("lesson-1","version-1")).toEqual({});
  storage.set(key,"not-json");
  expect(await readLessonAnswerDraft("lesson-1","version-1")).toEqual({});
 });
 it("deletes a draft when no answers remain",async()=>{
  await writeLessonAnswerDraft("lesson-1","version-1",{"exercise-1":"hello"});
  await clearLessonAnswerDraft("lesson-1","version-1");
  expect(await readLessonAnswerDraft("lesson-1","version-1")).toEqual({});
 });
 it("ignores invalid answer keys and values when saving",async()=>{
  await writeLessonAnswerDraft("lesson-1","version-1",{"bad id":"x","exercise-1":"ok","exercise-2":"x".repeat(2001)});
  expect(await readLessonAnswerDraft("lesson-1","version-1")).toEqual({"exercise-1":"ok"});
 });
});
