import {describe,it,expect} from "vitest";
import {buildApp} from "./app.js";
import {loadConfig} from "./config.js";

describe("Gabroo conversational placement",()=>{
 it("starts with a supportive Malayalam-first introduction",async()=>{
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>false);
  const r=await app.inject({method:"POST",url:"/api/v1/placement/conversation/start",payload:{preferred_language:"ml",communication_style:"friendly_respectful"}});
  expect(r.statusCode).toBe(200);
  expect(r.json()).toMatchObject({prompt_id:"intro",difficulty_band:1,is_complete:false});
  expect(r.json().gabroo_message).toContain("ഇത് exam അല്ല");
  await app.close();
 });
 it("adapts the next prompt using the learner response and prevents out-of-order turns",async()=>{
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>false);
  const start=await app.inject({method:"POST",url:"/api/v1/placement/conversation/start",payload:{preferred_language:"en"}});
  const session=start.json().session_id;
  const first=await app.inject({method:"POST",url:"/api/v1/placement/conversation/respond",payload:{session_id:session,turn:{prompt_id:"intro",response:"My name is Anu and I live in Kozhikode. I work as a designer."}}});
  expect(first.statusCode).toBe(200);
  expect(first.json().prompt_id).toBe("routine");
  expect(first.json().is_complete).toBe(false);
  const invalid=await app.inject({method:"POST",url:"/api/v1/placement/conversation/respond",payload:{session_id:session,turn:{prompt_id:"intro",response:"Trying the same turn again."}}});
  expect(invalid.statusCode).toBe(409);
  await app.close();
 });
 it("returns observable evidence at completion without a proficiency score",async()=>{
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>false);
  const start=await app.inject({method:"POST",url:"/api/v1/placement/conversation/start",payload:{preferred_language:"en"}});
  const session=start.json().session_id;
  let promptId=start.json().prompt_id;
  let response;
  for(let i=0;i<6;i++){
    response=await app.inject({method:"POST",url:"/api/v1/placement/conversation/respond",payload:{session_id:session,turn:{prompt_id:promptId,response:"I usually work during the week as a designer and enjoy learning new things. Last weekend I visited my family because we had a wonderful celebration together and talked about our plans for next month."}}});
    if(response.json().is_complete) break;
    promptId=response.json().prompt_id;
  }
  expect(response?.json().is_complete).toBe(true);
  expect(response?.json().evidence).toHaveLength(6);
  expect(response?.json().report).toMatchObject({status:"provisional",recommendation_status:"not_yet_available",assessment_mode:"text",response_count:6});
  expect(response?.json().report.extended_samples).toBeGreaterThan(0);
  expect(response?.json().report.limitations).toContain("Text does not provide evidence of pronunciation or spoken fluency.");
  expect(response?.json().gabroo_explanation).toContain("not going to guess your English level");
  expect(response?.json()).not.toHaveProperty("score");
  expect(response?.json()).not.toHaveProperty("suggested_stage");
  await app.close();
 });
 it("uses a gentle clarification instead of escalating after a very brief answer",async()=>{
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>false);
  const start=await app.inject({method:"POST",url:"/api/v1/placement/conversation/start",payload:{preferred_language:"en"}});
  const session=start.json().session_id;
  const first=await app.inject({method:"POST",url:"/api/v1/placement/conversation/respond",payload:{session_id:session,turn:{prompt_id:"intro",response:"Anu."}}});
  expect(first.statusCode).toBe(200);
  expect(first.json()).toMatchObject({prompt_id:"clarify",difficulty_band:1,is_complete:false});
  expect(first.json().gabroo_message).toContain("tell me a little more");
  await app.close();
 });
 it("rejects unknown sessions",async()=>{
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>false);
  const r=await app.inject({method:"POST",url:"/api/v1/placement/conversation/respond",payload:{session_id:"00000000-0000-4000-8000-000000000000",turn:{prompt_id:"intro",response:"Hello"}}});
  expect(r.statusCode).toBe(404);
  await app.close();
 });
 it("validates the completed response against the shared placement contract",async()=>{
  const {placementConversationResponseSchema}=await import("@gabenglish/contracts");
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>false);
  const start=await app.inject({method:"POST",url:"/api/v1/placement/conversation/start",payload:{preferred_language:"en"}});
  const session=start.json().session_id;
  let promptId=start.json().prompt_id;
  let completed;
  for(let i=0;i<6;i++){
   completed=await app.inject({method:"POST",url:"/api/v1/placement/conversation/respond",payload:{session_id:session,turn:{prompt_id:promptId,response:"I usually work during the week. Last weekend I visited my family because we had a celebration and talked about our plans for the coming year."}}});
   if(completed.json().is_complete)break;
   promptId=completed.json().prompt_id;
  }
  expect(completed?.statusCode).toBe(200);
  expect(()=>placementConversationResponseSchema.parse(completed?.json())).not.toThrow();
  await app.close();
 });
 it("asks for clarification only once and does not treat repeated short answers as a level signal",async()=>{
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>false);
  const start=await app.inject({method:"POST",url:"/api/v1/placement/conversation/start",payload:{preferred_language:"en"}});
  const session=start.json().session_id;
  const first=await app.inject({method:"POST",url:"/api/v1/placement/conversation/respond",payload:{session_id:session,turn:{prompt_id:"intro",response:"Anu."}}});
  expect(first.json().prompt_id).toBe("clarify");
  const second=await app.inject({method:"POST",url:"/api/v1/placement/conversation/respond",payload:{session_id:session,turn:{prompt_id:"clarify",response:"From Calicut."}}});
  expect(second.statusCode).toBe(200);
  expect(second.json().prompt_id).not.toBe("clarify");
  expect(second.json().difficulty_band).toBe(1);
  await app.close();
 });
 it("rejects an empty response without advancing the session",async()=>{
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>false);
  const start=await app.inject({method:"POST",url:"/api/v1/placement/conversation/start",payload:{preferred_language:"en"}});
  const session=start.json().session_id;
  const invalid=await app.inject({method:"POST",url:"/api/v1/placement/conversation/respond",payload:{session_id:session,turn:{prompt_id:"intro",response:"   "}}});
  expect(invalid.statusCode).toBe(400);
  const valid=await app.inject({method:"POST",url:"/api/v1/placement/conversation/respond",payload:{session_id:session,turn:{prompt_id:"intro",response:"My name is Anu and I live in Calicut. I work as a designer."}}});
  expect(valid.statusCode).toBe(200);
  expect(valid.json().prompt_id).toBe("routine");
  await app.close();
 });

});
