/**
 * Gabroo Learning Intelligence Model (GLIM) v1.
 *
 * This is Gabenglish-owned teaching logic, not a foundation language model.
 * It makes transparent, testable learning decisions from evidence supplied by
 * assessment and conversation services. It never invents proficiency scores.
 */
export const GABROO_SKILLS = [
  "grammar",
  "vocabulary",
  "pronunciation",
  "fluency",
  "comprehension",
  "confidence"
] as const;

export type GabrooSkill = typeof GABROO_SKILLS[number];
export type GabrooEvidenceSource = "placement_assessment" | "lesson_exercise" | "conversation" | "learner_review" | "human_review";
export type GabrooSkillEvidence = {
  skill: GabrooSkill;
  /** Normalised observed result from 0 to 1; must be grounded in an actual task. */
  score: number;
  /** Reliability of the observation, not the learner's ability. */
  confidence: number;
  source: GabrooEvidenceSource;
  observedAt: string;
  taskId: string;
};
export type GabrooSkillEstimate = {
  skill: GabrooSkill;
  score: number;
  evidenceCount: number;
  confidence: number;
  lastObservedAt: string;
};
export type GabrooLearningDecision = {
  status: "needs_placement" | "practice_recommendation" | "balanced_practice";
  focusSkill: GabrooSkill | null;
  reason: string;
  activity: "guided_example" | "retrieval_practice" | "speaking_prompt" | "listening_check" | "confidence_prompt" | "placement_task";
  correctionStyle: "none" | "gentle" | "focused";
  targetLanguage: "en" | "ml";
  supportLanguage: "ml" | "en";
  evidenceUsed: number;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const validDate = (value: string) => Number.isFinite(Date.parse(value));

/**
 * Aggregate only valid, task-linked observations. More reliable evidence has
 * more influence; low-confidence signals cannot dominate the learner profile.
 */
export function estimateGabrooSkills(evidence: GabrooSkillEvidence[]): GabrooSkillEstimate[] {
  return GABROO_SKILLS.flatMap((skill) => {
    const observations = evidence.filter((item) =>
      item.skill === skill &&
      Number.isFinite(item.score) && item.score >= 0 && item.score <= 1 &&
      Number.isFinite(item.confidence) && item.confidence > 0 && item.confidence <= 1 &&
      Boolean(item.taskId.trim()) && validDate(item.observedAt)
    );
    if (observations.length === 0) return [];
    const weight = observations.reduce((sum, item) => sum + item.confidence, 0);
    const score = observations.reduce((sum, item) => sum + item.score * item.confidence, 0) / weight;
    const confidence = Math.min(1, weight / Math.max(3, observations.length * 1.5));
    const lastObservedAt = observations.map((item) => item.observedAt).sort().at(-1)!;
    return [{ skill, score: Math.round(clamp(score) * 100) / 100, evidenceCount: observations.length, confidence: Math.round(confidence * 100) / 100, lastObservedAt }];
  });
}

/**
 * Select one teachable next step. No evidence means placement, not a guessed
 * beginner/intermediate/advanced label. Weak skills need repeated evidence.
 */
export function chooseGabrooLearningDecision(input: {
  evidence: GabrooSkillEvidence[];
  learningDirection: "ml_to_en" | "en_to_ml";
  dueVocabularyCount?: number;
  learnerAskedForFreeConversation?: boolean;
}): GabrooLearningDecision {
  const targetLanguage = input.learningDirection === "ml_to_en" ? "en" : "ml";
  const supportLanguage = input.learningDirection === "ml_to_en" ? "ml" : "en";
  const estimates = estimateGabrooSkills(input.evidence);
  const totalEvidence = estimates.reduce((sum, item) => sum + item.evidenceCount, 0);

  // A learner's explicit free-conversation choice takes precedence over
  // placement prompts, including when no verified evidence exists yet.
  if (input.learnerAskedForFreeConversation) {
    return {
      status: "balanced_practice", focusSkill: null,
      reason: "Respect the learner's request for open conversation; do not force a lesson, placement activity or correction.",
      activity: "speaking_prompt", correctionStyle: "none",
      targetLanguage, supportLanguage, evidenceUsed: totalEvidence
    };
  }

  if (totalEvidence === 0) {
    return {
      status: "needs_placement", focusSkill: null,
      reason: "There is not enough verified learning evidence to estimate proficiency. Start with a short, supportive placement activity when the learner is ready.",
      activity: "placement_task", correctionStyle: "gentle",
      targetLanguage, supportLanguage, evidenceUsed: 0
    };
  }

  const eligible = estimates.filter((item) => item.evidenceCount >= 2 && item.confidence >= 0.4);
  const weakest = eligible.sort((a, b) => a.score - b.score || a.skill.localeCompare(b.skill))[0];
  if (!weakest) {
    return {
      status: "balanced_practice", focusSkill: null,
      reason: "There is some evidence, but not enough repeated reliable evidence to target a weakness. Gather more evidence through varied practice.",
      activity: "speaking_prompt", correctionStyle: "gentle",
      targetLanguage, supportLanguage, evidenceUsed: totalEvidence
    };
  }

  const activityBySkill: Record<GabrooSkill, GabrooLearningDecision["activity"]> = {
    grammar: "guided_example",
    vocabulary: (input.dueVocabularyCount ?? 0) > 0 ? "retrieval_practice" : "guided_example",
    pronunciation: "speaking_prompt",
    fluency: "speaking_prompt",
    comprehension: "listening_check",
    confidence: "confidence_prompt"
  };
  const correctionStyle = weakest.skill === "confidence" ? "none" : weakest.score < 0.45 ? "focused" : "gentle";
  return {
    status: "practice_recommendation",
    focusSkill: weakest.skill,
    reason: `Repeated learning evidence identifies ${weakest.skill} as the best next practice focus.`,
    activity: activityBySkill[weakest.skill],
    correctionStyle, targetLanguage, supportLanguage,
    evidenceUsed: totalEvidence
  };
}
