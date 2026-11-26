import type {LearnerLessonContent} from "@gabenglish/contracts";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system";
import {authTokenResponseSchema,gabrooRecognitionResponseSchema,gabrooRecognitionStatusSchema,type AuthTokenResponse,type GabrooRecognitionLanguage,type GabrooRecognitionResponse,type GabrooRecognitionStatus} from "@gabenglish/contracts";

const API_BASE_URL=process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/,"");
const ACCESS_KEY="gabenglish.auth.access";
const REFRESH_KEY="gabenglish.auth.refresh";

export class AuthApiError extends Error{
 constructor(message:string,readonly status?:number){super(message);this.name="AuthApiError";}
}
export type LearnerAccount={
 id:string;email:string|null;email_verified:boolean;phone_verified:boolean;display_name:string|null;locale:string;timezone:string;
};
export type LearnerPreferences={
 learning_direction:"ml_to_en"|"en_to_ml";support_language:"ml"|"en";learning_goal:string|null;correction_mode:"gentle"|"balanced"|"detailed";daily_target_minutes:number;reminders_enabled:boolean;gabroo_speech_rate:number;
};
export type LearnerMe={user:LearnerAccount;preferences:LearnerPreferences|null};

function baseUrl(){
 if(!API_BASE_URL)throw new AuthApiError("The Gabenglish API is not configured. Set EXPO_PUBLIC_API_BASE_URL.");
 try{
  const parsed=new URL(API_BASE_URL);
  const localDevelopmentHost=typeof __DEV__!=="undefined"&&__DEV__&&["localhost","127.0.0.1","10.0.2.2"].includes(parsed.hostname);
  if(parsed.protocol!=="https:"&&!localDevelopmentHost)throw new Error("HTTPS required outside local development");
 }catch{throw new AuthApiError("The Gabenglish API address must be a valid HTTPS URL (HTTP is allowed for localhost and the Android emulator host during development).");}
 return API_BASE_URL;
}
async function parseResponse(response:Response){
 const payload=await response.json().catch(()=>null) as unknown;
 if(!response.ok){
  const message=typeof payload==="object"&&payload!==null&&"error" in payload&&typeof payload.error==="object"&&payload.error!==null&&"message" in payload.error&&typeof payload.error.message==="string"?payload.error.message:`The account service returned an error (${response.status}).`;
  throw new AuthApiError(message,response.status);
 }
 return payload;
}
async function post(path:string,body:unknown){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(baseUrl()+path,{method:"POST",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify(body),signal:controller.signal});
  return await parseResponse(response);
 }catch(error){
  if(error instanceof AuthApiError)throw error;
  if(error instanceof Error&&error.name==="AbortError")throw new AuthApiError("The account service took too long to respond. Try again.");
  throw new AuthApiError("Could not reach Gabenglish. Check your connection and try again.");
 }finally{clearTimeout(timeout);}
}
async function saveTokens(payload:unknown):Promise<AuthTokenResponse>{
 const parsed=authTokenResponseSchema.safeParse(payload);
 if(!parsed.success)throw new AuthApiError("The account service returned an invalid session response.");
 await SecureStore.setItemAsync(ACCESS_KEY,parsed.data.access_token);
 await SecureStore.setItemAsync(REFRESH_KEY,parsed.data.refresh_token);
 return parsed.data;
}
async function renewSession(){
 const refresh=await SecureStore.getItemAsync(REFRESH_KEY);
 if(!refresh)throw new AuthApiError("Your session has expired. Please sign in again.",401);
 try{
  const payload=await post("/api/v1/auth/refresh",{refresh_token:refresh});
  return await saveTokens(payload);
 }catch(error){
  if(error instanceof AuthApiError&&error.status===401)await clearTokens();
  throw error;
 }
}
async function clearTokens(){
 await Promise.all([SecureStore.deleteItemAsync(ACCESS_KEY),SecureStore.deleteItemAsync(REFRESH_KEY)]);
}

