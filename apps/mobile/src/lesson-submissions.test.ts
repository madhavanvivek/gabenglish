import {afterEach,describe,expect,it,vi} from "vitest";
import * as SecureStore from "expo-secure-store";

const store=new Map<string,string>();
vi.mock("expo-secure-store",()=>({
 getItemAsync:vi.fn(async(key:string)=>store.get(key)??null),
 setItemAsync:vi.fn(async(key:string,value:string)=>{store.set(key,value);}),
 deleteItemAsync:vi.fn(async(key:string)=>{store.delete(key);})
}));
import {clearPendingExerciseSubmission,getOrCreatePendingExerciseSubmission,readPendingExerciseSubmission} from "./lesson-submissions";

afterEach(()=>{store.clear();vi.clearAllMocks();});

describe("pending exercise submissions",()=>{
 it("reuses an identifier for the exact same answer",async()=>{
  const first=await getOrCreatePendingExerciseSubmission("learner","lesson","version","exercise-1","  hello  ");
  const retry=await getOrCreatePendingExerciseSubmission("learner","lesson","version","exercise-1","hello");
  expect(retry).toBe(first);
 });
 it("restores the full pending answer envelope after app restart",async()=>{
  const submissionId=await getOrCreatePendingExerciseSubmission("learner","lesson","version","exercise-1","hello");
  await expect(readPendingExerciseSubmission("learner","lesson","version","exercise-1")).resolves.toEqual({submissionId,response:"hello"});
  await expect(readPendingExerciseSubmission("other-learner","lesson","version","exercise-1")).resolves.toBeNull();
 });
 it("creates a new identifier when the answer changes",async()=>{
  const first=await getOrCreatePendingExerciseSubmission("learner","lesson","version","exercise-1","hello");
  const next=await getOrCreatePendingExerciseSubmission("learner","lesson","version","exercise-1","good morning");
  expect(next).not.toBe(first);
 });
 it("isolates pending identifiers by learner and lesson version",async()=>{
  const first=await getOrCreatePendingExerciseSubmission("learner-a","lesson","version-a","exercise-1","hello");
  const otherLearner=await getOrCreatePendingExerciseSubmission("learner-b","lesson","version-a","exercise-1","hello");
  const otherVersion=await getOrCreatePendingExerciseSubmission("learner-a","lesson","version-b","exercise-1","hello");
  expect(new Set([first,otherLearner,otherVersion]).size).toBe(3);
 });
 it("removes a confirmed submission key",async()=>{
  const first=await getOrCreatePendingExerciseSubmission("learner","lesson","version","exercise-1","hello");
  await clearPendingExerciseSubmission("learner","lesson","version","exercise-1");
  const next=await getOrCreatePendingExerciseSubmission("learner","lesson","version","exercise-1","hello");
  expect(next).not.toBe(first);
 });
 it("rejects oversized and blank answers before persisting",async()=>{
  await expect(getOrCreatePendingExerciseSubmission("learner","lesson","version","exercise-1","  ")).rejects.toThrow();
  await expect(getOrCreatePendingExerciseSubmission("learner","lesson","version","exercise-1","x".repeat(2001))).rejects.toThrow();
  expect(store.size).toBe(0);
 });
 it("does not return a submission id when secure persistence fails",async()=>{
  vi.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error("Secure storage unavailable"));
  await expect(getOrCreatePendingExerciseSubmission("learner","lesson","version","exercise-1","hello")).rejects.toThrow("Secure storage unavailable");
  expect(store.size).toBe(0);
 });
 it("ignores a corrupted pending envelope instead of replaying it",async()=>{
  const submissionId=await getOrCreatePendingExerciseSubmission("learner","lesson","version","exercise-1","hello");
  expect(submissionId).toMatch(/^[0-9a-f-]{36}$/i);
  const key=[...store.keys()][0]!;
  store.set(key,JSON.stringify({submissionId:"not-a-uuid",response:"hello"}));
  await expect(readPendingExerciseSubmission("learner","lesson","version","exercise-1")).resolves.toBeNull();
 });
});
