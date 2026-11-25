import {
 gabrooCharacterAlignmentSchema,
 gabrooPhonemeAlignmentSchema,
 type GabrooCharacterAlignment,
 type GabrooPhonemeAlignment
} from "@gabenglish/contracts";
import {createGabrooSynthesizedAudioIdentity,type GabrooSynthesizedAudioIdentity} from "./gabroo-audio-identity.js";

export type GabrooAlignmentLanguage="ml"|"en"|"mixed";
const MAX_ALIGNMENT_AUDIO_BYTES=12*1024*1024;

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

/**
 * Recompute fingerprints at the provider boundary so a caller cannot pair a
 * valid identity record with a different audio buffer or source transcript.
 */
export function assertGabrooSpeechAlignmentInputIdentity(
 input:Pick<GabrooSpeechAlignmentInput,"audio"|"text"|"identity"|"language">
):void {
 if(input.audio.byteLength===0||input.audio.byteLength>MAX_ALIGNMENT_AUDIO_BYTES)throw new Error("Gabroo alignment audio must be between 1 byte and 12 MiB.");
 if(!["ml","en","mixed"].includes(input.language))throw new Error("Gabroo alignment language must be ml, en, or mixed.");
 const recomputed=createGabrooSynthesizedAudioIdentity({
  audio:input.audio,
  text:input.text,
  durationMs:input.identity.duration_ms,
  audioId:input.identity.audio_id
 });
 if(recomputed.audio_sha256.toLowerCase()!==input.identity.audio_sha256.toLowerCase()
  ||recomputed.text_sha256.toLowerCase()!==input.identity.text_sha256.toLowerCase()
  ||recomputed.text_length!==input.identity.text_length){
  throw new Error("Gabroo alignment input identity does not match the exact audio bytes and source text.");
 }
}

export function validateGabrooSpeechAlignmentResult(
 result:GabrooSpeechAlignmentResult,
 identity:GabrooSynthesizedAudioIdentity,
 text:string
):GabrooSpeechAlignmentResult {
 if(!result||typeof result!=="object")throw new Error("Gabroo alignment provider returned an invalid result.");
 if(result.kind==="phoneme"){
  const parsed=gabrooPhonemeAlignmentSchema.parse(result.alignment);
  if(parsed.phonemes.length===0)throw new Error("Gabroo phoneme alignment provider returned no timed phoneme events.");
  if(parsed.audio_id!==identity.audio_id
   ||parsed.audio_sha256.toLowerCase()!==identity.audio_sha256.toLowerCase()
   ||Math.abs(parsed.duration_ms-identity.duration_ms)>1){
   throw new Error("Gabroo phoneme alignment does not match the synthesized audio asset.");
  }
  return {kind:"phoneme",alignment:parsed};
 }
 if(result.kind==="character"){
  const parsed=gabrooCharacterAlignmentSchema.parse(result.alignment);
  if(parsed.characters.length===0)throw new Error("Gabroo character alignment provider returned no timed character events.");
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

/** Reject promptly on cancellation even when a provider ignores AbortSignal. */
function awaitGabrooAlignmentOrAbort<T>(operation:Promise<T>,signal:AbortSignal):Promise<T>{
 return new Promise<T>((resolve,reject)=>{
  const onAbort=()=>reject(new Error("Gabroo speech alignment was cancelled."));
  if(signal.aborted){onAbort();return;}
  signal.addEventListener("abort",onAbort,{once:true});
  operation.then(resolve,reject);
 }).finally(()=>{
  // AbortSignal listeners are one-shot; they are removed when fired.
 });
}

/**
 * Execute an optional alignment provider through the full trust boundary.
 * Identity is checked before provider work and its response is validated
 * before being returned to any caller. Abort is checked on both sides.
 */
export async function runGabrooSpeechAlignment(
 provider:GabrooSpeechAlignmentProvider,
 input:GabrooSpeechAlignmentInput
):Promise<GabrooSpeechAlignmentResult> {
 if(input.signal.aborted)throw new Error("Gabroo speech alignment was cancelled.");
 assertGabrooSpeechAlignmentInputIdentity(input);
 const result=await awaitGabrooAlignmentOrAbort(provider.align(input),input.signal);
 if(input.signal.aborted)throw new Error("Gabroo speech alignment was cancelled.");
 return validateGabrooSpeechAlignmentResult(result,input.identity,input.text);
}