export type OtpChallenge={challenge_id:string;channel:"email"|"phone";masked_destination:string;expires_in_seconds:number;resend_after_seconds:number};
export async function requestLearnerOtp(input:{channel:"email"|"phone";destination:string}){
 return await post("/api/v1/auth/otp/request",input) as OtpChallenge;
}
export async function verifyLearnerOtp(input:{challenge_id:string;code:string}){
 const payload=await post("/api/v1/auth/otp/verify",input);
 const tokens=await saveTokens(payload);
 return {tokens,payload};
}
export async function requestContactOtp(input:{channel:"email"|"phone";destination:string}){
 return await authorized("/api/v1/auth/contacts/otp/request","POST",input) as OtpChallenge;
}
export async function registerLearner(input:{email:string;password:string;display_name?:string}){
 const payload=await post("/api/v1/auth/register",input);
 const tokens=await saveTokens(payload);
 return {tokens,email_verified:false};
}
export async function loginLearner(input:{email:string;password:string}){
 const payload=await post("/api/v1/auth/login",input) as {email_verified?:boolean};
 const tokens=await saveTokens(payload);
 return {tokens,email_verified:Boolean(payload.email_verified)};
}
async function authorized(path:string,method:"GET"|"POST"|"PATCH"|"DELETE",body?:unknown,signal?:AbortSignal):Promise<unknown>{
 let access=await SecureStore.getItemAsync(ACCESS_KEY);
 if(!access){await renewSession();access=await SecureStore.getItemAsync(ACCESS_KEY);}
 const send=()=>fetch(baseUrl()+path,{method,headers:{"content-type":"application/json",accept:"application/json",authorization:"Bearer "+access},...(body===undefined?{}:{body:JSON.stringify(body)}),...(signal?{signal}:{})});
 let response=await send();
 if(response.status===401){
  await renewSession();access=await SecureStore.getItemAsync(ACCESS_KEY);response=await send();
 }
 return parseResponse(response);
}
export async function getLearnerMe(){return await authorized("/api/v1/auth/me","GET") as LearnerMe;}
export type SavedFreeDiagnosticReport={
 report_id:string;
 report:{status:string;recommendation_status:string;assessment_mode:string;response_count:number;extended_samples:number;brief_samples:number;observed_patterns:string[];limitations:string[];next_steps:string[]};
 gabroo_explanation:string;assessment_mode:string;created_at:string;access:"free";
};
export async function getLatestFreeDiagnosticReport(){
 return await authorized("/api/v1/placement/reports/latest","GET") as SavedFreeDiagnosticReport;
}
export async function updateLearnerProfile(input:{display_name?:string;locale?:string;timezone?:string}){
 return await authorized("/api/v1/auth/me","PATCH",input);
}
export async function updateLearnerPreferences(input:Partial<LearnerPreferences>){
 return await authorized("/api/v1/auth/me/preferences","PATCH",input);
}
export async function logoutLearner(){
 const refresh=await SecureStore.getItemAsync(REFRESH_KEY);
 try{if(refresh)await post("/api/v1/auth/logout",{refresh_token:refresh});}
 finally{await clearTokens();}
}

export type GabrooConversationMode="free_flow"|"gentle_correction"|"detailed_correction"|"topic_practice"|"role_play"|"vocabulary_building"|"confidence_practice";
export type GabrooConversation={id:string;title:string|null;mode:GabrooConversationMode;support_language:"ml"|"en";status:"open"|"closed";turn_count:number;created_at:string;updated_at:string;closed_at:string|null};
export type GabrooConversationMessage={id:string;sequence_number:number;role:"user"|"assistant";content:string;created_at:string};
export type SubscriptionStatus={access:"free"|"paid";active:boolean;entitlement:null|{plan_code:string;currency:string;amount_minor:number;period_start:string;period_end:string}};

/**
 * Upload a learner-consented local recording for transcription. The API
 * returns an unconfirmed transcript only; the UI must show it for review.
 * This helper never submits transcript text to a conversation.
 */
