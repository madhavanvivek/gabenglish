import {
 gabrooPhonemeAlignmentSchema,
 gabrooPhonemeAlignmentToTimelineForAudio,
 type GabrooSpeechTimeline
} from "@gabenglish/contracts";
import type {GabrooAudioResponseMetadata} from "./gabroo-audio-metadata";

/** Accept only provider-supplied IPA timings bound to the exact measured MP3. */
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
