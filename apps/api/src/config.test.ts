import {describe,it,expect} from "vitest";
import {loadConfig} from "./config.js";

describe("Gabenglish runtime configuration",()=>{
 it("keeps Gabroo providers optional when no credentials are supplied",()=>{
  const config=loadConfig({NODE_ENV:"test"});
  expect(config.GABROO_LLM_API_KEY).toBeUndefined();
  expect(config.GABROO_LLM_MODEL).toBeUndefined();
  expect(config.GABROO_STT_MODEL).toBe("whisper-1");
  expect(config.GABROO_TTS_ENABLED).toBe(true);
  expect(config.GABROO_TTS_MODEL).toBeUndefined();
  expect(config.GABROO_TTS_VOICE).toBeUndefined();
  expect(config.GABROO_GOOGLE_TTS_API_KEY).toBeUndefined();
  expect(config.GABROO_GOOGLE_TTS_VOICE).toBeUndefined();
  expect(config.GABROO_GOOGLE_TTS_LANGUAGE_CODE).toBe("ml-IN");
  expect(config.GABROO_GOOGLE_TTS_ENGLISH_LANGUAGE_CODE).toBe("en-US");
  expect(config.GABROO_TTS_DAILY_CHARACTER_LIMIT).toBe(10_000);
  expect(config.GABROO_TTS_MONTHLY_CHARACTER_LIMIT).toBe(100_000);
  expect(config.GABROO_LLM_BASE_URL).toBe("https://api.openai.com/v1");
 });
 it("supports an explicit operational speech kill switch",()=>{
  expect(loadConfig({NODE_ENV:"test",GABROO_TTS_ENABLED:"false"}).GABROO_TTS_ENABLED).toBe(false);
  expect(loadConfig({NODE_ENV:"test",GABROO_TTS_ENABLED:"true"}).GABROO_TTS_ENABLED).toBe(true);
  expect(()=>loadConfig({NODE_ENV:"test",GABROO_TTS_ENABLED:"off"})).toThrow("Invalid environment configuration");
 });
 it("requires the API key and model to be configured together",()=>{
  expect(()=>loadConfig({NODE_ENV:"test",GABROO_LLM_API_KEY:"secret"})).toThrow("Invalid environment configuration");
  expect(()=>loadConfig({NODE_ENV:"test",GABROO_LLM_MODEL:"model"})).toThrow("Invalid environment configuration");
 });
 it("requires TTS model and voice to be configured together",()=>{
  expect(()=>loadConfig({NODE_ENV:"test",GABROO_TTS_MODEL:"tts-model"})).toThrow("Invalid environment configuration");
  expect(()=>loadConfig({NODE_ENV:"test",GABROO_TTS_VOICE:"voice-id"})).toThrow("Invalid environment configuration");
  expect(()=>loadConfig({NODE_ENV:"test",GABROO_LLM_API_KEY:"key",GABROO_TTS_MODEL:"tts-model",GABROO_TTS_VOICE:"voice-id"})).toThrow("Invalid environment configuration");
 });
 it("accepts explicit TTS model and voice with provider credentials",()=>{
  const config=loadConfig({NODE_ENV:"test",GABROO_LLM_API_KEY:"secret",GABROO_LLM_MODEL:"chat-model",GABROO_TTS_MODEL:"speech-model",GABROO_TTS_VOICE:"approved-voice"});
  expect(config.GABROO_TTS_MODEL).toBe("speech-model");
  expect(config.GABROO_TTS_VOICE).toBe("approved-voice");
 });
 it("accepts a complete Google Cloud TTS configuration for an explicit Malayalam voice",()=>{
  const config=loadConfig({NODE_ENV:"test",GABROO_GOOGLE_TTS_API_KEY:"server-secret",GABROO_GOOGLE_TTS_LANGUAGE_CODE:"ml-IN",GABROO_GOOGLE_TTS_VOICE:"ml-IN-Standard-B"});
  expect(config.GABROO_GOOGLE_TTS_VOICE).toBe("ml-IN-Standard-B");
  expect(config.GABROO_GOOGLE_TTS_LANGUAGE_CODE).toBe("ml-IN");
 });
 it("requires Google TTS credentials and voice together and rejects locale mismatches",()=>{
  expect(()=>loadConfig({NODE_ENV:"test",GABROO_GOOGLE_TTS_API_KEY:"secret"})).toThrow("Invalid environment configuration");
  expect(()=>loadConfig({NODE_ENV:"test",GABROO_GOOGLE_TTS_VOICE:"ml-IN-Standard-B"})).toThrow("Invalid environment configuration");
  expect(()=>loadConfig({NODE_ENV:"test",GABROO_GOOGLE_TTS_API_KEY:"secret",GABROO_GOOGLE_TTS_VOICE:"en-US-Standard-C"})).toThrow("Invalid environment configuration");
 });
 it("allows a configured English locale for bilingual Google SSML and rejects malformed values",()=>{\n  const config=loadConfig({NODE_ENV:"test",GABROO_GOOGLE_TTS_ENGLISH_LANGUAGE_CODE:"en-GB"});\n  expect(config.GABROO_GOOGLE_TTS_ENGLISH_LANGUAGE_CODE).toBe("en-GB");\n  expect(()=>loadConfig({NODE_ENV:"test",GABROO_GOOGLE_TTS_ENGLISH_LANGUAGE_CODE:"english"})).toThrow("Invalid environment configuration");\n });\n it("prevents two TTS providers from being configured simultaneously",()=>{
  expect(()=>loadConfig({NODE_ENV:"test",GABROO_GOOGLE_TTS_API_KEY:"secret",GABROO_GOOGLE_TTS_VOICE:"ml-IN-Standard-B",GABROO_LLM_API_KEY:"secret",GABROO_LLM_MODEL:"chat",GABROO_TTS_MODEL:"tts",GABROO_TTS_VOICE:"voice"})).toThrow("Invalid environment configuration");
 });
 it("validates configurable daily and monthly speech quotas",()=>{
  expect(loadConfig({NODE_ENV:"test",GABROO_TTS_DAILY_CHARACTER_LIMIT:"5000",GABROO_TTS_MONTHLY_CHARACTER_LIMIT:"50000"}).GABROO_TTS_DAILY_CHARACTER_LIMIT).toBe(5000);
  expect(()=>loadConfig({NODE_ENV:"test",GABROO_TTS_DAILY_CHARACTER_LIMIT:"0"})).toThrow("Invalid environment configuration");
  expect(()=>loadConfig({NODE_ENV:"test",GABROO_TTS_DAILY_CHARACTER_LIMIT:"5000",GABROO_TTS_MONTHLY_CHARACTER_LIMIT:"4000"})).toThrow("Invalid environment configuration");
 });
 it("accepts a complete OpenAI-compatible provider configuration",()=>{
  const config=loadConfig({NODE_ENV:"test",GABROO_LLM_API_KEY:"secret",GABROO_LLM_MODEL:"model",GABROO_LLM_BASE_URL:"https://llm.example/v1"});
  expect(config.GABROO_LLM_MODEL).toBe("model");
  expect(config.GABROO_LLM_BASE_URL).toBe("https://llm.example/v1");
 });
 it("requires HTTPS for configured provider endpoints in production",()=>{
  const production={NODE_ENV:"production",AUTH_TOKEN_SECRET:"p".repeat(48),GABROO_LLM_API_KEY:"secret",GABROO_LLM_MODEL:"model"};
  expect(()=>loadConfig({...production,GABROO_LLM_BASE_URL:"http://llm.example/v1"})).toThrow("Invalid environment configuration");
  expect(loadConfig({...production,GABROO_LLM_BASE_URL:"https://llm.example/v1"}).GABROO_LLM_BASE_URL).toBe("https://llm.example/v1");
 });
 it("rejects malformed provider endpoints",()=>{
  expect(()=>loadConfig({NODE_ENV:"test",GABROO_LLM_BASE_URL:"not-a-url"})).toThrow("Invalid environment configuration");
 });
});
