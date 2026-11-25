import {describe,expect,it} from "vitest";
import {transitionGabrooLiveSession,type GabrooLiveSessionState,type GabrooLiveSessionEvent} from "./gabroo-live-session.js";

function apply(state:GabrooLiveSessionState,...events:GabrooLiveSessionEvent[]){
 return events.reduce(transitionGabrooLiveSession,state);
}

describe("Gabroo live voice session contract",()=>{
 it("requires explicit consent before attempting a live connection",()=>{
  expect(()=>transitionGabrooLiveSession("idle",{type:"connect",consentGranted:false})).toThrow(/explicit learner consent/i);
  expect(transitionGabrooLiveSession("idle",{type:"connect",consentGranted:true})).toBe("connecting");
 });
 it("models a complete half-duplex learner and tutor turn",()=>{
  expect(apply("idle",
   {type:"connect",consentGranted:true},
   {type:"connected"},
   {type:"begin_listening"},
   {type:"end_turn"},
   {type:"response_ready"},
   {type:"playback_finished"}
  )).toBe("ready");
 });
 it("requires tutor playback to finish before the next listening turn",()=>{
  expect(()=>transitionGabrooLiveSession("speaking",{type:"begin_listening"})).toThrow(/invalid/i);
  expect(transitionGabrooLiveSession("speaking",{type:"playback_finished"})).toBe("ready");
 });
 it("moves any active phase to interrupted and requires reconnection on resume",()=>{
  for(const state of ["connecting","ready","listening","processing","speaking"] as const){
   expect(transitionGabrooLiveSession(state,{type:"interrupt"})).toBe("interrupted");
  }
  expect(transitionGabrooLiveSession("interrupted",{type:"resume"})).toBe("connecting");
 });
 it("does not allow capture to resume directly from an interrupted state",()=>{
  expect(()=>transitionGabrooLiveSession("interrupted",{type:"begin_listening"})).toThrow(/invalid/i);
 });
 it("closes idempotently and prevents all later capture transitions",()=>{
  expect(transitionGabrooLiveSession("ready",{type:"close"})).toBe("closed");
  expect(transitionGabrooLiveSession("closed",{type:"close"})).toBe("closed");
  expect(()=>transitionGabrooLiveSession("closed",{type:"begin_listening"})).toThrow(/invalid/i);
  expect(()=>transitionGabrooLiveSession("closed",{type:"connect",consentGranted:true})).toThrow(/invalid/i);
 });
 it("moves active failures to error and requires an explicit reset in a new session",()=>{
  expect(transitionGabrooLiveSession("processing",{type:"fail"})).toBe("error");
  expect(()=>transitionGabrooLiveSession("error",{type:"resume"})).toThrow(/invalid/i);
 });
 it("rejects events that skip a required turn phase",()=>{
  expect(()=>transitionGabrooLiveSession("ready",{type:"response_ready"})).toThrow(/invalid/i);
  expect(()=>transitionGabrooLiveSession("listening",{type:"playback_finished"})).toThrow(/invalid/i);
  expect(()=>transitionGabrooLiveSession("connecting",{type:"begin_listening"})).toThrow(/invalid/i);
 });
});
