import { describe, expect, it } from "vitest";
import {
  adjustGabrooSpeechRate,
  clampGabrooSpeechRate,
  GABROO_SPEECH_RATE_MAX,
  GABROO_SPEECH_RATE_MIN,
} from "./learner-settings";

describe("Gabroo speech-rate preference", () => {
  it("keeps the default pace at normal speed", () => {
    expect(clampGabrooSpeechRate(1)).toBe(1);
  });

  it("clamps values to the supported minimum and maximum", () => {
    expect(clampGabrooSpeechRate(0.2)).toBe(GABROO_SPEECH_RATE_MIN);
    expect(clampGabrooSpeechRate(2)).toBe(GABROO_SPEECH_RATE_MAX);
  });

  it("rounds to hundredths to avoid floating-point display drift", () => {
    expect(clampGabrooSpeechRate(1.149999)).toBe(1.15);
  });

  it("moves in the requested direction without crossing the limits", () => {
    expect(adjustGabrooSpeechRate(1, -0.05)).toBe(0.95);
    expect(adjustGabrooSpeechRate(1, 0.05)).toBe(1.05);
    expect(adjustGabrooSpeechRate(GABROO_SPEECH_RATE_MIN, -0.05)).toBe(GABROO_SPEECH_RATE_MIN);
    expect(adjustGabrooSpeechRate(GABROO_SPEECH_RATE_MAX, 0.05)).toBe(GABROO_SPEECH_RATE_MAX);
  });

  it("falls back to normal speed for non-finite values", () => {
    expect(clampGabrooSpeechRate(Number.NaN)).toBe(1);
    expect(clampGabrooSpeechRate(Number.POSITIVE_INFINITY)).toBe(1);
  });
});
