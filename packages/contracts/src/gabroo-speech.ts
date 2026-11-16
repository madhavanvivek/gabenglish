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
