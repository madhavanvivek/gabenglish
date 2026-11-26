import {describe,expect,it,vi} from "vitest";
import {consumeGabrooRecognitionQuota,GABROO_RECOGNITION_REQUESTS_PER_HOUR} from "./gabroo-recognition-quota.js";

describe("Gabroo recognition quota",()=>{
 it("allows requests within the shared per-hour allowance",async()=>{
  const query=vi.fn().mockResolvedValue({rows:[{request_count:3,retry_after_seconds:2400}]});
  const result=await consumeGabrooRecognitionQuota({query} as never,"learner-1");
  expect(result).toEqual({allowed:true,remaining:GABROO_RECOGNITION_REQUESTS_PER_HOUR-3,retryAfterSeconds:2400});
  expect(query).toHaveBeenCalledOnce();
  expect(query.mock.calls[0]?.[0]).toContain("ON CONFLICT(user_id) DO UPDATE");
  expect(query.mock.calls[0]?.[1]).toEqual(["learner-1"]);
 });

 it("rejects the request after the allowance is exhausted",async()=>{
  const query=vi.fn().mockResolvedValue({rows:[{request_count:GABROO_RECOGNITION_REQUESTS_PER_HOUR+1,retry_after_seconds:900}]});
  const result=await consumeGabrooRecognitionQuota({query} as never,"learner-2");
  expect(result).toEqual({allowed:false,remaining:0,retryAfterSeconds:900});
 });

 it("fails closed when the database does not return a quota row",async()=>{
  const query=vi.fn().mockResolvedValue({rows:[]});
  await expect(consumeGabrooRecognitionQuota({query} as never,"learner-3")).rejects.toThrow(/quota could not be checked/i);
 });
});
