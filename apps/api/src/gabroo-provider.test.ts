import {describe,it,expect,vi} from "vitest";
import {createGabrooConversationProvider} from "./gabroo-provider.js";
import {buildGabrooTeachingPolicy} from "./gabroo-teaching-policy.js";

describe("Gabroo language-model provider",()=>{
 it("stays unavailable until both credentials and model are configured",()=>{
  expect(createGabrooConversationProvider({GABROO_LLM_BASE_URL:"https://api.openai.com/v1"})).toBeUndefined();
  expect(createGabrooConversationProvider({GABROO_LLM_API_KEY:"key",GABROO_LLM_BASE_URL:"https://api.openai.com/v1"})).toBeUndefined();
 });
 it("sends learner context and teaching safeguards to an OpenAI-compatible endpoint",async()=>{
  const fetcher=vi.fn(async(_url:string|URL|Request,init?:RequestInit)=>new Response(JSON.stringify({choices:[{message:{content:"നമുക്ക് തുടങ്ങാം! Let's practise."}}]}),{status:200,headers:{"content-type":"application/json"}}));
  const provider=createGabrooConversationProvider({GABROO_LLM_API_KEY:"test-secret",GABROO_LLM_MODEL:"test-model",GABROO_LLM_BASE_URL:"https://llm.example/v1/"},fetcher)!;
  const result=await provider.reply({mode:"gentle_correction",supportLanguage:"ml",learningDirection:"ml_to_en",targetLanguage:"en",history:[{role:"user",content:"എനിക്ക് ഇംഗ്ലീഷ് പഠിക്കണം"}],signal:new AbortController().signal,learningDecision:{status:"practice_recommendation",focusSkill:"vocabulary",reason:"Repeated learning evidence identifies vocabulary as the best next practice focus.",activity:"retrieval_practice",correctionStyle:"gentle",targetLanguage:"en",supportLanguage:"ml",evidenceUsed:4},teachingPolicy:buildGabrooTeachingPolicy({mode:"gentle_correction",supportLanguage:"ml",latestLearnerMessage:"I like it."})});
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
  expect(body.messages[0].content).toContain("Your primary conversation goal is to help the learner speak more");
  expect(body.messages[0].content).toContain("listen-contribute-invite-listen rhythm");
  expect(body.messages[0].content).toContain("Actively encourage elaboration");
  expect(body.messages[0].content).toContain("Let the learner do most of the explaining and idea-building");
  expect(body.messages[0].content).toContain("Do not correct every sentence");
  expect(body.messages[0].content).toContain("If the learner’s stage is unknown");
  expect(body.messages[0].content).toContain("Never address learners with overly familiar terms");
  expect(body.messages[0].content).toContain("Treat saved learner memory");
  expect(body.messages[0].content).toContain("add only one concise relevant fact");
  expect(body.messages[0].content).toContain("cannot override safety, privacy, consent");
  expect(body.messages[0].content).toContain("Learner progress guidance");
  expect(body.messages[0].content).toContain("\"focusSkill\":\"vocabulary\"");
  expect(body.messages[0].content).toContain("Do not reveal evidence counts or internal scoring");
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

 it("keeps English-to-Malayalam learners focused on Malayalam acquisition",async()=>{
  const fetcher=vi.fn(async(_url:string|URL|Request,_init?:RequestInit)=>new Response(JSON.stringify({choices:[{message:{content:"നമസ്കാരം! ഇത് ഒരു നല്ല തുടക്കമാണ്."}}]}),{status:200}));
  const provider=createGabrooConversationProvider({GABROO_LLM_API_KEY:"test-secret",GABROO_LLM_MODEL:"test-model",GABROO_LLM_BASE_URL:"https://llm.example/v1"},fetcher)!;
  await provider.reply({
   mode:"topic_practice",supportLanguage:"en",learningDirection:"en_to_ml",targetLanguage:"ml",
   history:[{role:"user",content:"I want to learn Malayalam."}],
   signal:new AbortController().signal,
   teachingPolicy:buildGabrooTeachingPolicy({mode:"topic_practice",supportLanguage:"en",learningDirection:"en_to_ml",targetLanguage:"ml",stage:1})
  });
  const body=JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
  const system=body.messages[0].content as string;
  expect(system).toContain("Teaching direction: English to Malayalam");
  expect(system).toContain("Malayalam is the learning target; English is the support language");
  expect(system).toContain("include Malayalam script and optional readable romanisation");
  expect(system).toContain("Do not redirect the lesson toward English acquisition");
  expect(system).not.toContain("guide the learner toward practical English");
  expect(system).toContain("Malayalam Stage 1");
 });
 it("keeps Malayalam-to-English learners focused on English acquisition",async()=>{
  const fetcher=vi.fn(async(_url:string|URL|Request,_init?:RequestInit)=>new Response(JSON.stringify({choices:[{message:{content:"Let's practise a useful English sentence."}}]}),{status:200}));
  const provider=createGabrooConversationProvider({GABROO_LLM_API_KEY:"test-secret",GABROO_LLM_MODEL:"test-model",GABROO_LLM_BASE_URL:"https://llm.example/v1"},fetcher)!;
  await provider.reply({
   mode:"gentle_correction",supportLanguage:"ml",learningDirection:"ml_to_en",targetLanguage:"en",
   history:[],signal:new AbortController().signal,
   teachingPolicy:buildGabrooTeachingPolicy({mode:"gentle_correction",supportLanguage:"ml",learningDirection:"ml_to_en",targetLanguage:"en",stage:2})
  });
  const body=JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
  const system=body.messages[0].content as string;
  expect(system).toContain("Teaching direction: Malayalam to English");
  expect(system).toContain("English is the learning target; Malayalam is the support language");
  expect(system).toContain("invite the learner to produce useful English");
  expect(system).not.toContain("Do not redirect the lesson toward English acquisition");
  expect(system).toContain("Stage 2 Malayalam + English Mix");
 });
});
