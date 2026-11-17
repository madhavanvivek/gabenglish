import {
 GabrooRecognitionError,
 transcribeGabrooAudio,
 type GabrooAudioMetadata,
 type GabrooSpeechRecognitionProvider,
 type GabrooTranscript
} from "@gabenglish/contracts";

/**
 * Server-side consent gate for the future authenticated voice endpoint.
 * This service deliberately has no database or storage dependency: audio and
 * provider transcripts remain transient and must be reviewed by the learner
 * before they can be submitted as a conversation message.
 */
export async function recognizeGabrooAudio(input:{
 audio:Uint8Array;
 metadata:GabrooAudioMetadata;
 consentGranted:boolean;
 provider?:GabrooSpeechRecognitionProvider;
 signal?:AbortSignal;
 timeoutMs?:number;
}):Promise<GabrooTranscript>{
 if(input.consentGranted!==true){
  throw new GabrooRecognitionError(
   "CONSENT_REQUIRED",
   "Explicit learner consent is required before speech recognition."
  );
 }
 return transcribeGabrooAudio({
  audio:input.audio,
  metadata:input.metadata,
  provider:input.provider,
  signal:input.signal,
  timeoutMs:input.timeoutMs
 });
}
