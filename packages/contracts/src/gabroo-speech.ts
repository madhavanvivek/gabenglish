import {z} from "zod";

/** Gabroo speech playback preferences shared by mobile and future audio adapters. */
export const GABROO_SPEECH_RATE_MIN=0.75;
export const GABROO_SPEECH_RATE_MAX=1.5;
export const GABROO_SPEECH_RATE_STEP=0.05;
export const GABROO_SPEECH_RATE_DEFAULT=1;

export const gabrooSpeechRateSchema=z.number()
 .min(GABROO_SPEECH_RATE_MIN)
 .max(GABROO_SPEECH_RATE_MAX)
 .refine(value=>{
  const steps=(value-GABROO_SPEECH_RATE_MIN)/GABROO_SPEECH_RATE_STEP;
  return Math.abs(steps-Math.round(steps))<1e-8;
 },"Speaking speed must use 0.05× increments.");

export type GabrooSpeechRate=z.infer<typeof gabrooSpeechRateSchema>;

/**
 * Minimal provider-neutral playback contract. An Expo, native, or web audio
 * adapter can implement this without exposing provider SDK types to the app.
 */
export interface GabrooAudioPlayback {
 setPlaybackRate(rate:GabrooSpeechRate):Promise<void>;
}

/** Validate and apply the learner's saved rate to an active audio player. */
export async function applyGabrooSpeechRate(
 playback:GabrooAudioPlayback,
 preferredRate:number
):Promise<GabrooSpeechRate>{
 const rate=gabrooSpeechRateSchema.parse(preferredRate);
 await playback.setPlaybackRate(rate);
 return rate;
}

/** Maximum duration of the local-only microphone validation recording. */
export const GABROO_LOCAL_CAPTURE_MAX_MS=15_000;

/** Provider-independent lifecycle for a single consent-based voice session. */
export const gabrooVoiceSessionStateSchema=z.enum([
 "idle","requesting_permission","ready","listening","transcribing",
 "generating","speaking","interrupted","error"
]);
export type GabrooVoiceSessionState=z.infer<typeof gabrooVoiceSessionStateSchema>;

export type GabrooVoiceSessionEvent=
 |{type:"start";consentGranted:boolean}
 |{type:"permission_granted"}
 |{type:"permission_denied"}
 |{type:"begin_capture"}
 |{type:"capture_stopped"}
 |{type:"capture_discarded"}
 |{type:"transcript_ready"}
 |{type:"response_ready"}
 |{type:"playback_finished"}
 |{type:"interrupt"}
 |{type:"resume"}
 |{type:"fail"}
 |{type:"reset"};

const activeVoiceStates:GabrooVoiceSessionState[]=[
 "requesting_permission","ready","listening","transcribing","generating","speaking"
];

/**
 * Pure transition function: callers must obtain explicit consent before
 * requesting microphone permission. Invalid transitions fail closed.
 */
export function transitionGabrooVoiceSession(
 current:GabrooVoiceSessionState,
 event:GabrooVoiceSessionEvent
):GabrooVoiceSessionState{
 const next:Partial<Record<GabrooVoiceSessionEvent["type"],GabrooVoiceSessionState>>={
  start: "requesting_permission",
  permission_granted:"ready",
  begin_capture:"listening",
  permission_denied:"error",
  capture_stopped:"transcribing",
  capture_discarded:"ready",
  transcript_ready:"generating",
  response_ready:"speaking",
  playback_finished:"idle",
  interrupt:"interrupted",
  resume:"requesting_permission",
  fail:"error",
  reset:"idle"
 };
 if(event.type==="start" && !event.consentGranted){
  throw new Error("Explicit learner consent is required before microphone permission.");
 }
 if(event.type==="interrupt" && activeVoiceStates.includes(current)){
  return "interrupted";
 }
 const allowed:Record<GabrooVoiceSessionEvent["type"],GabrooVoiceSessionState[]> ={
  start:["idle"],
  permission_granted:["requesting_permission"],
  begin_capture:["ready"],
  permission_denied:["requesting_permission"],
  capture_stopped:["listening"],
  capture_discarded:["transcribing"],
  transcript_ready:["transcribing"],
  response_ready:["generating"],
  playback_finished:["speaking"],
  interrupt:activeVoiceStates,
  resume:["interrupted"],
  fail:activeVoiceStates,
  reset:["interrupted","error","ready"]
 };
 if(!allowed[event.type].includes(current)){
  throw new Error(`Invalid Gabroo voice transition: ${current} -> ${event.type}.`);
 }
 return next[event.type]!;
}


