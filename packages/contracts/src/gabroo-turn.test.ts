import {describe,expect,it} from "vitest";
import {initialGabrooTurnState,reduceGabrooTurn} from "./gabroo-turn.js";

describe("Gabroo learner text-turn lifecycle",()=>{
 it("moves from submitted to response-ready without implying audio playback",()=>{
  const thinking=reduceGabrooTurn(initialGabrooTurnState,{type:"submitted",turn_id:"turn-1"});
  expect(thinking).toEqual({phase:"thinking",turn_id:"turn-1",error:null});
  expect(reduceGabrooTurn(thinking,{type:"response_received",turn_id:"turn-1"})).toEqual({
   phase:"response_ready",turn_id:"turn-1",error:null
  });
 });
 it("ignores late responses and failures from an older turn",()=>{
  const first=reduceGabrooTurn(initialGabrooTurnState,{type:"submitted",turn_id:"old"});
  const second=reduceGabrooTurn(first,{type:"submitted",turn_id:"new"});
  expect(reduceGabrooTurn(second,{type:"response_received",turn_id:"old"})).toEqual(second);
  expect(reduceGabrooTurn(second,{type:"failed",turn_id:"old",reason:"late failure"})).toEqual(second);
 });
 it("records bounded failures for the active turn",()=>{
  const thinking=reduceGabrooTurn(initialGabrooTurnState,{type:"submitted",turn_id:"turn-1"});
  const failed=reduceGabrooTurn(thinking,{type:"failed",turn_id:"turn-1",reason:"x".repeat(400)});
  expect(failed.phase).toBe("failed");
  expect(failed.error).toHaveLength(300);
 });
 it("requires a non-empty turn ID and supports dismissal",()=>{
  expect(()=>reduceGabrooTurn(initialGabrooTurnState,{type:"submitted",turn_id:"  "})).toThrow();
  const thinking=reduceGabrooTurn(initialGabrooTurnState,{type:"submitted",turn_id:"turn-1"});
  expect(reduceGabrooTurn(thinking,{type:"dismissed"})).toEqual(initialGabrooTurnState);
 });
});
