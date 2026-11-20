import {describe,expect,it} from "vitest";
import {sampleGabrooConversationFrame,isGabrooRenderTickCurrent} from "./gabroo-avatar-runtime.js";
import {initialGabrooConversationState,reduceGabrooConversation} from "./gabroo-conversation.js";
import type {GabrooConversationState} from "./gabroo-conversation.js";
import {gabrooSpeechTimelineSchema} from "./gabroo-avatar.js";

const timeline=gabrooSpeechTimelineSchema.parse({
 audio_id:"gabroo-runtime-audio",
 duration_ms:1000,
 visemes:[{start_ms:100,end_ms:300,shape:"closed_lips"}],
 expressions:[{start_ms:200,end_ms:600,expression:"warm_smile"}],
 gestures:[{start_ms:400,end_ms:800,gesture:"gentle_nod"}]
});
const speaking=():GabrooConversationState=>{
 const greeting=reduceGabrooConversation(initialGabrooConversationState,{type:"begin_greeting"});
 const listening=reduceGabrooConversation(greeting,{type:"greeting_finished"});
 const thinking=reduceGabrooConversation(listening,{type:"learner_turn_started"});
 return reduceGabrooConversation(thinking,{type:"response_speech_started",timeline});
};

describe("Gabroo conversation-to-renderer bridge",()=>{
 it("samples canonical rig controls against the supplied audio clock",()=>{
  const frame=sampleGabrooConversationFrame(speaking(),250);
  expect(frame.state).toBe("speaking");
  expect(frame.audioId).toBe("gabroo-runtime-audio");
  expect(frame.controls.viseme.shape).toBe("closed_lips");
  expect(frame.controls.expression).toBe("warm_smile");
 });

 it("keeps the mouth neutral during silence between viseme events",()=>{
  const frame=sampleGabrooConversationFrame(speaking(),700);
  expect(frame.controls.viseme).toEqual({shape:"neutral",weight:0});
  expect(frame.controls.gesture).toBe("gentle_nod");
 });

 it.each(["listening","thinking","interrupted","recovering","idle"] as const)(
  "never animates speech while the conversation is %s",
  phase=>{
   const state:GabrooConversationState={phase,activeSpeech:timeline,lastError:null};
   const frame=sampleGabrooConversationFrame(state,250);
   expect(frame.audioId).toBeNull();
   expect(frame.controls.viseme).toEqual({shape:"neutral",weight:0});
   expect(frame.controls.expression).toBe("neutral");
   expect(frame.controls.gesture).toBeNull();
  }
 );

 it("rejects render ticks from stale or interrupted audio",()=>{
  const state=speaking();
  expect(isGabrooRenderTickCurrent(state,"gabroo-runtime-audio")).toBe(true);
  expect(isGabrooRenderTickCurrent(state,"older-audio")).toBe(false);
  const interrupted=reduceGabrooConversation(state,{type:"learner_barge_in"});
  expect(isGabrooRenderTickCurrent(interrupted,"gabroo-runtime-audio")).toBe(false);
 });

 it("does not expose audio identity after speech completion",()=>{
  const state=speaking();
  const finished=reduceGabrooConversation(state,{type:"speech_finished",audio_id:"gabroo-runtime-audio"});
  const frame=sampleGabrooConversationFrame(finished,900);
  expect(frame.state).toBe("listening");
  expect(frame.audioId).toBeNull();
  expect(frame.controls.viseme.shape).toBe("neutral");
 });
});
