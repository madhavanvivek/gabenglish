export const GABROO_SPEECH_RATE_MIN = 0.75;
export const GABROO_SPEECH_RATE_MAX = 1.5;
export const GABROO_SPEECH_RATE_STEP = 0.05;

export function clampGabrooSpeechRate(value: number): number {
  if (!Number.isFinite(value)) return 1;
  const rounded = Math.round(value * 100) / 100;
  return Math.min(
    GABROO_SPEECH_RATE_MAX,
    Math.max(GABROO_SPEECH_RATE_MIN, rounded)
  );
}

export function adjustGabrooSpeechRate(current: number, delta: number): number {
  return clampGabrooSpeechRate(current + delta);
}
