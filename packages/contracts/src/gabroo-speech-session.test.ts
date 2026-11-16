import {describe,expect,it} from "vitest";
import {transitionGabrooVoiceSession as transition} from "./gabroo-speech.js";

describe("Gabroo voice session lifecycle",()=>{
 it("requires explicit consent before starting microphone permission",()=>{
  expect(()=>transition("idle",{type:"start",consentGranted:false})).toThrow(/consent/i);
  expect(transition("idle",{type:"start",consentGranted:true})).toBe("requesting_permission");
 });
 it("moves through the consented capture, transcription, generation and playback lifecycle",()=>{
  let state=transition("idle",{type:"start",consentGranted:true});
  state=transition(state,{type:"permission_granted"});
  expect(state).toBe("listening");
  state=transition(state,{type:"capture_stopped"});
  expect(state).toBe("transcribing");
  state=transition(state,{type:"transcript_ready"});
  expect(state).toBe("generating");
  state=transition(state,{type:"response_ready"});
  expect(state).toBe("speaking");
  expect(transition(state,{type:"playback_finished"})).toBe("idle");
 });
 it("fails closed when microphone permission is denied",()=>{
  const state=transition("idle",{type:"start",consentGranted:true});
  expect(transition(state,{type:"permission_denied"})).toBe("error");
 });
 it.each(["listening","transcribing","generating","speaking"] as const)(
  "allows interruption while %s",state=>{
   expect(transition(state,{type:"interrupt"})).toBe("interrupted");
  }
 );
 it("requires an explicit resume action after interruption",()=>{
  expect(transition("interrupted",{type:"resume"})).toBe("requesting_permission");
  expect(()=>transition("interrupted",{type:"permission_granted"})).toThrow(/Invalid/);
 });
 it("allows recovery from an error only through reset",()=>{
  expect(transition("error",{type:"reset"})).toBe("idle");
  expect(()=>transition("error",{type:"start",consentGranted:true})).toThrow(/Invalid/);
 });
 it("rejects out-of-order provider events",()=>{
  expect(()=>transition("idle",{type:"transcript_ready"})).toThrow(/Invalid/);
  expect(()=>transition("speaking",{type:"capture_stopped"})).toThrow(/Invalid/);
 });
});
