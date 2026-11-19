export const GABROO_SPEECH_RATE_MIN = 0.75;
export const GABROO_SPEECH_RATE_MAX = 1.5;
export const GABROO_SPEECH_RATE_STEP = 0.05;
export const GABROO_SPEECH_RATE_DEFAULT = 1;

export function clampGabrooSpeechRate(value: number): number {
  if (!Number.isFinite(value)) return GABROO_SPEECH_RATE_DEFAULT;
  const bounded = Math.min(GABROO_SPEECH_RATE_MAX, Math.max(GABROO_SPEECH_RATE_MIN, value));
  const steps = Math.round((bounded - GABROO_SPEECH_RATE_MIN) / GABROO_SPEECH_RATE_STEP);
  return Number((GABROO_SPEECH_RATE_MIN + steps * GABROO_SPEECH_RATE_STEP).toFixed(2));
}
export function adjustGabrooSpeechRate(current: number, delta: number): number {
  return clampGabrooSpeechRate(current + delta);
}

export type GabenglishLearningDirection = "ml_to_en" | "en_to_ml";

/** Preserve the established English-learning default for older or incomplete profiles. */
export function resolveLearningDirection(value: unknown): GabenglishLearningDirection {
  return value === "en_to_ml" ? "en_to_ml" : "ml_to_en";
}

/** Never show a course authored for the other learning direction. */
export function isCourseForLearningDirection(
  courseDirection: unknown,
  learnerDirection: GabenglishLearningDirection
): boolean {
  return courseDirection === learnerDirection;
}
