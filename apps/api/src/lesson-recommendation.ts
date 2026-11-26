import type {LearningStage} from "./learning-stage.js";

export type RecommendationCandidate = {
  lessonId: string;
  courseId: string;
  title: string;
  slug: string;
  moduleTitle: string;
  progressStatus: "not_started" | "in_progress" | "completed" | null;
  progressPercent: number;
  courseSort: number;
  moduleSort: number;
  lessonSort: number;
};

export type LessonRecommendation = {
  lessonId: string;
  courseId: string;
  title: string;
  slug: string;
  moduleTitle: string;
  reason: "continue_learning" | "next_in_sequence";
  progressPercent: number;
  stage: LearningStage;
};

/**
 * Select only curriculum candidates already filtered for publication,
 * language direction and exact learner stage by the API query.
 * In-progress lessons outrank new lessons; sequence order breaks ties.
 */
export function selectNextLessonRecommendation(
  stage: LearningStage,
  candidates: readonly RecommendationCandidate[],
): LessonRecommendation | null {
  const eligible = candidates.filter(candidate => candidate.progressStatus !== "completed");
  eligible.sort((a, b) => {
    const aInProgress = a.progressStatus === "in_progress" ? 0 : 1;
    const bInProgress = b.progressStatus === "in_progress" ? 0 : 1;
    return aInProgress - bInProgress
      || a.courseSort - b.courseSort
      || a.moduleSort - b.moduleSort
      || a.lessonSort - b.lessonSort
      || a.lessonId.localeCompare(b.lessonId);
  });
  const next = eligible[0];
  if (!next) return null;
  return {
    lessonId: next.lessonId,
    courseId: next.courseId,
    title: next.title,
    slug: next.slug,
    moduleTitle: next.moduleTitle,
    reason: next.progressStatus === "in_progress" ? "continue_learning" : "next_in_sequence",
    progressPercent: next.progressPercent,
    stage,
  };
}
