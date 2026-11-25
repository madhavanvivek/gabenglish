import {describe,it,expect} from "vitest";
import {buildApp} from "./app.js";
import {loadConfig} from "./config.js";
describe("placement pilot API",()=>{
 it("returns questions without exposing answer keys",async()=>{const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>false);const r=await app.inject({method:"GET",url:"/api/v1/placement/questions"});expect(r.statusCode).toBe(200);expect(r.json().questions).toHaveLength(5);expect(JSON.stringify(r.json())).not.toContain('"correct"');await app.close();});
 it("scores the narrow pilot knowledge check without claiming a learning-stage recommendation",async()=>{const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>false);const r=await app.inject({method:"POST",url:"/api/v1/placement/score",payload:{answers:[{question_id:"q1",option_id:"b"},{question_id:"q2",option_id:"a"},{question_id:"q3",option_id:"c"},{question_id:"q4",option_id:"a"},{question_id:"q5",option_id:"a"}]}});expect(r.statusCode).toBe(200);expect(r.json()).toMatchObject({score:5,total:5,percentage:100,recommendation_status:"not_yet_available"});expect(r.json()).not.toHaveProperty("suggested_stage");await app.close();});
 it("rejects an empty submission",async()=>{const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>false);const r=await app.inject({method:"POST",url:"/api/v1/placement/score",payload:{answers:[]}});expect(r.statusCode).toBe(400);await app.close();});

 it("returns task-linked item rubric observations for answered placement questions",async()=>{
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>false);
  const r=await app.inject({method:"POST",url:"/api/v1/placement/score",payload:{answers:[
   {question_id:"q1",option_id:"b"},{question_id:"q4",option_id:"b"}
  ]}});
  expect(r.statusCode).toBe(200);
  expect(r.json().rubric_observations).toHaveLength(2);
  expect(r.json().rubric_observations).toEqual(expect.arrayContaining([
   expect.objectContaining({skill:"grammar",score:1,task_id:"placement-pilot-1:q1"}),
   expect.objectContaining({skill:"comprehension",score:0,task_id:"placement-pilot-1:q4"})
  ]));
  expect(r.json().notice).toContain("not yet persisted");
  await app.close();
 });

 it("requires a verified learner for persisted placement submissions",async()=>{
  const pool={query:async()=>({rows:[]})} as unknown as import("pg").Pool;
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const r=await app.inject({method:"POST",url:"/api/v1/placement/assessments/submit",payload:{
   idempotency_key:"2f4f1e1e-4e9d-4ad4-ae3d-1cbb7d4c9f4a",
   answers:["q1","q2","q3","q4","q5"].map(question_id=>({question_id,option_id:"a"}))
  }});
  expect(r.statusCode).toBe(401);
  expect(r.json().error.code).toBe("VERIFIED_ACCOUNT_REQUIRED");
  await app.close();
 });
});
