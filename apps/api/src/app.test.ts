import {describe,it,expect} from "vitest";
import {buildApp} from "./app.js";
import {loadConfig} from "./config.js";
describe("API foundation",()=>{
 it("serves liveness",async()=>{const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>false);const r=await app.inject({method:"GET",url:"/api/v1/health"});expect(r.statusCode).toBe(200);expect(r.json().status).toBe("ok");await app.close();});
 it("reports ready when database check passes",async()=>{const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true);const r=await app.inject({method:"GET",url:"/api/v1/ready"});expect(r.statusCode).toBe(200);await app.close();});
 it("returns 503 when database is unavailable",async()=>{const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>false);const r=await app.inject({method:"GET",url:"/api/v1/ready"});expect(r.statusCode).toBe(503);await app.close();});
});
