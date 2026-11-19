import {describe,it,expect,vi} from "vitest";
import {createGabrooSpeechRecognitionProvider} from "./gabroo-recognition-provider.js";

describe("Gabroo speech recognition provider",()=>{
 it("stays unavailable without a configured API key",()=>{
  expect(createGabrooSpeechRecognitionProvider({GABROO_LLM_BASE_URL:"https://api.openai.com/v1"})).toBeUndefined();
 });
 it("uploads Malayalam audio with the configured model and returns an unconfirmed transcript",async()=>{
  let captured:{url:string;init:RequestInit}|undefined;
  const fetcher=vi.fn(async(url:string|URL|Request,init?:RequestInit)=>{
   captured={url:String(url),init:init!};
   return new Response(JSON.stringify({text:"എനിക്ക് ഇംഗ്ലീഷ് പഠിക്കണം",language:"malayalam"}),{status:200});
  });
  const provider=createGabrooSpeechRecognitionProvider({GABROO_LLM_API_KEY:"test-secret",GABROO_LLM_BASE_URL:"https://llm.example/v1/",GABROO_STT_MODEL:"whisper-test"},fetcher)!;
  const controller=new AbortController();
  const result=await provider.transcribe({audio:new Uint8Array([1,2,3]),mimeType:"audio/mp4",language:"ml-IN",signal:controller.signal});
  expect(result).toEqual({text:"എനിക്ക് ഇംഗ്ലീഷ് പഠിക്കണം",languageDetected:"ml"});
  expect(captured?.url).toBe("https://llm.example/v1/audio/transcriptions");
  expect((captured?.init.headers as Record<string,string>).authorization).toBe("Bearer test-secret");
  expect(captured?.init.signal).toBe(controller.signal);
  const form=captured?.init.body as FormData;
  expect(form.get("model")).toBe("whisper-test");
  expect(form.get("response_format")).toBe("verbose_json");
  expect(form.get("language")).toBe("ml");
  expect(form.get("file")).toBeInstanceOf(Blob);
 });
 it("leaves language unspecified for mixed Malayalam-English recordings",async()=>{
  let form:FormData|undefined;
  const provider=createGabrooSpeechRecognitionProvider({GABROO_LLM_API_KEY:"key",GABROO_LLM_BASE_URL:"https://llm.example/v1"},async(_url,init)=>{form=init?.body as FormData;return new Response(JSON.stringify({text:"Let's practise English"}),{status:200});})!;
  const result=await provider.transcribe({audio:new Uint8Array([9]),mimeType:"audio/webm",language:"ml-en",signal:new AbortController().signal});
  expect(form?.get("language")).toBeNull();
  expect(result.languageDetected).toBe("unknown");
 });
 it("prefers the provider's detected language when available",async()=>{
  const provider=createGabrooSpeechRecognitionProvider({GABROO_LLM_API_KEY:"key",GABROO_LLM_BASE_URL:"https://llm.example/v1"},async()=>new Response(JSON.stringify({text:"Good morning",language:"english"}),{status:200}))!;
  const result=await provider.transcribe({audio:new Uint8Array([1]),mimeType:"audio/wav",language:"ml-IN",signal:new AbortController().signal});
  expect(result.languageDetected).toBe("en");
 });
 it("rejects failed and empty transcription responses",async()=>{
  const failed=createGabrooSpeechRecognitionProvider({GABROO_LLM_API_KEY:"key",GABROO_LLM_BASE_URL:"https://llm.example/v1"},async()=>new Response("failed",{status:503}))!;
  const input={audio:new Uint8Array([1]),mimeType:"audio/ogg" as const,language:"en-IN" as const,signal:new AbortController().signal};
  await expect(failed.transcribe(input)).rejects.toThrow("status 503");
  const empty=createGabrooSpeechRecognitionProvider({GABROO_LLM_API_KEY:"key",GABROO_LLM_BASE_URL:"https://llm.example/v1"},async()=>new Response(JSON.stringify({text:"  "}),{status:200}))!;
  await expect(empty.transcribe(input)).rejects.toThrow("no transcript");
 });
});
