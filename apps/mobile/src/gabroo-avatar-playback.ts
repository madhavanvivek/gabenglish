import {
 sampleGabrooConversationFrameFromPlaybackStatus,
 type GabrooRenderedFrame,
 type GabrooSpeechTimeline
} from "@gabenglish/contracts";
import type {GabrooAudioResponseMetadata} from "./gabroo-audio-metadata";

const neutralFrame:GabrooRenderedFrame={
 state:"speaking",
 audioId:null,
 controls:{
  viseme:{shape:"neutral",weight:0},
  expression:"neutral",
  expressionWeight:0,
  gesture:null,
  gestureWeight:0
 }
};

/**
 * Bridge the native playback ticket to a content-addressed phoneme timeline.
 * The ticket proves which native sound is currently playing; metadata proves
 * which exact MP3 the timeline belongs to. They are never treated as the same ID.
 */
export function sampleGabrooMobileAvatarPlayback(input:{
 timeline:GabrooSpeechTimeline|null;
 metadata:GabrooAudioResponseMetadata|null;
 expectedPlaybackId:string;
 playbackId:string|null;
 isLoaded:boolean;
 isPlaying:boolean;
 positionMillis:number;
}):GabrooRenderedFrame{
 const neutral=():GabrooRenderedFrame=>({...neutralFrame,controls:{...neutralFrame.controls,viseme:{...neutralFrame.controls.viseme}}});
 if(!input.timeline||!input.metadata)return neutral();
 // Native status can be stale during pause, completion, unload or a player
 // transition. Never pass invalid clocks into the renderer sampling path.
 if(input.isLoaded!==true||input.isPlaying!==true
  ||!Number.isFinite(input.positionMillis)||input.positionMillis<0
  ||!Number.isFinite(input.timeline.duration_ms)||input.timeline.duration_ms<=0
  ||input.positionMillis>=input.timeline.duration_ms)return neutral();
 if(typeof input.expectedPlaybackId!=="string"||input.expectedPlaybackId.length===0
  ||input.playbackId!==input.expectedPlaybackId)return neutral();
 const metadata=input.metadata;
 if(!/^[a-f0-9]{64}$/.test(metadata.audioId)||metadata.audioId!==metadata.audioSha256
  ||!/^[a-f0-9]{64}$/.test(metadata.textSha256)
  ||!Number.isSafeInteger(metadata.durationMs)||metadata.durationMs<=0
  ||input.timeline.audio_id!==metadata.audioId
  ||!Number.isFinite(input.timeline.duration_ms)
  ||Math.abs(input.timeline.duration_ms-metadata.durationMs)>1){
  return neutral();
 }
 return sampleGabrooConversationFrameFromPlaybackStatus({
  phase:"speaking",
  activeSpeech:input.timeline,
  lastError:null
 },{
  isLoaded:input.isLoaded,
  isPlaying:input.isPlaying,
  positionMillis:input.positionMillis,
  audioId:input.metadata.audioId
 });
}
