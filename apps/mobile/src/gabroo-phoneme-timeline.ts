import {
 gabrooPhonemeAlignmentSchema,
 gabrooPhonemeAlignmentToTimelineForAudio,
 type GabrooSpeechTimeline
} from "@gabenglish/contracts";
import type {GabrooAudioResponseMetadata} from "./gabroo-audio-metadata";

/**
 * Accept only a provider/aligner timeline bound to the exact measured MP3.
 * The native playback ticket ID is intentionally not used here: alignments
 * are content-addressed and must match the actual audio SHA-256.
 */
export function parseGabrooPhonemeTimelineForAudio(
 payload:unknown,
 metadata:GabrooAudioResponseMetadata|null
):GabrooSpeechTimeline|null{
 if(metadata===null)return null;
 const parsed=gabrooPhonemeAlignmentSchema.safeParse(payload);
 if(!parsed.success)return null;
 try{
  return gabrooPhonemeAlignmentToTimelineForAudio(parsed.data,{
   audioId:metadata.audioId,
   audioSha256:metadata.audioSha256,
   durationMs:metadata.durationMs
  });
 }catch{
  return null;
 }
}