export async function recognizeGabrooAudio(input:{
 uri:string;
 mimeType:"audio/mp4"|"audio/m4a"|"audio/wav"|"audio/x-wav"|"audio/webm"|"audio/ogg";
 language:GabrooRecognitionLanguage;
 consentGranted:true;
}):Promise<GabrooRecognitionResponse>{
 if(input.consentGranted!==true)throw new AuthApiError("Explicit microphone and transcription consent is required.");
 const upload=async(accessToken:string)=>{
  const result=await FileSystem.uploadAsync(baseUrl()+"/api/v1/gabroo/recognition",input.uri,{
   httpMethod:"POST",
   uploadType:FileSystem.FileSystemUploadType.BINARY_CONTENT,
   headers:{
    authorization:"Bearer "+accessToken,
    "content-type":input.mimeType,
    accept:"application/json",
    "x-gabroo-consent":"true",
    "x-gabroo-language":input.language
   }
  });
  let payload:unknown=null;
  try{payload=JSON.parse(result.body) as unknown;}catch{}
  if(result.status<200||result.status>=300){
   const message=typeof payload==="object"&&payload!==null&&"error" in payload&&typeof payload.error==="object"&&payload.error!==null&&"message" in payload.error&&typeof payload.error.message==="string"?payload.error.message:`Speech recognition is unavailable (${result.status}).`;
   throw new AuthApiError(message,result.status);
  }
  const parsed=gabrooRecognitionResponseSchema.safeParse(payload);
  if(!parsed.success)throw new AuthApiError("Speech recognition returned an invalid response.");
  return parsed.data;
 };
 let access=await SecureStore.getItemAsync(ACCESS_KEY);
 if(!access){await renewSession();access=await SecureStore.getItemAsync(ACCESS_KEY);}
 if(!access)throw new AuthApiError("Your session has expired. Please sign in again.",401);
 try{
  try{return await upload(access);}
  catch(error){
   if(!(error instanceof AuthApiError)||error.status!==401)throw error;
   await renewSession();
   const refreshed=await SecureStore.getItemAsync(ACCESS_KEY);
   if(!refreshed)throw new AuthApiError("Your session has expired. Please sign in again.",401);
   return await upload(refreshed);
  }
 }catch(error){
  if(error instanceof AuthApiError)throw error;
  throw new AuthApiError("Could not upload the recording. Check your connection and try again.");
 }
}

export type {GabrooRecognitionStatus};
export async function getGabrooRecognitionStatus(){
 const payload=await authorized("/api/v1/gabroo/recognition/status","GET");
 const parsed=gabrooRecognitionStatusSchema.safeParse(payload);
 if(!parsed.success)throw new AuthApiError("Gabroo voice availability returned an invalid response.");
 return parsed.data;
}

