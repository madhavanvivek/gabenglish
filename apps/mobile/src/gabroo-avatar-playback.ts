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
 if(!input.timeline||!input.metadata)return neutralFrame;
 if(!input.expectedPlaybackId||input.playbackId!==input.expectedPlaybackId)return neutralFrame;
 if(input.timeline.audio_id!==input.metadata.audioId
  ||Math.abs(input.timeline.duration_ms-input.metadata.durationMs)>1)return neutralFrame;
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
