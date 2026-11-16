import {describe,expect,it} from "vitest";
import {
 gabrooVoiceSessionStateSchema,
 transitionGabrooVoiceSession,
 type GabrooVoiceSessionEvent,
 type GabrooVoiceSessionState
} from "./gabroo-speech.js";

describe("Gabroo voice session state machine",()=>{
 it("accepts only the documented lifecycle states",()=>{
  for(const state of ["idle","requesting_permission","listening","transcribing","generating","speaking","interrupted","error"]){
   expect(gabrooVoiceSessionStateSchema.parse(state)).toBe(state);
  }
  expect(gabrooVoiceSessionStateSchema.safeParse("recording_forever").success).toBe(false);
 });

 it("requires explicit learner consent before requesting microphone permission",()=>{
  expect(()=>transitionGabrooVoiceSession("idle",{type:"start",consentGranted:false})).toThrow("Explicit learner consent");
  expect(transitionGabrooVoiceSession("idle",{type:"start",consentGranted:true})).toBe("requesting_permission");
 });

 it("moves through the complete consented voice turn",()=>{
  let state:GabrooVoiceSessionState="idle";
  const events:GabrooVoiceSessionEvent[]=[
   {type:"start",consentGranted:true},
   {type:"permission_granted"},
   {type:"capture_stopped"},
   {type:"transcript_ready"},
   {type:"response_ready"},
   {type:"playback_finished"}
  ];
  const expected:GabrooVoiceSessionState[]=[
   "requesting_permission","listening","transcribing","generating","speaking","idle"
  ];
  events.forEach((event,index)=>{
   state=transitionGabrooVoiceSession(state,event);
   expect(state).toBe(expected[index]);
  });
 });

 it("fails closed when microphone permission is denied",()=>{
  expect(transitionGabrooVoiceSession("requesting_permission",{type:"permission_denied"})).toBe("error");
 });

 it("allows interruption during every active stage and requires explicit resume",()=>{
  const active:GabrooVoiceSessionState[]=["requesting_permission","listening","transcribing","generating","speaking"];
  for(const state of active){
   expect(transitionGabrooVoiceSession(state,{type:"interrupt"})).toBe("interrupted");
  }
  expect(transitionGabrooVoiceSession("interrupted",{type:"resume"})).toBe("requesting_permission");
 });

 it("allows recovery only through reset from an interrupted or error state",()=>{
  expect(transitionGabrooVoiceSession("error",{type:"reset"})).toBe("idle");
  expect(transitionGabrooVoiceSession("interrupted",{type:"reset"})).toBe("idle");
  expect(()=>transitionGabrooVoiceSession("listening",{type:"reset"})).toThrow("Invalid Gabroo voice transition");
 });

 it("rejects out-of-order events instead of advancing a broken session",()=>{
  expect(()=>transitionGabrooVoiceSession("idle",{type:"permission_granted"})).toThrow("Invalid Gabroo voice transition");
  expect(()=>transitionGabrooVoiceSession("speaking",{type:"capture_stopped"})).toThrow("Invalid Gabroo voice transition");
  expect(()=>transitionGabrooVoiceSession("idle",{type:"response_ready"})).toThrow("Invalid Gabroo voice transition");
 });

 it("allows active sessions to fail closed",()=>{
  expect(transitionGabrooVoiceSession("listening",{type:"fail"})).toBe("error");
  expect(transitionGabrooVoiceSession("speaking",{type:"fail"})).toBe("error");
 });
});
