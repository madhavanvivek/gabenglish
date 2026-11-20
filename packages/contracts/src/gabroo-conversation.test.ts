import {describe,expect,it} from "vitest";
import {
 initialGabrooConversationState,
 reduceGabrooConversation
} from "./gabroo-conversation.js";
import type {GabrooConversationState} from "./gabroo-conversation.js";
import {gabrooSpeechTimelineSchema} from "./gabroo-avatar.js";

const speech=()=>gabrooSpeechTimelineSchema.parse({
 audio_id:"gabroo-audio-001",
 duration_ms:1200,
 visemes:[{start_ms:0,end_ms:180,shape:"closed_lips"}]
});
const move=(state:GabrooConversationState,...events:Parameters<typeof reduceGabrooConversation>[1][]) =>
 events.reduce(reduceGabrooConversation,state);

describe("Gabroo live conversation state machine",()=>{
 it("moves through greeting, listening, thinking and speaking",()=>{
  const state=move(initialGabrooConversationState,
   {type:"begin_greeting"},
   {type:"greeting_finished"},
   {type:"learner_turn_started"},
   {type:"response_speech_started",timeline:speech()}
  );
  expect(state.phase).toBe("speaking");
  expect(state.activeSpeech?.audio_id).toBe("gabroo-audio-001");
 });

 it("returns to listening when the current audio finishes",()=>{
  const state=move(initialGabrooConversationState,
   {type:"begin_greeting"},{type:"greeting_finished"},
   {type:"learner_turn_started"},
   {type:"response_speech_started",timeline:speech()},
   {type:"speech_finished",audio_id:"gabroo-audio-001"}
  );
  expect(state).toEqual({phase:"listening",activeSpeech:null,lastError:null});
 });

 it("returns to listening with a bounded error when current audio playback fails",()=>{
  const speaking=move(initialGabrooConversationState,
   {type:"begin_greeting"},{type:"greeting_finished"},
   {type:"learner_turn_started"},
   {type:"response_speech_started",timeline:speech()}
  );
  expect(reduceGabrooConversation(speaking,{
   type:"speech_failed",audio_id:"gabroo-audio-001",reason:"  Audio decoder unavailable  "
  })).toEqual({phase:"listening",activeSpeech:null,lastError:"Audio decoder unavailable"});
  expect(reduceGabrooConversation(speaking,{
   type:"speech_failed",audio_id:"gabroo-audio-001",reason:"x".repeat(500)
  }).lastError).toHaveLength(300);
  expect(reduceGabrooConversation(speaking,{
   type:"speech_failed",audio_id:"gabroo-audio-001",reason:"   "
  }).lastError).toBe("Gabroo audio playback failed.");
 });

 it("ignores stale playback failure events",()=>{
  const speaking=move(initialGabrooConversationState,
   {type:"begin_greeting"},{type:"greeting_finished"},
   {type:"learner_turn_started"},
   {type:"response_speech_started",timeline:speech()}
  );
  expect(reduceGabrooConversation(speaking,{
   type:"speech_failed",audio_id:"older-audio",reason:"decoder failed"
  })).toEqual(speaking);
 });

 it("clears active audio immediately when the learner interrupts",()=>{
  const speaking=move(initialGabrooConversationState,
   {type:"begin_greeting"},{type:"greeting_finished"},
   {type:"learner_turn_started"},
   {type:"response_speech_started",timeline:speech()}
  );
  const interrupted=reduceGabrooConversation(speaking,{type:"learner_barge_in"});
  expect(interrupted.phase).toBe("interrupted");
  expect(interrupted.activeSpeech).toBeNull();
  expect(reduceGabrooConversation(interrupted,{type:"interruption_acknowledged"}).phase)
   .toBe("listening");
 });

 it("ignores stale audio completion events without disturbing the current turn",()=>{
  const speaking=move(initialGabrooConversationState,
   {type:"begin_greeting"},{type:"greeting_finished"},
   {type:"learner_turn_started"},
   {type:"response_speech_started",timeline:speech()}
  );
  expect(reduceGabrooConversation(speaking,{
   type:"speech_finished",audio_id:"older-audio"
  })).toEqual(speaking);
  const interrupted=reduceGabrooConversation(speaking,{type:"learner_barge_in"});
  expect(reduceGabrooConversation(interrupted,{
   type:"speech_finished",audio_id:"gabroo-audio-001"
  })).toEqual(interrupted);
 });

 it("clears speech and records a bounded connection error during recovery",()=>{
  const speaking=move(initialGabrooConversationState,
   {type:"begin_greeting"},{type:"greeting_finished"},
   {type:"learner_turn_started"},
   {type:"response_speech_started",timeline:speech()}
  );
  const recovering=reduceGabrooConversation(speaking,{
   type:"connection_lost",reason:"network disconnected"
  });
  expect(recovering.phase).toBe("recovering");
  expect(recovering.activeSpeech).toBeNull();
  expect(recovering.lastError).toBe("network disconnected");
  expect(reduceGabrooConversation(recovering,{type:"connection_restored"}).phase)
   .toBe("listening");
 });

 it("does not restart a greeting while the connection is recovering",()=>{
  const recovering=reduceGabrooConversation(
   {phase:"listening",activeSpeech:null,lastError:null},
   {type:"connection_lost",reason:"network disconnected"}
  );
  expect(recovering.phase).toBe("recovering");
  expect(()=>reduceGabrooConversation(recovering,{type:"begin_greeting"}))
   .toThrow(/Invalid Gabroo conversation transition/);
 });

 it("requires reconnection before a fresh greeting can begin",()=>{
  const recovering=reduceGabrooConversation(
   {phase:"listening",activeSpeech:null,lastError:null},
   {type:"connection_lost",reason:"network disconnected"}
  );
  const restored=reduceGabrooConversation(recovering,{type:"connection_restored"});
  expect(restored.phase).toBe("listening");
  expect(()=>reduceGabrooConversation(restored,{type:"begin_greeting"}))
   .toThrow(/Invalid Gabroo conversation transition/);
 });

 it("rejects out-of-order tutor events",()=>{
  expect(()=>reduceGabrooConversation(initialGabrooConversationState,{
   type:"learner_turn_started"
  })).toThrow();
  expect(()=>reduceGabrooConversation(initialGabrooConversationState,{
   type:"greeting_finished"
  })).toThrow();
 });

 it("allows an explicit session reset from every phase",()=>{
  const speaking=move(initialGabrooConversationState,
   {type:"begin_greeting"},{type:"greeting_finished"},
   {type:"learner_turn_started"},
   {type:"response_speech_started",timeline:speech()}
  );
  expect(reduceGabrooConversation(speaking,{type:"session_reset"}))
   .toEqual(initialGabrooConversationState);
 });
});
