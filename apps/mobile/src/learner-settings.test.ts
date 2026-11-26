import { describe, expect, it } from "vitest";
import {
  adjustGabrooSpeechRate,
  clampGabrooSpeechRate,
  GABROO_SPEECH_RATE_MAX,
  GABROO_SPEECH_RATE_MIN,
  resolveLearningDirection,
  isCourseForLearningDirection,
  filterVocabularyItems,
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


describe("saved vocabulary search", () => {
  const words = [
    { id: "1", source_term: "hello", target_term: "നമസ്കാരം", example: "Hello, how are you?" },
    { id: "2", source_term: "beautiful", target_term: "സുന്ദരം", example: "A beautiful morning" },
    { id: "3", source_term: "thank you", target_term: "നന്ദി", example: null },
  ];

  it("returns the full collection for an empty or whitespace-only query", () => {
    expect(filterVocabularyItems(words, "")).toEqual(words);
    expect(filterVocabularyItems(words, "   ")).toEqual(words);
  });

  it("matches source words, Malayalam meanings, and example sentences without case sensitivity", () => {
    expect(filterVocabularyItems(words, "HELLO").map((word) => word.id)).toEqual(["1"]);
    expect(filterVocabularyItems(words, "സുന്ദരം").map((word) => word.id)).toEqual(["2"]);
    expect(filterVocabularyItems(words, "morning").map((word) => word.id)).toEqual(["2"]);
  });

  it("requires every query term to match somewhere in the word details", () => {
    expect(filterVocabularyItems(words, "beautiful morning").map((word) => word.id)).toEqual(["2"]);
    expect(filterVocabularyItems(words, "beautiful hello")).toEqual([]);
  });

  it("normalizes Unicode text and ignores repeated whitespace in the query", () => {
    expect(filterVocabularyItems(words, "  thank   YOU  ").map((word) => word.id)).toEqual(["3"]);
    expect(filterVocabularyItems(words, "  no   match ")).toEqual([]);
  });
});
