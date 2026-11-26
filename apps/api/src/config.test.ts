import {describe,it,expect} from "vitest";
import {loadConfig} from "./config.js";

describe("Gabroo provider configuration",()=>{
 it("keeps the provider optional when no key or model is configured",()=>{
  const config=loadConfig({NODE_ENV:"test"});
  expect(config.GABROO_API_KEY).toBeUndefined();
  expect(config.GABROO_API_MODEL).toBeUndefined();
  expect(config.GABROO_API_BASE_URL).toBe("https://api.openai.com/v1");
 });
 it("treats blank example environment values as an unconfigured optional provider",()=>{
  const config=loadConfig({NODE_ENV:"test",GABROO_API_KEY:"",GABROO_API_MODEL:""});
  expect(config.GABROO_API_KEY).toBeUndefined();
  expect(config.GABROO_API_MODEL).toBeUndefined();
 });

 it("accepts a complete OpenAI-compatible provider configuration",()=>{
  const config=loadConfig({
   NODE_ENV:"test",GABROO_API_KEY:"provider-secret",
   GABROO_API_BASE_URL:"https://gateway.example/v1",GABROO_API_MODEL:"chat-model"
  });
  expect(config).toMatchObject({
   GABROO_API_KEY:"provider-secret",
   GABROO_API_BASE_URL:"https://gateway.example/v1",
   GABROO_API_MODEL:"chat-model"
  });
 });
 it("rejects a key without a model",()=>{
  expect(()=>loadConfig({NODE_ENV:"test",GABROO_API_KEY:"provider-secret"})).toThrow("Invalid environment configuration");
 });
 it("rejects a model without a key",()=>{
  expect(()=>loadConfig({NODE_ENV:"test",GABROO_API_MODEL:"chat-model"})).toThrow("Invalid environment configuration");
 });
 it("rejects a malformed provider base URL",()=>{
  expect(()=>loadConfig({NODE_ENV:"test",GABROO_API_KEY:"provider-secret",GABROO_API_MODEL:"chat-model",GABROO_API_BASE_URL:"not-a-url"})).toThrow("Invalid environment configuration");
 });
 it("defaults Gabroo output generation to a bounded 512 tokens",()=>{
  expect(loadConfig({NODE_ENV:"test"}).GABROO_API_MAX_OUTPUT_TOKENS).toBe(512);
 });
 it("accepts a configured output token budget within safe limits",()=>{
  expect(loadConfig({NODE_ENV:"test",GABROO_API_MAX_OUTPUT_TOKENS:"768"}).GABROO_API_MAX_OUTPUT_TOKENS).toBe(768);
 });
 it("rejects output token budgets outside the supported range",()=>{
  expect(()=>loadConfig({NODE_ENV:"test",GABROO_API_MAX_OUTPUT_TOKENS:"32"})).toThrow("Invalid environment configuration");
  expect(()=>loadConfig({NODE_ENV:"test",GABROO_API_MAX_OUTPUT_TOKENS:"4096"})).toThrow("Invalid environment configuration");
 });

});
