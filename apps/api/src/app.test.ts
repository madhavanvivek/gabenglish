import {describe,it,expect} from "vitest";
import {buildApp} from "./app.js";
import {loadConfig} from "./config.js";
describe("API foundation",()=>{
 it("serves liveness",async()=>{const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>false);const r=await app.inject({method:"GET",url:"/api/v1/health"});expect(r.statusCode).toBe(200);expect(r.json().status).toBe("ok");await app.close();});
 it("reports ready when database check passes",async()=>{const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true);const r=await app.inject({method:"GET",url:"/api/v1/ready"});expect(r.statusCode).toBe(200);await app.close();});
 it("returns 503 when database is unavailable",async()=>{const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>false);const r=await app.inject({method:"GET",url:"/api/v1/ready"});expect(r.statusCode).toBe(503);await app.close();});
 it("rejects unsupported Gabroo audio media types",async()=>{
  const pool={query:async()=>({rows:[]})} as any;
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const r=await app.inject({method:"POST",url:"/api/v1/gabroo/recognition",headers:{"content-type":"application/octet-stream"},payload:Buffer.from([1,2,3])});
  expect(r.statusCode).toBe(415);
  await app.close();
 });
 it("requires an authenticated learner for supported Gabroo audio",async()=>{
  const pool={query:async()=>({rows:[]})} as any;
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const r=await app.inject({method:"POST",url:"/api/v1/gabroo/recognition",headers:{"content-type":"audio/mp4","x-gabroo-consent":"true"},payload:Buffer.from([1,2,3])});
  expect(r.statusCode).toBe(401);
  expect(r.json().error.code).toBe("VERIFIED_ACCOUNT_REQUIRED");
  await app.close();
 });
 it("enforces the 10 MB audio upload limit before route processing",async()=>{
  const pool={query:async()=>({rows:[]})} as any;
  const app=await buildApp(loadConfig({NODE_ENV:"test"}),async()=>true,pool);
  const payload=Buffer.alloc(10*1024*1024+1);
  const r=await app.inject({method:"POST",url:"/api/v1/gabroo/recognition",headers:{"content-type":"audio/mp4","x-gabroo-consent":"true"},payload});
  expect(r.statusCode).toBe(413);
  await app.close();
 });
});
