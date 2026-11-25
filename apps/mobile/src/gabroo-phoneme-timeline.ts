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
 // Metadata normally comes from the response-header parser, but keep this
 // boundary defensive: it is also callable by tests and future renderer code.
 if(!/^[a-f0-9]{64}$/.test(metadata.audioId)
  ||metadata.audioId!==metadata.audioSha256
  ||!/^[a-f0-9]{64}$/.test(metadata.textSha256)
  ||!Number.isSafeInteger(metadata.durationMs)
  ||metadata.durationMs<=0
  ||metadata.durationMs>10*60*1000)return null;
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
