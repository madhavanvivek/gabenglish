import {describe,it,expect,vi} from "vitest";
import {recordGabrooSkillEvidence,registerGabrooLearningProfileRoutes} from "./gabroo-learning-profile.js";
import {authenticateLearner} from "./auth.js";
import type {FastifyInstance} from "fastify";
import type {AppConfig} from "./config.js";

vi.mock("./auth.js",()=>({authenticateLearner:vi.fn()}));
import type {GabrooSkillEvidence} from "./gabroo-learning-model.js";

const observation:GabrooSkillEvidence={
 skill:"grammar",score:0.65,confidence:0.8,source:"placement_assessment",
 taskId:"placement-task-001",observedAt:"2026-11-24T10:00:00.000Z"
};

describe("Gabroo persisted learning evidence",()=>{
 it("stores a valid task-linked observation and reports a new insert",async()=>{
  const query=vi.fn().mockResolvedValue({rows:[{id:"evidence-id"}]});
  const pool={query} as unknown as import("pg").Pool;
  await expect(recordGabrooSkillEvidence(pool,"learner-id",observation)).resolves.toBe(true);
  expect(query).toHaveBeenCalledWith(
   expect.stringContaining("INSERT INTO gabroo_skill_evidence"),
   ["learner-id","grammar",0.65,0.8,"placement_assessment","placement-task-001",observation.observedAt]
  );
 });
 it("reports duplicate task evidence without overwriting the original observation",async()=>{
  const query=vi.fn().mockResolvedValue({rows:[]});
  const pool={query} as unknown as import("pg").Pool;
  await expect(recordGabrooSkillEvidence(pool,"learner-id",observation)).resolves.toBe(false);
  expect(query.mock.calls[0]?.[0]).toContain("ON CONFLICT(user_id,skill,source,task_id) DO NOTHING");
 });
 it("rejects out-of-range scores before touching the database",async()=>{
  const query=vi.fn();
  const pool={query} as unknown as import("pg").Pool;
  await expect(recordGabrooSkillEvidence(pool,"learner-id",{...observation,score:1.2})).rejects.toThrow("Invalid Gabroo skill evidence");
  expect(query).not.toHaveBeenCalled();
 });
 it("rejects missing task provenance before touching the database",async()=>{
  const query=vi.fn();
  const pool={query} as unknown as import("pg").Pool;
  await expect(recordGabrooSkillEvidence(pool,"learner-id",{...observation,taskId:" "})).rejects.toThrow("Invalid Gabroo skill evidence");
  expect(query).not.toHaveBeenCalled();
 });
});


describe("Gabroo learner-selected stage endpoint",()=>{
 const register=async(query:ReturnType<typeof vi.fn>)=>{
  const routes=new Map<string,(request:any,reply:any)=>Promise<any>>();
  const app={
   patch:(path:string,handler:(request:any,reply:any)=>Promise<any>)=>routes.set(path,handler),
   get:()=>undefined
  } as unknown as FastifyInstance;
  const pool={query} as unknown as import("pg").Pool;
  await registerGabrooLearningProfileRoutes(app,pool,{} as AppConfig);
  const handler=routes.get("/api/v1/gabroo/learning-stage");
  if(!handler)throw new Error("Learning-stage route was not registered");
  const reply={code:vi.fn().mockReturnThis(),send:vi.fn((body)=>body)};
  return {handler,reply};
 };
 const learner={id:"learner-123"} as any;

 it("requires a verified authenticated learner",async()=>{
  vi.mocked(authenticateLearner).mockResolvedValueOnce(undefined);
  const query=vi.fn();
  const {handler,reply}=await register(query);
  await handler({body:{stage:2},id:"request-1",headers:{} } as any,reply);
  expect(reply.code).toHaveBeenCalledWith(401);
  expect(query).not.toHaveBeenCalled();
 });

 it("rejects invalid stage values without writing",async()=>{
  vi.mocked(authenticateLearner).mockResolvedValueOnce(learner);
  const query=vi.fn();
  const {handler,reply}=await register(query);
  await handler({body:{stage:6},id:"request-2",headers:{} } as any,reply);
  expect(reply.code).toHaveBeenCalledWith(400);
  expect(query).not.toHaveBeenCalled();
 });

 it("does not apply the English five-stage path to Malayalam learners",async()=>{
  vi.mocked(authenticateLearner).mockResolvedValueOnce(learner);
  const query=vi.fn().mockResolvedValueOnce({rows:[{learning_direction:"en_to_ml"}]});
  const {handler,reply}=await register(query);
  await handler({body:{stage:3},id:"request-3",headers:{} } as any,reply);
  expect(reply.code).toHaveBeenCalledWith(409);
  expect(query).toHaveBeenCalledTimes(1);
  expect(query.mock.calls[0]?.[1]).toEqual([learner.id]);
 });

 it("persists a learner-selected stage without labelling it as assessed proficiency",async()=>{
  vi.mocked(authenticateLearner).mockResolvedValueOnce(learner);
  const query=vi.fn()
   .mockResolvedValueOnce({rows:[{learning_direction:"ml_to_en"}]})
   .mockResolvedValueOnce({rows:[{preferred_learning_stage:4}]});
  const {handler,reply}=await register(query);
  await expect(handler({body:{stage:4},id:"request-4",headers:{} } as any,reply)).resolves.toEqual({
   preferred_learning_stage:4,source:"learner_selected"
  });
  expect(query).toHaveBeenCalledTimes(2);
  expect(query.mock.calls[1]?.[1]).toEqual([learner.id,4]);
  expect(query.mock.calls[1]?.[0]).toContain("ON CONFLICT(user_id,preferred_learning_stage)");
 });

 it("allows a learner to clear a prior stage selection",async()=>{
  vi.mocked(authenticateLearner).mockResolvedValueOnce(learner);
  const query=vi.fn().mockResolvedValueOnce({rows:[{preferred_learning_stage:null}]});
  const {handler,reply}=await register(query);
  await expect(handler({body:{stage:null},id:"request-5",headers:{} } as any,reply)).resolves.toEqual({
   preferred_learning_stage:null,source:"not_selected"
  });
  expect(query).toHaveBeenCalledTimes(1);
  expect(query.mock.calls[0]?.[1]).toEqual([learner.id,null]);
 });
});
