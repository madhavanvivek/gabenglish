import {describe,it,expect} from "vitest";
import {loadConfig} from "./config.js";

describe("Gabenglish runtime configuration",()=>{
 it("keeps the Gabroo provider optional when no credentials are supplied",()=>{
  const config=loadConfig({NODE_ENV:"test"});
  expect(config.GABROO_LLM_API_KEY).toBeUndefined();
  expect(config.GABROO_LLM_MODEL).toBeUndefined();
  expect(config.GABROO_STT_MODEL).toBe("whisper-1");
  expect(config.GABROO_TTS_MODEL).toBeUndefined();
  expect(config.GABROO_TTS_VOICE).toBeUndefined();
  expect(config.GABROO_LLM_BASE_URL).toBe("https://api.openai.com/v1");
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