export async function getSubscriptionStatus(){return await authorized("/api/v1/subscriptions/current","GET") as SubscriptionStatus;}
export async function listGabrooConversations(){return await authorized("/api/v1/gabroo/conversations","GET") as {conversations:GabrooConversation[]};}
export async function getGabrooConversation(id:string){return await authorized("/api/v1/gabroo/conversations/"+encodeURIComponent(id),"GET") as {conversation:GabrooConversation;messages:GabrooConversationMessage[]};}
export async function createGabrooConversation(input:{mode?:GabrooConversationMode;support_language?:"ml"|"en";title?:string}={}){
 return await authorized("/api/v1/gabroo/conversations","POST",input) as {conversation:GabrooConversation};
}
export type GabrooLearningInsights={
 learning_direction:"ml_to_en"|"en_to_ml";
 skill_areas:Array<{skill_key:string;attempt_count:number;correct_count:number;accuracy:number;evidence_status:"building_evidence"|"strong_exercise_performance"|"practice_opportunity"|"developing_exercise_performance"}>;
 saved_practice_phrases:number;
 interpretation:{exercise_results_are_not_speaking_or_overall_proficiency_scores:boolean;latest_attempt_per_exercise_and_skill:boolean;minimum_evidence_for_coaching:number};
};
export type DailyChallengeCompletion={challenge_date:string;learning_direction:"ml_to_en"|"en_to_ml";challenge_title:string;skill_key:string|null;conversation_id:string|null;completed_at:string};
export type DailyChallengeHistory={
 learning_direction:"ml_to_en"|"en_to_ml";limit:number;completed_days:number;total_completed_days:number;completions:DailyChallengeCompletion[];
};
export async function getDailyChallengeHistory(limit=14){
 if(!Number.isInteger(limit)||limit<1||limit>30)throw new AuthApiError("Choose between 1 and 30 recent practice days.");
 return await authorized("/api/v1/learning/daily-challenges?limit="+limit,"GET") as DailyChallengeHistory;
}
export async function getDailyChallengeCompletion(date:string){
 return await authorized("/api/v1/learning/daily-challenges/"+encodeURIComponent(date),"GET") as {completion:DailyChallengeCompletion|null};
}
export async function completeDailyChallenge(date:string,input:{title:string;skill_key:string|null;conversation_id?:string}){
 return await authorized("/api/v1/learning/daily-challenges/"+encodeURIComponent(date)+"/complete","POST",input) as {completion:DailyChallengeCompletion};
}
export async function getGabrooLearningInsights(){
 return await authorized("/api/v1/gabroo/learning-insights","GET") as GabrooLearningInsights;
}
export type GabrooSentenceFeedbackItem={category:"grammar"|"word_choice"|"naturalness";original:string;suggested:string;explanation:string;alternative?:string};
export type GabrooSentenceFeedback={feedback:GabrooSentenceFeedbackItem[];encouragement:string};
export async function requestGabrooSentenceFeedback(text:string){
 return await authorized("/api/v1/gabroo/feedback","POST",{text}) as {feedback:GabrooSentenceFeedback;disclaimer:string};
}
export async function sendGabrooMessage(id:string,message:string,signal?:AbortSignal){
 return await authorized("/api/v1/gabroo/conversations/"+encodeURIComponent(id)+"/messages","POST",{message},signal) as {messages:GabrooConversationMessage[]};
}

export async function sendGabrooMessageStream(id:string,message:string,signal:AbortSignal,onDelta:(text:string)=>void){
 const path="/api/v1/gabroo/conversations/"+encodeURIComponent(id)+"/messages";
 let access=await SecureStore.getItemAsync(ACCESS_KEY);
 if(!access){await renewSession();access=await SecureStore.getItemAsync(ACCESS_KEY);}
 const send=()=>fetch(baseUrl()+path,{method:"POST",headers:{"content-type":"application/json",accept:"text/event-stream",authorization:"Bearer "+access},body:JSON.stringify({message}),signal});
 let response=await send();
 if(response.status===401){
  await renewSession();access=await SecureStore.getItemAsync(ACCESS_KEY);response=await send();
 }
 if(!response.ok)await parseResponse(response);
 let committed:{messages:GabrooConversationMessage[]}|undefined;
 let frameBuffer="";
 const dispatch=(frame:string)=>{
  let event="message";const data:string[]=[];
  for(const line of frame.split(/\r?\n/)){
   if(line.startsWith("event:"))event=line.slice(6).trim();
   else if(line.startsWith("data:"))data.push(line.slice(5).trimStart());
  }
  if(!data.length)return;
  let payload:unknown;
  try{payload=JSON.parse(data.join("\n")) as unknown;}catch{return;}
  if(event==="delta"&&typeof payload==="object"&&payload!==null&&"content" in payload&&typeof payload.content==="string")onDelta(payload.content);
  if(event==="committed"&&typeof payload==="object"&&payload!==null&&"messages" in payload&&Array.isArray(payload.messages))committed=payload as {messages:GabrooConversationMessage[]};
  if(event==="error"){
   const message=typeof payload==="object"&&payload!==null&&"error" in payload&&typeof payload.error==="object"&&payload.error!==null&&"message" in payload.error&&typeof payload.error.message==="string"?payload.error.message:"Gabroo could not complete this reply.";
   throw new AuthApiError(message,502);
  }
 };
 const processText=(chunk:string)=>{
  frameBuffer+=chunk.replace(/\r\n/g,"\n");
  let boundary=frameBuffer.indexOf("\n\n");
  while(boundary>=0){
   const frame=frameBuffer.slice(0,boundary);frameBuffer=frameBuffer.slice(boundary+2);dispatch(frame);
   boundary=frameBuffer.indexOf("\n\n");
  }
 };
 if(response.body&&typeof response.body.getReader==="function"){
  const reader=response.body.getReader();const decoder=new TextDecoder();
  try{
   while(true){
    if(signal.aborted)throw new DOMException("Aborted","AbortError");
    const chunk=await reader.read();
    if(chunk.done){processText(decoder.decode());break;}
    processText(decoder.decode(chunk.value,{stream:true}));
   }
  }finally{await reader.cancel().catch(()=>undefined);reader.releaseLock();}
 }else{
  processText(await response.text());
 }
 if(frameBuffer.trim())dispatch(frameBuffer);
 if(!committed)throw new AuthApiError("Gabroo's reply ended before it was safely saved. Please reload the conversation.",502);
 return committed;
}
export async function deleteGabrooConversation(id:string){
 await authorized("/api/v1/gabroo/conversations/"+encodeURIComponent(id),"DELETE");
}

