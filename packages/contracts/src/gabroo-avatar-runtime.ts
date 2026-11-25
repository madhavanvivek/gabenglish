import {
 sampleGabrooAvatarFrame,
 type GabrooAvatarFrame,
 type GabrooAvatarState
} from "./gabroo-avatar.js";
import type {GabrooConversationState} from "./gabroo-conversation.js";

export interface GabrooRenderedFrame {
 state:GabrooAvatarState;
 controls:GabrooAvatarFrame;
 audioId:string|null;
}

export interface GabrooNativePlaybackStatus {
 /** Native player status must explicitly confirm the media item is loaded. */
 isLoaded:boolean;
 isPlaying:boolean;
 positionMillis:number;
 /** Stable ID associated with the media item loaded into the native player. */
 audioId:string|null;
}

const neutralControls=():GabrooAvatarFrame=>({
 viseme:{shape:"neutral",weight:0},
 expression:"neutral",
 expressionWeight:0,
 gesture:null,
 gestureWeight:0
});

/**
 * Bridge the deterministic conversation state and canonical rig controls.
 * The caller supplies the real audio player's elapsed time on every render
 * frame; this module never invents speech timing or an idle talking animation.
 */
export function sampleGabrooConversationFrame(
 conversation:GabrooConversationState,
 playbackMs:number
):GabrooRenderedFrame{
 const active=conversation.phase==="speaking"?conversation.activeSpeech:null;
 return {
  state:conversation.phase,
  controls:active?sampleGabrooAvatarFrame(active,playbackMs):neutralControls(),
  audioId:active?.audio_id??null
 };
}

/**
 * Safely bridge native player status to the renderer. A stale media item,
 * unloaded/buffering player, paused player, or non-speaking conversation
 * always yields a neutral frame. This prevents a previous turn's visemes from
 * animating over a newer utterance.
 */
export function sampleGabrooConversationFrameFromPlaybackStatus(
 conversation:GabrooConversationState,
 status:GabrooNativePlaybackStatus
):GabrooRenderedFrame{
 if(typeof status.isLoaded!=="boolean"||typeof status.isPlaying!=="boolean"){
  throw new Error("Native playback status must include loaded and playing states.");
 }
 if(status.audioId!==null&&typeof status.audioId!=="string"){
  throw new Error("Native playback audio identity must be a string or null.");
 }
 if(!Number.isFinite(status.positionMillis)||status.positionMillis<0){
  throw new Error("Native playback position must be finite and non-negative.");
 }
 const active=conversation.phase==="speaking"?conversation.activeSpeech:null;
 const current=Boolean(active&&status.isLoaded&&status.isPlaying&&status.audioId===active.audio_id);
 return {
  state:conversation.phase,
  controls:current?sampleGabrooAvatarFrame(active!,status.positionMillis):neutralControls(),
  audioId:current?active!.audio_id:null
 };
}

/** A render tick is valid only for the audio item currently owned by the state. */
export function isGabrooRenderTickCurrent(
 conversation:GabrooConversationState,
 audioId:string
):boolean{
 return conversation.phase==="speaking"&&conversation.activeSpeech?.audio_id===audioId;
}
