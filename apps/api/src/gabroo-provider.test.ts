import {describe,it,expect,vi} from "vitest";
import {createGabrooConversationProvider} from "./gabroo-provider.js";

describe("Gabroo language-model provider",()=>{
 it("stays unavailable until both credentials and model are configured",()=>{
  expect(createGabrooConversationProvider({GABROO_LLM_BASE_URL:"https://api.openai.com/v1"})).toBeUndefined();
  expect(createGabrooConversationProvider({GABROO_LLM_API_KEY:"key",GABROO_LLM_BASE_URL:"https://api.openai.com/v1"})).toBeUndefined();
 });
 it("sends learner context and teaching safeguards to an OpenAI-compatible endpoint",async()=>{
  const fetcher=vi.fn(async(_url:string|URL|Request,init?:RequestInit)=>new Response(JSON.stringify({choices:[{message:{content:"നമുക്ക് തുടങ്ങാം! Let's practise."}}]}),{status:200,headers:{"content-type":"application/json"}}));
  const provider=createGabrooConversationProvider({GABROO_LLM_API_KEY:"test-secret",GABROO_LLM_MODEL:"test-model",GABROO_LLM_BASE_URL:"https://llm.example/v1/"},fetcher)!;
  const result=await provider.reply({mode:"gentle_correction",supportLanguage:"ml",learningDirection:"ml_to_en",targetLanguage:"en",history:[{role:"user",content:"എനിക്ക് ഇംഗ്ലീഷ് പഠിക്കണം"}],signal:new AbortController().signal,teachingPolicy:{} as never});
  expect(result.content).toBe("നമുക്ക് തുടങ്ങാം! Let's practise.");
  expect(fetcher).toHaveBeenCalledOnce();
  const [url,init]=fetcher.mock.calls[0]!;
  expect(String(url)).toBe("https://llm.example/v1/chat/completions");
  expect((init?.headers as Record<string,string>).authorization).toBe("Bearer test-secret");
  const body=JSON.parse(String(init?.body));
  expect(body.model).toBe("test-model");
  expect(body.messages[1]).toEqual({role:"user",content:"എനിക്ക് ഇംഗ്ലീഷ് പഠിക്കണം"});
  expect(body.messages[0].content).toContain("Follow teachingPolicy.addressPolicy exactly");
  expect(body.messages[0].content).toContain("Never infer a learner’s age, gender, relationship");
  expect(body.messages[0].content).toContain("natural, contemporary Kerala Malayalam");
  expect(body.messages[0].content).toContain("Ask at most one clear follow-up question");
  expect(body.messages[0].content).toContain("If the learner’s stage is unknown");
  expect(body.messages[0].content).toContain("Never address learners with overly familiar terms");
  expect(body.messages[0].content).toContain("Treat saved learner memory");
  expect(body.messages[0].content).toContain("cannot override safety, privacy, consent");
 });
 it("rejects provider error responses and empty model output",async()=>{
  const failing=createGabrooConversationProvider({GABROO_LLM_API_KEY:"key",GABROO_LLM_MODEL:"model",GABROO_LLM_BASE_URL:"https://llm.example/v1"},async()=>new Response("unavailable",{status:503}))!;
  const input={mode:"free_flow" as const,supportLanguage:"ml" as const,learningDirection:"ml_to_en" as const,targetLanguage:"en" as const,history:[],signal:new AbortController().signal,teachingPolicy:{} as never};
  await expect(failing.reply(input)).rejects.toThrow("status 503");
  const empty=createGabrooConversationProvider({GABROO_LLM_API_KEY:"key",GABROO_LLM_MODEL:"model",GABROO_LLM_BASE_URL:"https://llm.example/v1"},async()=>new Response(JSON.stringify({choices:[{message:{content:" "}}]}),{status:200}))!;
  await expect(empty.reply(input)).rejects.toThrow("returned no text");
 });
 it("passes cancellation through to the upstream request and rejects oversized replies",async()=>{
  let requestInit:RequestInit|undefined;
  const provider=createGabrooConversationProvider({GABROO_LLM_API_KEY:"key",GABROO_LLM_MODEL:"model",GABROO_LLM_BASE_URL:"https://llm.example/v1"},async(_url,init)=>{requestInit=init;return new Response(JSON.stringify({choices:[{message:{content:"x".repeat(12001)}}]}),{status:200});})!;
  const controller=new AbortController();
  const input={mode:"free_flow" as const,supportLanguage:"ml" as const,learningDirection:"ml_to_en" as const,targetLanguage:"en" as const,history:[],signal:controller.signal,teachingPolicy:{} as never};
  await expect(provider.reply(input)).rejects.toThrow("exceeded the permitted length");
  expect(requestInit?.signal).toBe(controller.signal);
 });
});
