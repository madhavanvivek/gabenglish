import {describe,it,expect,vi} from "vitest";
import {createGabrooSpeechSynthesisProvider} from "./gabroo-speech-synthesis-provider.js";

describe("Gabroo speech synthesis provider",()=>{
 const config={GABROO_LLM_API_KEY:"test-key",GABROO_LLM_BASE_URL:"https://speech.example/v1/",GABROO_TTS_MODEL:"speech-model",GABROO_TTS_VOICE:"approved-voice"};
 it("stays unavailable until an explicit model and approved voice ID are configured",()=>{
  expect(createGabrooSpeechSynthesisProvider({...config,GABROO_TTS_VOICE:undefined})).toBeUndefined();
  expect(createGabrooSpeechSynthesisProvider({...config,GABROO_TTS_MODEL:undefined})).toBeUndefined();
  expect(createGabrooSpeechSynthesisProvider({...config,GABROO_LLM_API_KEY:undefined})).toBeUndefined();
 
 it("rejects an unexpected provider audio format and invalid declared lengths",async()=>{
  const input={text:"hello",speed:1,signal:new AbortController().signal};
  const wrongType=createGabrooSpeechSynthesisProvider(config,async()=>new Response("{}",{status:200,headers:{"content-type":"application/json"}}))!;
  await expect(wrongType.synthesize(input)).rejects.toThrow(/unsupported audio format/i);
  const malformed=createGabrooSpeechSynthesisProvider(config,async()=>new Response(new Uint8Array([1]),{status:200,headers:{"content-length":"unknown"}}))!;
  await expect(malformed.synthesize(input)).rejects.toThrow(/invalid audio length/i);
  const oversized=createGabrooSpeechSynthesisProvider(config,async()=>new Response(new Uint8Array([1]),{status:200,headers:{"content-length":String(12*1024*1024+1)}}))!;
  await expect(oversized.synthesize(input)).rejects.toThrow(/size limit/i);
 });
});
 it("requests MP3 audio using the configured voice and learner speed",async()=>{
  let captured:{url:string;init:RequestInit}|undefined;
  const fetcher=vi.fn(async(url:string|URL|Request,init?:RequestInit)=>{
   captured={url:String(url),init:init!};
   return new Response(new Uint8Array([1,2,3]),{status:200,headers:{"content-type":"audio/mpeg"}});
  });
  const provider=createGabrooSpeechSynthesisProvider(config,fetcher)!;
  const controller=new AbortController();
  const result=await provider.synthesize({text:"നമസ്കാരം! Let's practise English.",speed:0.9,signal:controller.signal});
  expect(result).toEqual({audio:new Uint8Array([1,2,3]),contentType:"audio/mpeg"});
  expect(captured?.url).toBe("https://speech.example/v1/audio/speech");
  expect((captured?.init.headers as Record<string,string>).authorization).toBe("Bearer test-key");
  expect(captured?.init.signal).toBe(controller.signal);
  expect(JSON.parse(String(captured?.init.body))).toEqual({
   model:"speech-model",voice:"approved-voice",input:"നമസ്കാരം! Let's practise English.",response_format:"mp3",speed:0.9
  });
 });
 it("rejects invalid text and unsupported playback speeds before calling the provider",async()=>{
  const fetcher=vi.fn(async()=>new Response(new Uint8Array([1]),{status:200}));
  const provider=createGabrooSpeechSynthesisProvider(config,fetcher)!;
  const signal=new AbortController().signal;
  await expect(provider.synthesize({text:"  ",speed:1,signal})).rejects.toThrow("1–4000 characters");
  await expect(provider.synthesize({text:"hello",speed:1.6,signal})).rejects.toThrow("between 0.75");
  await expect(provider.synthesize({text:"x".repeat(4001),speed:1,signal})).rejects.toThrow("1–4000 characters");
  expect(fetcher).not.toHaveBeenCalled();
 });
 it("rejects provider errors, empty audio and oversized audio",async()=>{
  const input={text:"hello",speed:1,signal:new AbortController().signal};
  const failed=createGabrooSpeechSynthesisProvider(config,async()=>new Response("unavailable",{status:503}))!;
  await expect(failed.synthesize(input)).rejects.toThrow("status 503");
  const empty=createGabrooSpeechSynthesisProvider(config,async()=>new Response(new Uint8Array(),{status:200}))!;
  await expect(empty.synthesize(input)).rejects.toThrow("empty audio");
  const large=createGabrooSpeechSynthesisProvider(config,async()=>new Response(new Uint8Array(12*1024*1024+1),{status:200}))!;
  await expect(large.synthesize(input)).rejects.toThrow("size limit");
 });
});
