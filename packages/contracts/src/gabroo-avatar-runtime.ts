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

/**
 * Bridge the deterministic conversation state and the canonical rig controls.
 * The caller supplies the real audio player's elapsed time on every render
 * frame; this module never invents speech timing or an idle talking animation.
 */
export function sampleGabrooConversationFrame(
 conversation:GabrooConversationState,
 playbackMs:number
):GabrooRenderedFrame{
 const active=conversation.phase==="speaking"?conversation.activeSpeech:null;
 const controls=active
  ?sampleGabrooAvatarFrame(active,playbackMs)
  :{
   viseme:{shape:"neutral" as const,weight:0},
   expression:"neutral" as const,
   expressionWeight:0,
   gesture:null,
   gestureWeight:0
  };
 return {
  state:conversation.phase,
  controls,
  audioId:active?.audio_id??null
 };
}

/** A render tick is valid only for the audio item currently owned by the state. */
export function isGabrooRenderTickCurrent(
 conversation:GabrooConversationState,
 audioId:string
):boolean{
 return conversation.phase==="speaking"&&conversation.activeSpeech?.audio_id===audioId;
}
