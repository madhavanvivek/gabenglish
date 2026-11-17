import {z} from "zod";

export const GABROO_AUDIO_MAX_BYTES=10*1024*1024;
export const GABROO_RECOGNITION_DEFAULT_TIMEOUT_MS=15_000;
export const GABROO_RECOGNITION_MAX_TIMEOUT_MS=60_000;
export const GABROO_AUDIO_MIME_TYPES=[
 "audio/mp4","audio/m4a","audio/wav","audio/x-wav","audio/webm","audio/ogg"
] as const;
export const gabrooRecognitionLanguageSchema=z.enum(["ml-IN","en-IN","ml-en"]);
export type GabrooRecognitionLanguage=z.infer<typeof gabrooRecognitionLanguageSchema>;

export const gabrooAudioMetadataSchema=z.object({
 mimeType:z.enum(GABROO_AUDIO_MIME_TYPES),
 sizeBytes:z.number().int().positive().max(GABROO_AUDIO_MAX_BYTES),
 language:gabrooRecognitionLanguageSchema.default("ml-en")
}).strict();
export type GabrooAudioMetadata=z.infer<typeof gabrooAudioMetadataSchema>;

export const gabrooTranscriptSchema=z.object({
 text:z.string().trim().min(1).max(12000),
 languageDetected:z.enum(["ml","en","mixed","unknown"]).default("unknown"),
 confidence:z.number().min(0).max(1).optional()
}).strict();
export type GabrooTranscript=z.infer<typeof gabrooTranscriptSchema>;

/**
 * A learner-reviewed transcript is the only transcript shape intended to
 * cross into a future conversation turn. Confirmation is explicit; raw
 * provider output must never be submitted automatically.
 */
export const gabrooReviewedTranscriptSchema=z.object({
 text:z.string().trim().min(1).max(12000),
 languageDetected:z.enum(["ml","en","mixed","unknown"]),
 edited:z.boolean(),
 confirmed:z.literal(true)
}).strict();
export type GabrooReviewedTranscript=z.infer<typeof gabrooReviewedTranscriptSchema>;

/**
 * Convert provider output plus the learner's edited text into the only
 * transcript shape allowed for a future chat handoff. The edited flag is
 * derived here rather than trusted from the client.
 */
export function confirmGabrooTranscript(input:{
 providerTranscript:GabrooTranscript;
 reviewedText:string;
 confirmed:boolean;
}):GabrooReviewedTranscript{
 if(!input.confirmed)throw new Error("Explicit learner confirmation is required.");
 const original=gabrooTranscriptSchema.parse(input.providerTranscript);
 const reviewedText=input.reviewedText.trim();
 return gabrooReviewedTranscriptSchema.parse({
  text:reviewedText,
  languageDetected:original.languageDetected,
  edited:reviewedText!==original.text,
  confirmed:true
 });
}

export interface GabrooSpeechRecognitionProvider {
 transcribe(input:{
  audio:Uint8Array;
  mimeType:typeof GABROO_AUDIO_MIME_TYPES[number];
  language:GabrooRecognitionLanguage;
  signal:AbortSignal;
 }):Promise<GabrooTranscript>;
}

export type GabrooRecognitionErrorCode=
 |"CONSENT_REQUIRED"
 |"INVALID_AUDIO"
 |"AUDIO_TOO_LARGE"
 |"PROVIDER_UNAVAILABLE"
 |"PROVIDER_TIMEOUT"
 |"PROVIDER_FAILED"
 |"EMPTY_TRANSCRIPT"
 |"INVALID_TIMEOUT";

export class GabrooRecognitionError extends Error {
 constructor(public readonly code:GabrooRecognitionErrorCode,message:string){
  super(message);
  this.name="GabrooRecognitionError";
 }
}

/**
 * Provider-neutral recognition boundary. It validates metadata before sending
 * audio to an injected provider and validates the returned transcript. It
 * never persists audio or transcript; callers own consent and retention policy.
 */
