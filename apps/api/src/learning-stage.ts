export type LearningStage = 1 | 2 | 3 | 4 | 5;
export type StageOutcome = "promote" | "demote" | "hold" | "insufficient_evidence";

export type StageEvaluation = {
  currentStage: LearningStage;
  nextStage: LearningStage;
  outcome: StageOutcome;
  sampleSize: number;
  correctCount: number;
  accuracy: number | null;
  rationale: string;
};

/**
 * Stage movement is based only on recent, stage-tagged authored exercise results.
 * Eight attempts are required; a single answer can never move a learner.
 * This is a learning-path pacing signal, not a CEFR score or fluency claim.
 */
export function evaluateLearningStage(
  currentStage: LearningStage,
  recentOutcomes: readonly boolean[],
): StageEvaluation {
  const sample = recentOutcomes.slice(0, 8);
  const correctCount = sample.filter(Boolean).length;
  const sampleSize = sample.length;
  const accuracy = sampleSize === 0 ? null : correctCount / sampleSize;

  if (sampleSize < 8) {
    return {
      currentStage, nextStage: currentStage, outcome: "insufficient_evidence",
      sampleSize, correctCount, accuracy,
      rationale: "At least eight recent exercises at the current stage are required before changing stages.",
    };
  }

  if (correctCount >= 7 && currentStage < 5) {
    return {
      currentStage, nextStage: (currentStage + 1) as LearningStage, outcome: "promote",
      sampleSize, correctCount, accuracy,
      rationale: "At least seven of the last eight stage-matched exercises were correct.",
    };
  }

  if (correctCount <= 2 && currentStage > 1) {
    return {
      currentStage, nextStage: (currentStage - 1) as LearningStage, outcome: "demote",
      sampleSize, correctCount, accuracy,
      rationale: "At most two of the last eight stage-matched exercises were correct; reduce difficulty and rebuild confidence.",
    };
  }

  return {
    currentStage, nextStage: currentStage, outcome: "hold",
    sampleSize, correctCount, accuracy,
    rationale: "Recent results do not meet the threshold for a stage change.",
  };
}
