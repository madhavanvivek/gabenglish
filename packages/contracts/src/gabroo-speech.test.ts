import {describe,expect,it,vi} from "vitest";
import {
 GABROO_SPEECH_RATE_DEFAULT,
 GABROO_SPEECH_RATE_MAX,
 GABROO_SPEECH_RATE_MIN,
 applyGabrooSpeechRate,
 gabrooSpeechRateSchema,
 type GabrooAudioPlayback
} from "./gabroo-speech.js";

describe("Gabroo speech playback contract",()=>{
 it("defines the learner-friendly default and supported range",()=>{
  expect(GABROO_SPEECH_RATE_DEFAULT).toBe(1);
  expect(GABROO_SPEECH_RATE_MIN).toBe(0.75);
  expect(GABROO_SPEECH_RATE_MAX).toBe(1.5);
 });
 it.each([0.75,0.8,0.95,1,1.25,1.5])("accepts supported playback rate %s",rate=>{
  expect(gabrooSpeechRateSchema.parse(rate)).toBe(rate);
 });
 it.each([0.7,1.03,1.51,NaN,Infinity])("rejects unsupported playback rate %s",rate=>{
  expect(gabrooSpeechRateSchema.safeParse(rate).success).toBe(false);
 });
 it("applies the saved rate to the active provider-neutral player",async()=>{
  const setPlaybackRate=vi.fn(async(_rate:number)=>undefined);
  const player:GabrooAudioPlayback={setPlaybackRate};
  await expect(applyGabrooSpeechRate(player,0.85)).resolves.toBe(0.85);
  expect(setPlaybackRate).toHaveBeenCalledOnce();
  expect(setPlaybackRate).toHaveBeenCalledWith(0.85);
 });
 it("does not touch the player when the saved preference is invalid",async()=>{
  const setPlaybackRate=vi.fn(async(_rate:number)=>undefined);
  const player:GabrooAudioPlayback={setPlaybackRate};
  await expect(applyGabrooSpeechRate(player,1.03)).rejects.toThrow();
  expect(setPlaybackRate).not.toHaveBeenCalled();
 });
 it("surfaces player failures instead of claiming playback speed changed",async()=>{
  const player:GabrooAudioPlayback={setPlaybackRate:async()=>{throw new Error("audio unavailable");}};
  await expect(applyGabrooSpeechRate(player,1.2)).rejects.toThrow("audio unavailable");
 });
});
