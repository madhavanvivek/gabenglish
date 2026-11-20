import type {GabrooSpeechTimeline} from "./gabroo-avatar.js";
import {gabrooSpeechTimelineSchema} from "./gabroo-avatar.js";

export type GabrooConversationPhase =
 | "idle"
 | "greeting"
 | "listening"
 | "thinking"
 | "speaking"
 | "interrupted"
 | "recovering";

export interface GabrooConversationState {
 phase:GabrooConversationPhase;
 activeSpeech:GabrooSpeechTimeline|null;
 lastError:string|null;
}

export type GabrooConversationEvent =
 | {type:"begin_greeting"}
 | {type:"greeting_finished"}
 | {type:"learner_turn_started"}
 | {type:"response_speech_started";timeline:GabrooSpeechTimeline}
 | {type:"speech_finished";audio_id:string}
 | {type:"speech_failed";audio_id:string;reason:string}
 | {type:"learner_barge_in"}
 | {type:"interruption_acknowledged"}
 | {type:"connection_lost";reason:string}
 | {type:"connection_restored"}
 | {type:"session_reset"};

export const initialGabrooConversationState:GabrooConversationState={
 phase:"idle",
 activeSpeech:null,
 lastError:null
};

function invalidTransition(state:GabrooConversationState,event:GabrooConversationEvent):never{
 throw new Error(`Invalid Gabroo conversation transition: ${state.phase} -> ${event.type}`);
}

/**
 * Deterministic state reducer for one canonical Gabroo tutor session.
 * Audio identity is checked so a stale completion event cannot stop a newer
 * utterance. Barge-in always clears active speech before returning to listening.
 */
export function reduceGabrooConversation(
 state:GabrooConversationState,
 event:GabrooConversationEvent
):GabrooConversationState{
 switch(event.type){
  case "begin_greeting":
   if(state.phase!=="idle")return invalidTransition(state,event);
   return {phase:"greeting",activeSpeech:null,lastError:null};
  case "greeting_finished":
   if(state.phase!=="greeting")return invalidTransition(state,event);
   return {phase:"listening",activeSpeech:null,lastError:null};
  case "learner_turn_started":
   if(state.phase!=="listening")return invalidTransition(state,event);
   return {phase:"thinking",activeSpeech:null,lastError:null};
  case "response_speech_started":{
   if(state.phase!=="thinking")return invalidTransition(state,event);
   const timeline=gabrooSpeechTimelineSchema.parse(event.timeline);
   return {phase:"speaking",activeSpeech:timeline,lastError:null};
  }
  case "speech_finished":
   // Playback callbacks can arrive after barge-in, reset or a newer utterance.
   // A completion for audio we no longer own is stale and must be harmless.
   if(state.activeSpeech?.audio_id!==event.audio_id)return state;
   if(state.phase!=="speaking")return invalidTransition(state,event);
   return {phase:"listening",activeSpeech:null,lastError:null};
  case "speech_failed":
   // A decoder/player failure ends only the utterance still owned by this state.
   // Late failures from interrupted or replaced audio must not affect the learner turn.
   if(state.activeSpeech?.audio_id!==event.audio_id)return state;
   if(state.phase!=="speaking")return invalidTransition(state,event);
   return {phase:"listening",activeSpeech:null,lastError:event.reason.trim().slice(0,300)||"Gabroo audio playback failed."};
  case "learner_barge_in":
   if(state.phase!=="speaking"&&state.phase!=="greeting")return invalidTransition(state,event);
   return {phase:"interrupted",activeSpeech:null,lastError:null};
  case "interruption_acknowledged":
   if(state.phase!=="interrupted")return invalidTransition(state,event);
   return {phase:"listening",activeSpeech:null,lastError:null};
  case "connection_lost":
   if(state.phase==="idle")return invalidTransition(state,event);
   return {phase:"recovering",activeSpeech:null,lastError:event.reason.slice(0,300)};
  case "connection_restored":
   if(state.phase!=="recovering")return invalidTransition(state,event);
   return {phase:"listening",activeSpeech:null,lastError:null};
  case "session_reset":
   return initialGabrooConversationState;
 }
}
