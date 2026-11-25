export const GABROO_SPEECH_RATE_MIN = 0.75;
export const GABROO_SPEECH_RATE_MAX = 1.5;
export const GABROO_SPEECH_RATE_STEP = 0.05;
export const GABROO_SPEECH_RATE_DEFAULT = 1;

export function clampGabrooSpeechRate(value: number): number {
  if (!Number.isFinite(value)) return GABROO_SPEECH_RATE_DEFAULT;
  const bounded = Math.min(GABROO_SPEECH_RATE_MAX, Math.max(GABROO_SPEECH_RATE_MIN, value));
  // Quantize in integer hundredths to avoid binary floating-point drift.
  const boundedHundredths = Math.round(bounded * 100);
  const minimumHundredths = Math.round(GABROO_SPEECH_RATE_MIN * 100);
  const stepHundredths = Math.round(GABROO_SPEECH_RATE_STEP * 100);
  const steps = Math.round((boundedHundredths - minimumHundredths) / stepHundredths);
  return Number(((minimumHundredths + steps * stepHundredths) / 100).toFixed(2));
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

export type GabenglishLearningStage=1|2|3|4|5;
export const GABROO_LEARNING_STAGES=[
 {stage:1 as const,title:"Malayalam Mode",description:"Build everyday English with Malayalam explanations."},
 {stage:2 as const,title:"Malayalam + English Mix",description:"Gradually use more English in familiar situations."},
 {stage:3 as const,title:"English Practice Mode",description:"Practise expressing your ideas in simple English."},
 {stage:4 as const,title:"English Immersion",description:"Build natural communication with less Malayalam support."},
 {stage:5 as const,title:"Expert Communication",description:"Develop nuance, precision and confident professional communication."}
] as const;

/** A chosen stage is a learner preference, never a measured proficiency result. */
export function resolveLearningStage(value:unknown):GabenglishLearningStage|null{
 return value===1||value===2||value===3||value===4||value===5?value:null;
}
