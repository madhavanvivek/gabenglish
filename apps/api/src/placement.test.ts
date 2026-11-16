import {describe,it,expect} from "vitest";
import {buildApp} from "./app.js";
import {loadConfig} from "./config.js";
describe("placement pilot API",()=>{
 it("returns questions without exposing answer keys",async()=>{const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>false);const r=await app.inject({method:"GET",url:"/api/v1/placement/questions"});expect(r.statusCode).toBe(200);expect(r.json().questions).toHaveLength(5);expect(JSON.stringify(r.json())).not.toContain('"correct"');await app.close();});
 it("scores answers and suggests an initial stage",async()=>{const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>false);const r=await app.inject({method:"POST",url:"/api/v1/placement/score",payload:{answers:[{question_id:"q1",option_id:"b"},{question_id:"q2",option_id:"a"},{question_id:"q3",option_id:"c"},{question_id:"q4",option_id:"a"},{question_id:"q5",option_id:"a"}]}});expect(r.statusCode).toBe(200);expect(r.json()).toMatchObject({score:5,total:5,percentage:100,suggested_stage:"english_practice"});await app.close();});
 it("rejects an empty submission",async()=>{const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>false);const r=await app.inject({method:"POST",url:"/api/v1/placement/score",payload:{answers:[]}});expect(r.statusCode).toBe(400);await app.close();});
});