export type GabrooSpeechLanguage="ml"|"en";
export interface GabrooSpeechSegment {text:string;language:GabrooSpeechLanguage}

/**
 * Split mixed Malayalam/English text into ordered speech runs without losing
 * punctuation or whitespace. Neutral characters follow the preceding run.
 */
export function splitGabrooSpeechText(input:string):GabrooSpeechSegment[]{
 const segments:GabrooSpeechSegment[]=[];
 let leading="";
 for(const character of Array.from(input)){
  const language:GabrooSpeechLanguage|null=
   /[\u0D00-\u0D7F]/u.test(character)?"ml":
   /[A-Za-z0-9]/u.test(character)?"en":null;
  if(language===null){
   if(segments.length)segments[segments.length-1].text+=character;
   else leading+=character;
   continue;
  }
  if(segments.length&&segments[segments.length-1].language===language){
   segments[segments.length-1].text+=leading+character;
   leading="";
  }else{
   segments.push({text:leading+character,language});
   leading="";
  }
 }
 if(leading&&segments.length)segments[segments.length-1].text+=leading;
 return segments.filter(segment=>segment.text.trim().length>0);
}


/**
 * Bound synthesis request size and split at sentence boundaries where possible.
 * Punctuation and whitespace remain attached to the original spoken text.
 */
export function chunkGabrooSpeechSegments(
 segments:GabrooSpeechSegment[],
 maxCharacters=600
):GabrooSpeechSegment[]{
 if(!Number.isInteger(maxCharacters)||maxCharacters<1||maxCharacters>4_000){
  throw new Error("Gabroo speech chunk size must be between 1 and 4000 characters.");
 }
 const chunks:GabrooSpeechSegment[]=[];
 for(const segment of segments){
  let current="";
  const characters=Array.from(segment.text);
  for(let index=0;index<characters.length;index+=1){
   const character=characters[index];
   current+=character;
   const next=characters[index+1];
   const sentenceBoundary=/[.!?…।॥]/u.test(character)&&(!next||/\\s/u.test(next));
   if(sentenceBoundary||Array.from(current).length>=maxCharacters){
    if(current.trim())chunks.push({text:current,language:segment.language});
    current="";
   }
  }
  if(current.trim())chunks.push({text:current,language:segment.language});
  else if(current&&chunks.length&&chunks[chunks.length-1].language===segment.language)chunks[chunks.length-1].text+=current;
 }
 return chunks;
}

/** Minimal adapter used by the tested sequential speech queue. */
export interface GabrooSegmentPlayback {
 speak(segment:GabrooSpeechSegment,rate:GabrooSpeechRate):Promise<void>;
}

/**
 * Play language-specific speech segments in order. The caller can cancel
 * between segments without coupling the shared contract to AbortController
 * or a particular native audio SDK.
 */
export async function playGabrooSpeechSegments(
 segments:GabrooSpeechSegment[],
 playback:GabrooSegmentPlayback,
 preferredRate:number,
 shouldStop:()=>boolean=()=>false
):Promise<number>{
 const rate=gabrooSpeechRateSchema.parse(preferredRate);
 let completed=0;
 for(const segment of segments){
  if(shouldStop())break;
  await playback.speak(segment,rate);
  // A provider may resolve its promise when stop() interrupts playback.
  // Re-check cancellation before counting the segment as fully played.
  if(shouldStop())break;
  completed+=1;
 }
 return completed;
}