export async function transcribeGabrooAudio(input:{
 audio:Uint8Array;
 metadata:GabrooAudioMetadata;
 provider?:GabrooSpeechRecognitionProvider;
 signal?:AbortSignal;
 timeoutMs?:number;
}):Promise<GabrooTranscript>{
 const parsed=gabrooAudioMetadataSchema.safeParse(input.metadata);
 if(!parsed.success)throw new GabrooRecognitionError(
  input.metadata?.sizeBytes>GABROO_AUDIO_MAX_BYTES?"AUDIO_TOO_LARGE":"INVALID_AUDIO",
  "The audio file format or size is not supported."
 );
 if(!(input.audio instanceof Uint8Array))throw new GabrooRecognitionError("INVALID_AUDIO","The audio recording is invalid.");
 if(input.audio.byteLength===0)throw new GabrooRecognitionError("INVALID_AUDIO","The audio recording is empty.");
 if(input.audio.byteLength>GABROO_AUDIO_MAX_BYTES)throw new GabrooRecognitionError("AUDIO_TOO_LARGE","The audio recording is too large.");
 if(input.audio.byteLength!==parsed.data.sizeBytes)throw new GabrooRecognitionError("INVALID_AUDIO","The audio size does not match its metadata.");
 if(!input.provider)throw new GabrooRecognitionError("PROVIDER_UNAVAILABLE","Speech recognition is not configured.");
 const timeoutMs=input.timeoutMs??GABROO_RECOGNITION_DEFAULT_TIMEOUT_MS;
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<=0||timeoutMs>GABROO_RECOGNITION_MAX_TIMEOUT_MS){
  throw new GabrooRecognitionError("INVALID_TIMEOUT","The speech recognition timeout is invalid.");
 }
 if(input.signal?.aborted)throw new GabrooRecognitionError("PROVIDER_FAILED","Speech recognition was cancelled.");
 const controller=new AbortController();
 const abort=()=>controller.abort();
 input.signal?.addEventListener("abort",abort,{once:true});
 let timedOut=false;
 let timeout:ReturnType<typeof setTimeout>|undefined;
 let rejectCancellation:(reason:GabrooRecognitionError)=>void=()=>{};
 const cancellationPromise=new Promise<never>((_,reject)=>{rejectCancellation=reject;});
 const onAbort=()=>rejectCancellation(new GabrooRecognitionError("PROVIDER_FAILED","Speech recognition was cancelled."));
 input.signal?.addEventListener("abort",onAbort,{once:true});
 const timeoutPromise=new Promise<never>((_,reject)=>{
  timeout=setTimeout(()=>{
   timedOut=true;
   controller.abort();
   reject(new GabrooRecognitionError("PROVIDER_TIMEOUT","Speech recognition took too long."));
  },timeoutMs);
 });
 try{
  const raw=await Promise.race([
   cancellationPromise,
   input.provider.transcribe({
    audio:input.audio,
    mimeType:parsed.data.mimeType,
    language:parsed.data.language,
    signal:controller.signal
   }),
   timeoutPromise
  ]);
  if(controller.signal.aborted)throw new GabrooRecognitionError(
   input.signal?.aborted?"PROVIDER_FAILED":"PROVIDER_TIMEOUT",
   input.signal?.aborted?"Speech recognition was cancelled.":"Speech recognition took too long."
  );
  const result=gabrooTranscriptSchema.safeParse(raw);
  if(!result.success)throw new GabrooRecognitionError("EMPTY_TRANSCRIPT","No usable speech transcript was returned.");
  return result.data;
 }catch(error){
  if(error instanceof GabrooRecognitionError)throw error;
  if(controller.signal.aborted)throw new GabrooRecognitionError(
   input.signal?.aborted?"PROVIDER_FAILED":"PROVIDER_TIMEOUT",
   input.signal?.aborted?"Speech recognition was cancelled.":"Speech recognition took too long."
  );
  if(timedOut)throw new GabrooRecognitionError("PROVIDER_TIMEOUT","Speech recognition took too long.");
  throw new GabrooRecognitionError("PROVIDER_FAILED","Speech recognition could not process this recording.");
 }finally{
  if(timeout)clearTimeout(timeout);
  input.signal?.removeEventListener("abort",abort);
  input.signal?.removeEventListener("abort",onAbort);
 }
}

/**
 * The HTTP response intentionally represents an unconfirmed transcript.
 * Callers must present it for learner review; it is never a chat message.
 */
export const gabrooRecognitionResponseSchema=z.object({
 transcript:gabrooTranscriptSchema,
 review_required:z.literal(true),
 request_id:z.string().min(1).max(200)
}).strict();
export type GabrooRecognitionResponse=z.infer<typeof gabrooRecognitionResponseSchema>;
