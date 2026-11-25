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
 if(!input.timeline||!input.metadata)return {...neutralFrame,controls:{...neutralFrame.controls,viseme:{...neutralFrame.controls.viseme}}};
 if(typeof input.expectedPlaybackId!=="string"||input.expectedPlaybackId.length===0
  ||input.playbackId!==input.expectedPlaybackId)return {...neutralFrame,controls:{...neutralFrame.controls,viseme:{...neutralFrame.controls.viseme}}};
 const metadata=input.metadata;
 if(!/^[a-f0-9]{64}$/.test(metadata.audioId)||metadata.audioId!==metadata.audioSha256
  ||!/^[a-f0-9]{64}$/.test(metadata.textSha256)
  ||!Number.isSafeInteger(metadata.durationMs)||metadata.durationMs<=0
  ||input.timeline.audio_id!==metadata.audioId
  ||!Number.isFinite(input.timeline.duration_ms)
  ||Math.abs(input.timeline.duration_ms-metadata.durationMs)>1){
  return {...neutralFrame,controls:{...neutralFrame.controls,viseme:{...neutralFrame.controls.viseme}}};
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