export async function updateGabrooConversation(id:string,input:{title?:string|null;mode?:GabrooConversationMode;support_language?:"ml"|"en"}){
 return await authorized("/api/v1/gabroo/conversations/"+encodeURIComponent(id),"PATCH",input) as {conversation:GabrooConversation};
}


export type GabrooMemoryCategory="goal"|"interest"|"saved_phrase"|"learning_note";
export type GabrooMemoryItem={id:string;category:GabrooMemoryCategory;memory_key:string;content:string;source:"learner_saved"|"learner_confirmed";created_at:string;updated_at:string};
export async function listGabrooMemory(){return await authorized("/api/v1/gabroo/memory","GET") as {memory:GabrooMemoryItem[];privacy:{owner_only:boolean;editable:boolean;deletable:boolean;retained_after_subscription_expiry:boolean}};}
export async function createGabrooMemory(input:{category:GabrooMemoryCategory;memory_key:string;content:string}){return await authorized("/api/v1/gabroo/memory","POST",input) as {memory:GabrooMemoryItem};}
export async function updateGabrooMemory(id:string,input:{category?:GabrooMemoryCategory;memory_key?:string;content?:string}){return await authorized("/api/v1/gabroo/memory/"+encodeURIComponent(id),"PATCH",input) as {memory:GabrooMemoryItem};}
export async function deleteGabrooMemory(id:string){await authorized("/api/v1/gabroo/memory/"+encodeURIComponent(id),"DELETE");}

export async function clearGabrooMemory(){return await authorized("/api/v1/gabroo/memory","DELETE") as {deleted_count:number};}

export type PublishedLearningLesson={
 id:string;slug:string|null;title:string;version_id:string;version:number|null;
 content:unknown;script_mode:string|null;register:string|null;dialect_scope:string|null;romanisation:string|null;
};
export type PublishedLearningCatalog={
 learning_direction:"ml_to_en"|"en_to_ml";target_language:"en"|"ml";
 courses:Array<{id:string;code:string;title:string;description:string|null;direction:"ml_to_en"|"en_to_ml";source_language:string;target_language:string;support_language:string;modules:Array<{id:string;title:string;lessons:PublishedLearningLesson[]}>}>;
 publication_policy:{drafts_hidden:boolean;malayalam_requires_educator_approval:boolean};
};
export async function getPublishedLearningCatalog(){
 return await authorized("/api/v1/learning/courses","GET") as PublishedLearningCatalog;
}

