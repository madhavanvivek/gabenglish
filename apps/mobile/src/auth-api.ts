import * as SecureStore from "expo-secure-store";
import {authTokenResponseSchema,type AuthTokenResponse} from "@gabenglish/contracts";

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
 support_language:"ml"|"en";learning_goal:string|null;correction_mode:"gentle"|"balanced"|"detailed";daily_target_minutes:number;reminders_enabled:boolean;gabroo_speech_rate:number;
};
export type LearnerMe={user:LearnerAccount;preferences:LearnerPreferences|null};

function baseUrl(){
 if(!API_BASE_URL)throw new AuthApiError("The Gabenglish API is not configured. Set EXPO_PUBLIC_API_BASE_URL.");
 try{
  const parsed=new URL(API_BASE_URL);
  if(parsed.protocol!=="https:"&&parsed.hostname!=="localhost"&&parsed.hostname!=="127.0.0.1")throw new Error("HTTPS required");
 }catch{throw new AuthApiError("The Gabenglish API address must be a valid HTTPS URL (HTTP is allowed only for localhost).");}
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
async function authorized(path:string,method:"GET"|"POST"|"PATCH"|"DELETE",body?:unknown):Promise<unknown>{
 let access=await SecureStore.getItemAsync(ACCESS_KEY);
 if(!access){await renewSession();access=await SecureStore.getItemAsync(ACCESS_KEY);}
 const send=()=>fetch(baseUrl()+path,{method,headers:{"content-type":"application/json",accept:"application/json",authorization:"Bearer "+access},...(body===undefined?{}:{body:JSON.stringify(body)})});
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
export async function getSubscriptionStatus(){return await authorized("/api/v1/subscriptions/current","GET") as SubscriptionStatus;}
export async function listGabrooConversations(){return await authorized("/api/v1/gabroo/conversations","GET") as {conversations:GabrooConversation[]};}
export async function getGabrooConversation(id:string){return await authorized("/api/v1/gabroo/conversations/"+encodeURIComponent(id),"GET") as {conversation:GabrooConversation;messages:GabrooConversationMessage[]};}
export async function createGabrooConversation(input:{mode?:GabrooConversationMode;support_language?:"ml"|"en";title?:string}={}){
 return await authorized("/api/v1/gabroo/conversations","POST",input) as {conversation:GabrooConversation};
}
export async function sendGabrooMessage(id:string,message:string){
 return await authorized("/api/v1/gabroo/conversations/"+encodeURIComponent(id)+"/messages","POST",{message}) as {messages:GabrooConversationMessage[]};
}
export async function deleteGabrooConversation(id:string){
 await authorized("/api/v1/gabroo/conversations/"+encodeURIComponent(id),"DELETE");
}
