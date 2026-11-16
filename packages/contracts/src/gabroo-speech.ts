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

/** Provider-independent lifecycle for a single consent-based voice session. */
export const gabrooVoiceSessionStateSchema=z.enum([
 "idle","requesting_permission","listening","transcribing",
 "generating","speaking","interrupted","error"
]);
export type GabrooVoiceSessionState=z.infer<typeof gabrooVoiceSessionStateSchema>;

export type GabrooVoiceSessionEvent=
 |{type:"start";consentGranted:boolean}
 |{type:"permission_granted"}
 |{type:"permission_denied"}
 |{type:"capture_stopped"}
 |{type:"transcript_ready"}
 |{type:"response_ready"}
 |{type:"playback_finished"}
 |{type:"interrupt"}
 |{type:"resume"}
 |{type:"fail"}
 |{type:"reset"};

const activeVoiceStates:GabrooVoiceSessionState[]=[
 "requesting_permission","listening","transcribing","generating","speaking"
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
  permission_granted:"listening",
  permission_denied:"error",
  capture_stopped:"transcribing",
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
  permission_denied:["requesting_permission"],
  capture_stopped:["listening"],
  transcript_ready:["transcribing"],
  response_ready:["generating"],
  playback_finished:["speaking"],
  interrupt:activeVoiceStates,
  resume:["interrupted"],
  fail:activeVoiceStates,
  reset:["interrupted","error"]
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