export type LearningLessonDetail={
 lesson:{id:string;slug:string;title:string;version_id:string;version:number;learning_direction:"ml_to_en"|"en_to_ml";source_language:string;target_language:string;support_language:string;script_mode:string;register:string|null;dialect_scope:string|null;romanisation:string|null;content:LearnerLessonContent};
 progress:null|{status:"not_started"|"in_progress"|"completed";progress_percent:number;updated_at:string};
};
export async function getLearningLesson(id:string){
 return await authorized("/api/v1/learning/lessons/"+encodeURIComponent(id),"GET") as LearningLessonDetail;
}
export async function saveLearningLessonProgress(id:string,progress_percent:number){
 return await authorized("/api/v1/learning/lessons/"+encodeURIComponent(id)+"/progress","POST",{progress_percent}) as {lesson_id:string;learning_direction:"ml_to_en"|"en_to_ml";progress:{status:string;progress_percent:number;updated_at:string};course_progress:{progress_percent:number;completed_lessons:number;total_started_lessons:number}};
}

export async function submitLearningExerciseAttempt(lessonId:string,exerciseId:string,response:string){
 return await authorized("/api/v1/learning/lessons/"+encodeURIComponent(lessonId)+"/exercises/"+encodeURIComponent(exerciseId)+"/attempts","POST",{response}) as {lesson_id:string;exercise_id:string;result:{correct:boolean;feedback:string}};
}

 
export type VocabularyReviewItem={
 lesson_id:string;lesson_title:string;lesson_version_id:string;vocabulary_item_id:string;
 term:string;meaning:string;pronunciation:string|null;example:string|null;due_at:string;
 repetitions:number;interval_days:number;
};
export type VocabularyReviewQueue={
 learning_direction:"ml_to_en"|"en_to_ml";due_count:number;items:VocabularyReviewItem[];
 policy:{only_current_published_versions:boolean;learner_reports_recall:boolean;missed_reviews_never_block_lessons:boolean};
};
export async function getVocabularyReviewQueue(limit=20){
 if(!Number.isInteger(limit)||limit<1||limit>50)throw new AuthApiError("Choose between 1 and 50 vocabulary words.");
 return await authorized("/api/v1/learning/vocabulary/reviews?limit="+limit,"GET") as VocabularyReviewQueue;
}
export type VocabularyReviewHistoryItem={
 lesson_id:string;lesson_title:string;vocabulary_item_id:string;term:string;rating:number;
 repetitions:number;interval_days:number;due_at:string;reviewed_at:string;
};
export type VocabularyReviewHistory={
 learning_direction:"ml_to_en"|"en_to_ml";items:VocabularyReviewHistoryItem[];
 policy:{only_current_published_versions:boolean;recall_ratings_are_self_reported:boolean};
};
export async function getVocabularyReviewHistory(limit=10){
 if(!Number.isInteger(limit)||limit<1||limit>50)throw new AuthApiError("Choose between 1 and 50 review history entries.");
 return await authorized("/api/v1/learning/vocabulary/history?limit="+limit,"GET") as VocabularyReviewHistory;
}
export type VocabularyRetentionSummary={
 learning_direction:"ml_to_en"|"en_to_ml";
 summary:{total_words:number;reviewed_words:number;mastered_words:number;developing_words:number;due_words:number;last_reviewed_at:string|null};
 policy:{mastery_is_a_review_schedule_signal_not_a_fluency_score:boolean;only_current_published_versions:boolean};
};
export async function getVocabularyRetentionSummary(){
 return await authorized("/api/v1/learning/vocabulary/summary","GET") as VocabularyRetentionSummary;
}
export type VocabularyReviewResult={
 lesson_id:string;vocabulary_item_id:string;learning_direction:"ml_to_en"|"en_to_ml";rating:number;
 schedule:{due_at:string;repetitions:number;interval_days:number;ease_factor:number};
};
export async function submitVocabularyRecallRating(lessonId:string,itemId:string,rating:number){
 if(!Number.isInteger(rating)||rating<0||rating>5)throw new AuthApiError("Recall rating must be between 0 and 5.");
 return await authorized("/api/v1/learning/lessons/"+encodeURIComponent(lessonId)+"/vocabulary/"+encodeURIComponent(itemId)+"/review","POST",{rating}) as VocabularyReviewResult;
}
