import * as SecureStore from "expo-secure-store";

const PREFIX="gabenglish.lesson.submission.";
const UUID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PendingSubmission={submissionId:string;response:string};

function storageKey(userId:string,lessonId:string,versionId:string,exerciseId:string){
 return PREFIX+[userId,lessonId,versionId,exerciseId].map(value=>encodeURIComponent(value)).join(".");
}

function createSubmissionId():string{
 return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,character=>{
  const random=Math.floor(Math.random()*16);
  return (character==="x"?random:(random&3)|8).toString(16);
 });
}

/** Reuses the same id only when retrying the exact same answer for the same learner and lesson version. */
export async function getOrCreatePendingExerciseSubmission(userId:string,lessonId:string,versionId:string,exerciseId:string,response:string):Promise<string>{
 if(!userId||!lessonId||!versionId||! /^[a-z0-9_-]{1,64}$/i.test(exerciseId)||!response.trim()||response.trim().length>2000)throw new Error("This exercise submission is invalid. Please reload the lesson and try again.");
 const key=storageKey(userId,lessonId,versionId,exerciseId);
 const raw=await SecureStore.getItemAsync(key);
 if(raw&&raw.length<=4096){
  try{
   const parsed=JSON.parse(raw) as Partial<PendingSubmission>;
   if(typeof parsed.submissionId==="string"&&UUID_PATTERN.test(parsed.submissionId)&&parsed.response===response.trim())return parsed.submissionId;
  }catch{/* Replace malformed pending metadata with a fresh identifier. */}
 }
 const submissionId=createSubmissionId();
 await SecureStore.setItemAsync(key,JSON.stringify({submissionId,response:response.trim()} satisfies PendingSubmission));
 return submissionId;
}

export async function clearPendingExerciseSubmission(userId:string,lessonId:string,versionId:string,exerciseId:string):Promise<void>{
 try{await SecureStore.deleteItemAsync(storageKey(userId,lessonId,versionId,exerciseId));}catch{/* A stale key is safe: a changed answer receives a new identifier. */}
}
