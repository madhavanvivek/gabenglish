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
  const invalid=await app.inject({method:"POST",url:"/api/v1/placement/conversation/respond",payload:{session_id:session,turn:{prompt_id:"intro",response:"Trying the same turn again."}}});
  expect(invalid.statusCode).toBe(409);
  await app.close();
 });
 it("rejects unknown sessions",async()=>{
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>false);
  const r=await app.inject({method:"POST",url:"/api/v1/placement/conversation/respond",payload:{session_id:"00000000-0000-4000-8000-000000000000",turn:{prompt_id:"intro",response:"Hello"}}});
  expect(r.statusCode).toBe(404);
  await app.close();
 });
});
