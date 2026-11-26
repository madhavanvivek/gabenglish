import * as SecureStore from "expo-secure-store";

const DRAFT_PREFIX="gabenglish.lesson.draft.";
const MAX_DRAFT_BYTES=64*1024;

export type LessonAnswerDraft={lessonId:string;lessonVersionId:string;answers:Record<string,string>};

function draftKey(userId:string,lessonId:string,lessonVersionId:string){
 return DRAFT_PREFIX+encodeURIComponent(userId)+"."+encodeURIComponent(lessonId)+"."+encodeURIComponent(lessonVersionId);
}

export async function readLessonAnswerDraft(userId:string,lessonId:string,lessonVersionId:string):Promise<Record<string,string>>{
 try{
  const raw=await SecureStore.getItemAsync(draftKey(userId,lessonId,lessonVersionId));
  if(!raw||raw.length>MAX_DRAFT_BYTES)return {};
  const parsed:unknown=JSON.parse(raw);
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))return {};
  const entries=Object.entries(parsed as Record<string,unknown>);
  if(entries.length>100)return {};
  const answers:Record<string,string>={};
  for(const [id,value] of entries){
   if(!/^[a-z0-9_-]{1,64}$/i.test(id)||typeof value!=="string"||value.length>2000)return {};
   answers[id]=value;
  }
  return answers;
 }catch{return {};}
}

export async function writeLessonAnswerDraft(userId:string,lessonId:string,lessonVersionId:string,answers:Record<string,string>):Promise<void>{
 try{
  const entries=Object.entries(answers).filter(([id,value])=>/^[a-z0-9_-]{1,64}$/i.test(id)&&typeof value==="string"&&value.length<=2000);
  const serialized=JSON.stringify(Object.fromEntries(entries));
  if(serialized.length>MAX_DRAFT_BYTES)return;
  if(entries.length===0){await SecureStore.deleteItemAsync(draftKey(userId,lessonId,lessonVersionId));return;}
  await SecureStore.setItemAsync(draftKey(userId,lessonId,lessonVersionId),serialized);
 }catch{/* Draft persistence is best-effort; it must not block lesson work. */}
}

export async function clearLessonAnswerDraft(userId:string,lessonId:string,lessonVersionId:string):Promise<void>{
 try{await SecureStore.deleteItemAsync(draftKey(lessonId,lessonVersionId));}catch{/* Keep lesson interaction available if local cleanup fails. */}
}
