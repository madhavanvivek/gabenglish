import {describe,expect,it,vi} from "vitest";
import {
 GabrooRecognitionError,
 GABROO_AUDIO_MAX_BYTES,
 confirmGabrooTranscript,
 gabrooReviewedTranscriptSchema,
 gabrooRecognitionResponseSchema,\n gabrooRecognitionStatusSchema,
 transcribeGabrooAudio,
 type GabrooSpeechRecognitionProvider
} from "./gabroo-recognition.js";

const audio=new Uint8Array([1,2,3]);
const metadata={mimeType:"audio/mp4" as const,sizeBytes:3,language:"ml-en" as const};
const transcript={text:"നമസ്കാരം, how are you?",languageDetected:"mixed" as const,confidence:0.94};

describe("Gabroo provider-neutral speech recognition boundary",()=>{
 it("sends validated audio to the injected provider and returns its transcript",async()=>{
  const transcribe=vi.fn(async()=>transcript);
  const result=await transcribeGabrooAudio({audio,metadata,provider:{transcribe}});
  expect(result).toEqual(transcript);
  expect(transcribe).toHaveBeenCalledWith(expect.objectContaining({
   audio,mimeType:"audio/mp4",language:"ml-en",signal:expect.any(AbortSignal)
  }));
 });
 it("fails closed when no provider is configured",async()=>{
  await expect(transcribeGabrooAudio({audio,metadata})).rejects.toMatchObject({code:"PROVIDER_UNAVAILABLE"});
 });
 it("rejects empty or oversized recordings before provider invocation",async()=>{
  const transcribe=vi.fn(async()=>transcript);
  const provider={transcribe};
  await expect(transcribeGabrooAudio({audio:new Uint8Array(),metadata:{...metadata,sizeBytes:0},provider})).rejects.toMatchObject({code:"INVALID_AUDIO"});
  await expect(transcribeGabrooAudio({audio:new Uint8Array(2),metadata:{...metadata,sizeBytes:GABROO_AUDIO_MAX_BYTES+1},provider})).rejects.toMatchObject({code:"AUDIO_TOO_LARGE"});
  expect(transcribe).not.toHaveBeenCalled();
 });
 it("rejects unsupported MIME metadata",async()=>{
  await expect(transcribeGabrooAudio({audio,metadata:{...metadata,mimeType:"audio/unknown" as never},provider:{transcribe:async()=>transcript}})).rejects.toMatchObject({code:"INVALID_AUDIO"});
 });
 it("rejects an already-cancelled request without calling the provider",async()=>{
  const controller=new AbortController();controller.abort();
  const transcribe=vi.fn(async()=>transcript);
  await expect(transcribeGabrooAudio({audio,metadata,provider:{transcribe},signal:controller.signal})).rejects.toMatchObject({code:"PROVIDER_FAILED"});
  expect(transcribe).not.toHaveBeenCalled();
 });
 it("normalises provider failures without exposing provider error details",async()=>{
  const provider:GabrooSpeechRecognitionProvider={transcribe:async()=>{throw new Error("secret provider response");}};
  await expect(transcribeGabrooAudio({audio,metadata,provider})).rejects.toMatchObject({
   code:"PROVIDER_FAILED",
   message:"Speech recognition could not process this recording."
  });
 });
 it("rejects unusable provider transcripts",async()=>{
  const provider={transcribe:async()=>({text:"   ",languageDetected:"unknown"})} as unknown as GabrooSpeechRecognitionProvider;
  await expect(transcribeGabrooAudio({audio,metadata,provider})).rejects.toMatchObject({code:"EMPTY_TRANSCRIPT"});
 });
 it("rejects confidence values outside the defined range",async()=>{
  const provider={transcribe:async()=>({text:"hello",languageDetected:"en",confidence:1.4})} as unknown as GabrooSpeechRecognitionProvider;
  await expect(transcribeGabrooAudio({audio,metadata,provider})).rejects.toMatchObject({code:"EMPTY_TRANSCRIPT"});
 });
 it("times out even when the provider does not honour its abort signal",async()=>{
  const provider:GabrooSpeechRecognitionProvider={transcribe:()=>new Promise(()=>{})};
  await expect(transcribeGabrooAudio({audio,metadata,provider,timeoutMs:5})).rejects.toBeInstanceOf(GabrooRecognitionError);
 });

 it("rejects a byte count that does not match the declared audio size",async()=>{
  const transcribe=vi.fn(async()=>transcript);
  await expect(transcribeGabrooAudio({audio:new Uint8Array([1,2,3,4]),metadata,provider:{transcribe}})).rejects.toMatchObject({code:"INVALID_AUDIO"});
  expect(transcribe).not.toHaveBeenCalled();
 });
 it("cancels promptly even when a provider ignores its abort signal",async()=>{
  const controller=new AbortController();
  const provider:GabrooSpeechRecognitionProvider={transcribe:()=>new Promise(()=>{})};
  const pending=transcribeGabrooAudio({audio,metadata,provider,signal:controller.signal});
  controller.abort();
  await expect(pending).rejects.toMatchObject({code:"PROVIDER_FAILED",message:"Speech recognition was cancelled."});
 });
 it("rejects invalid timeout values before invoking the provider",async()=>{
  const transcribe=vi.fn(async()=>transcript);
  const provider={transcribe};
  for(const timeoutMs of [0,-1,1.5,Number.NaN,Number.POSITIVE_INFINITY,60_001]){
   await expect(transcribeGabrooAudio({audio,metadata,provider,timeoutMs})).rejects.toMatchObject({code:"INVALID_TIMEOUT"});
  }
  expect(transcribe).not.toHaveBeenCalled();
 });
 it("accepts the maximum supported timeout boundary",async()=>{
  const provider={transcribe:vi.fn(async()=>transcript)};
  await expect(transcribeGabrooAudio({audio,metadata,provider,timeoutMs:60_000})).resolves.toEqual(transcript);
 });

 it("rejects non-byte audio input before provider invocation",async()=>{
  const transcribe=vi.fn(async()=>transcript);
  await expect(transcribeGabrooAudio({audio:"not bytes" as unknown as Uint8Array,metadata,provider:{transcribe}})).rejects.toMatchObject({code:"INVALID_AUDIO"});
  expect(transcribe).not.toHaveBeenCalled();
 });

 it("accepts only explicitly review-required recognition responses",()=>{
  const response={transcript,review_required:true,request_id:"req_123"};
  expect(gabrooRecognitionResponseSchema.parse(response)).toEqual(response);
  expect(gabrooRecognitionResponseSchema.safeParse({...response,review_required:false}).success).toBe(false);
  expect(gabrooRecognitionResponseSchema.safeParse({...response,extra:"provider data"}).success).toBe(false);
  expect(gabrooRecognitionResponseSchema.safeParse({...response,transcript:{...transcript,confidence:2}}).success).toBe(false);
 });


 it("accepts only a complete safe recognition readiness response",()=>{
  const status={available:false,max_audio_bytes:GABROO_AUDIO_MAX_BYTES,supported_mime_types:["audio/mp4","audio/webm"],supported_languages:["ml-IN","en-IN","ml-en"],transcript_review_required:true};
  expect(gabrooRecognitionStatusSchema.parse(status)).toEqual(status);
  expect(gabrooRecognitionStatusSchema.safeParse({...status,transcript_review_required:false}).success).toBe(false);
  expect(gabrooRecognitionStatusSchema.safeParse({...status,max_audio_bytes:GABROO_AUDIO_MAX_BYTES+1}).success).toBe(false);
  expect(gabrooRecognitionStatusSchema.safeParse({...status,supported_mime_types:["audio/executable"]}).success).toBe(false);
  expect(gabrooRecognitionStatusSchema.safeParse({...status,unexpected:"secret"}).success).toBe(false);
 });
\n it("requires explicit learner confirmation for a reviewed transcript",()=>{
  const confirmed={text:"നമസ്കാരം, how are you?",languageDetected:"mixed",edited:false,confirmed:true};
  expect(gabrooReviewedTranscriptSchema.parse(confirmed)).toEqual(confirmed);
  expect(gabrooReviewedTranscriptSchema.safeParse({...confirmed,confirmed:false}).success).toBe(false);
  expect(gabrooReviewedTranscriptSchema.safeParse({...confirmed,text:"   "}).success).toBe(false);
  expect(gabrooReviewedTranscriptSchema.safeParse({...confirmed,extra:"provider metadata"}).success).toBe(false);
 });

 it("derives the edited flag from the learner-reviewed text",()=>{
  const unchanged=confirmGabrooTranscript({providerTranscript:transcript,reviewedText:transcript.text,confirmed:true});
  expect(unchanged).toEqual({text:transcript.text,languageDetected:"mixed",edited:false,confirmed:true});
  const edited=confirmGabrooTranscript({providerTranscript:transcript,reviewedText:"നമസ്കാരം, how are you doing?",confirmed:true});
  expect(edited).toEqual({text:"നമസ്കാരം, how are you doing?",languageDetected:"mixed",edited:true,confirmed:true});
 });
 it("does not create a reviewed transcript without explicit confirmation",()=>{
  expect(()=>confirmGabrooTranscript({providerTranscript:transcript,reviewedText:transcript.text,confirmed:false})).toThrow("Explicit learner confirmation");
 });
 it("rejects an empty learner-edited transcript",()=>{
  expect(()=>confirmGabrooTranscript({providerTranscript:transcript,reviewedText:"   ",confirmed:true})).toThrow();
 });

});