import {describe,it,expect,vi} from "vitest";
import {createOpenAICompatibleGabrooProvider} from "./gabroo-openai-provider.js";
import {buildGabrooTeachingPolicy} from "./gabroo-teaching-policy.js";

const policy=buildGabrooTeachingPolicy({mode:"gentle_correction",supportLanguage:"ml",learningDirection:"ml_to_en",targetLanguage:"en",stage:2});
const input={mode:"gentle_correction" as const,supportLanguage:"ml" as const,learningDirection:"ml_to_en" as const,targetLanguage:"en" as const,history:[{role:"user" as const,content:"I am go to office."}],signal:new AbortController().signal,teachingPolicy:policy};

describe("OpenAI-compatible Gabroo provider",()=>{
 it("sends the live policy and conversation history and returns provider text",async()=>{
  const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content:"Good try! Say: I am going to the office."}}]}),{status:200,headers:{"content-type":"application/json"}}));
  vi.stubGlobal("fetch",fetchMock);
  try{
   const provider=createOpenAICompatibleGabrooProvider({apiKey:"test-secret",baseUrl:"https://provider.example/v1/",model:"gabroo-test"});
   await expect(provider.reply(input)).resolves.toEqual({content:"Good try! Say: I am going to the office."});
   expect(fetchMock).toHaveBeenCalledOnce();
   const [url,init]=fetchMock.mock.calls[0] as [string,RequestInit];
   expect(url).toBe("https://provider.example/v1/chat/completions");
   expect((init.headers as Record<string,string>).authorization).toBe("Bearer test-secret");
   const body=JSON.parse(String(init.body));
   expect(body.model).toBe("gabroo-test");
   expect(body.messages[0].content).toContain("Stage 2 Malayalam + English Mix");
   expect(body.messages[1]).toEqual({role:"user",content:"I am go to office."});
   expect(init.signal).toBe(input.signal);
  }finally{vi.unstubAllGlobals();}
 });
 it("rejects provider errors without returning provider payload as learner content",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{message:"rate limited"}}),{status:429})));
  try{
   const provider=createOpenAICompatibleGabrooProvider({apiKey:"test-secret",baseUrl:"https://provider.example/v1",model:"gabroo-test"});
   await expect(provider.reply(input)).rejects.toThrow("Gabroo provider HTTP 429: rate limited");
  }finally{vi.unstubAllGlobals();}
 });
 it("rejects malformed or empty provider responses",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content:"  "}}]}),{status:200})));
  try{
   const provider=createOpenAICompatibleGabrooProvider({apiKey:"test-secret",baseUrl:"https://provider.example/v1",model:"gabroo-test"});
   await expect(provider.reply(input)).rejects.toThrow("no text response");
  }finally{vi.unstubAllGlobals();}
 });
 it("propagates the conversation abort signal to fetch",async()=>{
  const controller=new AbortController();
  const fetchMock=vi.fn().mockImplementation((_url:string,init:RequestInit)=>new Promise((_resolve,reject)=>{
   init.signal?.addEventListener("abort",()=>reject(new DOMException("Aborted","AbortError")),{once:true});
  }));
  vi.stubGlobal("fetch",fetchMock);
  try{
   const provider=createOpenAICompatibleGabrooProvider({apiKey:"test-secret",baseUrl:"https://provider.example/v1",model:"gabroo-test"});
   const pending=provider.reply({...input,signal:controller.signal});
   controller.abort();
   await expect(pending).rejects.toThrow();
   expect((fetchMock.mock.calls[0]?.[1] as RequestInit).signal).toBe(controller.signal);
  }finally{vi.unstubAllGlobals();}
 });
});
