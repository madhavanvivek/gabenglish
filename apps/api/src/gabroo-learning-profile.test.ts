import {describe,it,expect,vi} from "vitest";
import {recordGabrooSkillEvidence} from "./gabroo-learning-profile.js";
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
