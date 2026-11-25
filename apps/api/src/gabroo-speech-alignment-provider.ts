import {
 gabrooCharacterAlignmentSchema,
 gabrooPhonemeAlignmentSchema,
 type GabrooCharacterAlignment,
 type GabrooPhonemeAlignment
} from "@gabenglish/contracts";
import {createGabrooSynthesizedAudioIdentity,type GabrooSynthesizedAudioIdentity} from "./gabroo-audio-identity.js";

export type GabrooAlignmentLanguage="ml"|"en"|"mixed";

export interface GabrooSpeechAlignmentInput {
 /** Exact completed audio bytes; providers must not alter or transcode them. */
 audio:Uint8Array;
 /** Exact text submitted to synthesis, including whitespace and punctuation. */
 text:string;
 language:GabrooAlignmentLanguage;
 identity:GabrooSynthesizedAudioIdentity;
 signal:AbortSignal;
}

export type GabrooSpeechAlignmentResult=
 |{kind:"phoneme";alignment:GabrooPhonemeAlignment}
 |{kind:"character";alignment:GabrooCharacterAlignment};

/**
 * Optional provider capability. Implementations must return timestamps measured
 * against the supplied bytes and exact source text. Word timings are not
 * silently promoted to phoneme or character timings.
 */
export interface GabrooSpeechAlignmentProvider {
 align(input:GabrooSpeechAlignmentInput):Promise<GabrooSpeechAlignmentResult>;
}

/**
 * Validate provider output at the trust boundary. Character timing is checked
 * against both the exact audio and exact UTF-8 text fingerprints; phoneme
 * timing is checked against the exact audio. Unknown result kinds fail closed.
 */
export function validateGabrooSpeechAlignmentResult(
 result:GabrooSpeechAlignmentResult,
 identity:GabrooSynthesizedAudioIdentity,
 text:string
):GabrooSpeechAlignmentResult {
 if(!result||typeof result!=="object")throw new Error("Gabroo alignment provider returned an invalid result.");
 if(result.kind==="phoneme"){
  const parsed=gabrooPhonemeAlignmentSchema.parse(result.alignment);
  if(parsed.audio_id!==identity.audio_id
   ||parsed.audio_sha256.toLowerCase()!==identity.audio_sha256.toLowerCase()
   ||Math.abs(parsed.duration_ms-identity.duration_ms)>1){
   throw new Error("Gabroo phoneme alignment does not match the synthesized audio asset.");
  }
  return {kind:"phoneme",alignment:parsed};
 }
 if(result.kind==="character"){
  const parsed=gabrooCharacterAlignmentSchema.parse(result.alignment);
  if(parsed.audio_id!==identity.audio_id
   ||parsed.audio_sha256.toLowerCase()!==identity.audio_sha256.toLowerCase()
   ||parsed.text_sha256.toLowerCase()!==identity.text_sha256.toLowerCase()
   ||parsed.text_length!==Array.from(text).length
   ||Math.abs(parsed.duration_ms-identity.duration_ms)>1){
   throw new Error("Gabroo character alignment does not match the synthesized audio and source text.");
  }
  return {kind:"character",alignment:parsed};
 }
 throw new Error("Gabroo alignment provider returned an unsupported alignment kind.");
}
