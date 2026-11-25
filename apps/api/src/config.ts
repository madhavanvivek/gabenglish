import { z } from "zod";
const schema=z.object({
 NODE_ENV:z.enum(["development","test","production"]).default("development"),
 HOST:z.string().default("0.0.0.0"),
 PORT:z.coerce.number().int().min(1).max(65535).default(4000),
 DATABASE_URL:z.string().url().optional(),
 AUTH_TOKEN_SECRET:z.string().min(32).default("gabenglish-local-development-secret-change-before-deploy"),
 CORS_ORIGINS:z.string().default("http://localhost:8081,http://localhost:19006"),
 GABROO_LLM_API_KEY:z.string().optional(),
 GABROO_LLM_BASE_URL:z.string().url().default("https://api.openai.com/v1"),
 GABROO_LLM_MODEL:z.string().optional(),
 GABROO_STT_MODEL:z.string().default("whisper-1"),
 GABROO_TTS_ENABLED:z.enum(["true","false"]).default("true").transform(value=>value==="true"),
 GABROO_TTS_MODEL:z.string().optional(),
 GABROO_TTS_VOICE:z.string().optional(),
 GABROO_GOOGLE_TTS_API_KEY:z.string().optional(),
 GABROO_GOOGLE_TTS_VOICE:z.string().optional(),
 GABROO_GOOGLE_TTS_LANGUAGE_CODE:z.string().default("ml-IN"),
 GABROO_GOOGLE_TTS_ENGLISH_LANGUAGE_CODE:z.string().default("en-US"),
 GABROO_GOOGLE_TTS_INPUT_MODE:z.enum(["ssml","text"]).default("ssml"),
 GABROO_TTS_DAILY_CHARACTER_LIMIT:z.coerce.number().int().min(1).max(10_000_000).default(10_000),
 GABROO_TTS_MONTHLY_CHARACTER_LIMIT:z.coerce.number().int().min(1).max(100_000_000).default(100_000)
}).superRefine((value,ctx)=>{
 if(value.NODE_ENV==="production"&&value.AUTH_TOKEN_SECRET==="gabenglish-local-development-secret-change-before-deploy"){
  ctx.addIssue({code:"custom",path:["AUTH_TOKEN_SECRET"],message:"AUTH_TOKEN_SECRET must be replaced before production."});
 }
 if(value.NODE_ENV==="production"&&new URL(value.GABROO_LLM_BASE_URL).protocol!=="https:"){
  ctx.addIssue({code:"custom",path:["GABROO_LLM_BASE_URL"],message:"Gabroo provider endpoints must use HTTPS in production."});
 }
 if(Boolean(value.GABROO_TTS_MODEL)!==Boolean(value.GABROO_TTS_VOICE)){
  ctx.addIssue({code:"custom",path:["GABROO_TTS_VOICE"],message:"GABROO_TTS_MODEL and GABROO_TTS_VOICE must be configured together."});
 }
 if(Boolean(value.GABROO_TTS_MODEL)&&!value.GABROO_LLM_API_KEY){
  ctx.addIssue({code:"custom",path:["GABROO_LLM_API_KEY"],message:"GABROO_LLM_API_KEY is required when Gabroo speech synthesis is configured."});
 }
 if(Boolean(value.GABROO_LLM_API_KEY)!==Boolean(value.GABROO_LLM_MODEL)){
  ctx.addIssue({code:"custom",path:["GABROO_LLM_MODEL"],message:"GABROO_LLM_API_KEY and GABROO_LLM_MODEL must be configured together."});
 }
 if(!/^[a-z]{2,3}-[A-Z]{2,4}$/.test(value.GABROO_GOOGLE_TTS_LANGUAGE_CODE)){
  ctx.addIssue({code:"custom",path:["GABROO_GOOGLE_TTS_LANGUAGE_CODE"],message:"Google TTS language code must be a valid locale tag."});
 }
 if(!/^[a-z]{2,3}-[A-Z]{2,4}$/.test(value.GABROO_GOOGLE_TTS_ENGLISH_LANGUAGE_CODE)){
  ctx.addIssue({code:"custom",path:["GABROO_GOOGLE_TTS_ENGLISH_LANGUAGE_CODE"],message:"Google TTS English language code must be a valid locale tag."});
 }
 if(Boolean(value.GABROO_GOOGLE_TTS_API_KEY)!==Boolean(value.GABROO_GOOGLE_TTS_VOICE)){
  ctx.addIssue({code:"custom",path:["GABROO_GOOGLE_TTS_VOICE"],message:"Google TTS API key and explicit voice ID must be configured together."});
 }
 if(value.GABROO_GOOGLE_TTS_VOICE&&!value.GABROO_GOOGLE_TTS_VOICE.startsWith(value.GABROO_GOOGLE_TTS_LANGUAGE_CODE+"-")){
  ctx.addIssue({code:"custom",path:["GABROO_GOOGLE_TTS_VOICE"],message:"Google TTS voice must match GABROO_GOOGLE_TTS_LANGUAGE_CODE."});
 }
 if(value.GABROO_TTS_MONTHLY_CHARACTER_LIMIT<value.GABROO_TTS_DAILY_CHARACTER_LIMIT){
  ctx.addIssue({code:"custom",path:["GABROO_TTS_MONTHLY_CHARACTER_LIMIT"],message:"Monthly Gabroo speech character limit must be at least the daily limit."});
 }
 if(value.GABROO_GOOGLE_TTS_API_KEY&&value.GABROO_TTS_MODEL){
  ctx.addIssue({code:"custom",path:["GABROO_GOOGLE_TTS_API_KEY"],message:"Configure only one Gabroo speech synthesis provider at a time."});
 }
});
export function loadConfig(source:NodeJS.ProcessEnv=process.env){
 const p=schema.safeParse(source);
 if(!p.success)throw new Error("Invalid environment configuration");
 return {...p.data,corsOrigins:p.data.CORS_ORIGINS.split(",").map(x=>x.trim()).filter(Boolean)};
}
export type AppConfig=ReturnType<typeof loadConfig>;
