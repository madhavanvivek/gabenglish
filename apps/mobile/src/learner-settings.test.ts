import { describe, expect, it } from "vitest";
import {
  adjustGabrooSpeechRate,
  clampGabrooSpeechRate,
  GABROO_SPEECH_RATE_MAX,
  GABROO_SPEECH_RATE_MIN,
  resolveLearningDirection,
  isCourseForLearningDirection,
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

  it("quantizes persisted values to the supported 0.05 increment", () => {
    expect(clampGabrooSpeechRate(1.03)).toBe(1.05);
    expect(clampGabrooSpeechRate(1.02)).toBe(1);
    expect(clampGabrooSpeechRate(0.76)).toBe(0.75);
    expect(clampGabrooSpeechRate(1.499)).toBe(1.5);
  });

  it("keeps repeated adjustments aligned to the supported increment", () => {
    let rate = 0.75;
    for (let index = 0; index < 15; index += 1) {
      rate = adjustGabrooSpeechRate(rate, 0.05);
      expect(Number.isInteger((rate - GABROO_SPEECH_RATE_MIN) / 0.05)).toBe(true);
    }
    expect(rate).toBe(1.5);
  });

  it("falls back to normal speed for non-finite values", () => {
    expect(clampGabrooSpeechRate(Number.NaN)).toBe(1);
    expect(clampGabrooSpeechRate(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe("learner learning-direction safeguards", () => {
  it("keeps existing and incomplete profiles on English through Malayalam", () => {
    expect(resolveLearningDirection(undefined)).toBe("ml_to_en");
    expect(resolveLearningDirection(null)).toBe("ml_to_en");
    expect(resolveLearningDirection("unexpected")).toBe("ml_to_en");
  });

  it("preserves an explicit Malayalam-through-English selection", () => {
    expect(resolveLearningDirection("en_to_ml")).toBe("en_to_ml");
  });

  it("does not expose a course from the opposite learning direction", () => {
    expect(isCourseForLearningDirection("ml_to_en", "ml_to_en")).toBe(true);
    expect(isCourseForLearningDirection("en_to_ml", "ml_to_en")).toBe(false);
    expect(isCourseForLearningDirection("en_to_ml", "en_to_ml")).toBe(true);
    expect(isCourseForLearningDirection("ml_to_en", "en_to_ml")).toBe(false);
  });
});
