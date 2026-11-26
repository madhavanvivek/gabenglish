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


export interface SearchableVocabularyItem {
  source_term: string;
  target_term: string;
  example?: string | null;
}

/** Match every search term across a saved word's source, meaning, and example. */
export function filterVocabularyItems<T extends SearchableVocabularyItem>(
  items: T[],
  query: string
): T[] {
  const terms = query.normalize("NFKC").trim().toLocaleLowerCase().split(/\\s+/u).filter(Boolean);
  if (terms.length === 0) return items;
  return items.filter((item) => {
    const searchableText = `${item.source_term} ${item.target_term} ${item.example ?? ""}`
      .normalize("NFKC")
      .toLocaleLowerCase();
    return terms.every((term) => searchableText.includes(term));
  });
}
