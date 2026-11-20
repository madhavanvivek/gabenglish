import {describe,expect,it,vi} from "vitest";
import {GabrooRecognitionError,type GabrooSpeechRecognitionProvider} from "@gabenglish/contracts";
import {recognizeGabrooAudio} from "./gabroo-recognition-service.js";

const audio=new Uint8Array([1,2,3]);
const metadata={mimeType:"audio/mp4" as const,sizeBytes:3,language:"ml-en" as const};
const transcript={text:"നമസ്കാരം, how are you?",languageDetected:"mixed" as const};

describe("Gabroo recognition service consent boundary",()=>{
 it("refuses recognition without explicit learner consent",async()=>{
  const transcribe=vi.fn(async (_input:Parameters<GabrooSpeechRecognitionProvider["transcribe"]>[0])=>transcript);
  const provider:GabrooSpeechRecognitionProvider={transcribe};
  await expect(recognizeGabrooAudio({audio,metadata,consentGranted:false,provider})).rejects.toMatchObject({
   code:"CONSENT_REQUIRED"
  });
  expect(transcribe).not.toHaveBeenCalled();
 });

 it("does not treat missing consent as consent",async()=>{
  const transcribe=vi.fn(async (_input:Parameters<GabrooSpeechRecognitionProvider["transcribe"]>[0])=>transcript);
  const provider:GabrooSpeechRecognitionProvider={transcribe};
  await expect(recognizeGabrooAudio({
   audio,metadata,consentGranted:undefined as unknown as boolean,provider
  })).rejects.toMatchObject({code:"CONSENT_REQUIRED"});
  expect(transcribe).not.toHaveBeenCalled();
 });

 it("passes validated audio to the injected provider only after consent",async()=>{
  const transcribe=vi.fn(async (_input:Parameters<GabrooSpeechRecognitionProvider["transcribe"]>[0])=>transcript);
  const provider:GabrooSpeechRecognitionProvider={transcribe};
  await expect(recognizeGabrooAudio({audio,metadata,consentGranted:true,provider})).resolves.toEqual(transcript);
  expect(transcribe).toHaveBeenCalledTimes(1);
  expect(transcribe.mock.calls[0]?.[0]).toMatchObject({
   audio,mimeType:"audio/mp4",language:"ml-en"
  });
 });

 it("forwards every learner-selected recognition mode unchanged",async()=>{
  const transcribe=vi.fn(async (_input:Parameters<GabrooSpeechRecognitionProvider["transcribe"]>[0])=>transcript);
  const provider:GabrooSpeechRecognitionProvider={transcribe};
  for(const language of ["ml-en","ml-IN","en-IN"] as const){
   await recognizeGabrooAudio({
    audio,
    metadata:{...metadata,language},
    consentGranted:true,
    provider
   });
  }
  expect(transcribe).toHaveBeenCalledTimes(3);
  expect(transcribe.mock.calls.map(([input])=>input.language)).toEqual([
   "ml-en","ml-IN","en-IN"
  ]);
 });

 it("does not store or auto-confirm the provider transcript",async()=>{
  const provider:GabrooSpeechRecognitionProvider={transcribe:async()=>transcript};
  const result=await recognizeGabrooAudio({audio,metadata,consentGranted:true,provider});
  expect(result).toEqual(transcript);
  expect(result).not.toHaveProperty("confirmed");
  expect(result).not.toHaveProperty("edited");
 });

 it("returns provider-unavailable without invoking external work",async()=>{
  await expect(recognizeGabrooAudio({audio,metadata,consentGranted:true})).rejects.toBeInstanceOf(GabrooRecognitionError);
  await expect(recognizeGabrooAudio({audio,metadata,consentGranted:true})).rejects.toMatchObject({
   code:"PROVIDER_UNAVAILABLE"
  });
 });

 it("rejects mismatched audio metadata before provider invocation",async()=>{
  const transcribe=vi.fn(async (_input:Parameters<GabrooSpeechRecognitionProvider["transcribe"]>[0])=>transcript);
  const provider:GabrooSpeechRecognitionProvider={transcribe};
  await expect(recognizeGabrooAudio({
   audio,metadata:{...metadata,sizeBytes:4},consentGranted:true,provider
  })).rejects.toMatchObject({code:"INVALID_AUDIO"});
  expect(transcribe).not.toHaveBeenCalled();
 });
});
