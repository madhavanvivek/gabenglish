# Adaptive lesson recommendations

## Purpose

The recommendation endpoint chooses one next lesson for the learner's currently selected learning direction and confirmed stage. It is intentionally deterministic and explainable; it does not use an opaque model to decide what a learner should study.

## Endpoint

`GET /api/v1/learning/recommendation`

Requires a verified learner account and an active subscription.

The response includes the selected learning direction, stage, recommendation (or null), a machine-readable reason, and a short learner-facing explanation.

## Selection rules

1. Resolve the learner's saved learning direction and confirmed stage.
2. Consider only published courses, lessons and current published lesson versions for that direction.
3. For English-to-Malayalam content, require educator approval.
4. Consider only lessons with at least one authored exercise explicitly tagged for the learner's exact stage.
5. Resume an in-progress lesson before offering a new one.
6. Otherwise choose the earliest lesson in the published course/module/lesson sequence.
7. Never recommend a completed lesson.
8. If no stage is selected, ask the learner to choose one. If no matching published lesson exists, report that content is not yet available rather than silently recommending a different stage.

## Exercise authoring

Each authored exercise may include an integer `stage` from 1 to 5. The tag is optional for legacy content, but untagged exercises are not eligible for stage-specific recommendations or automatic progression evidence.

A lesson may contain exercises for multiple stages. The learner-facing content projection must continue to hide answer keys and author-only metadata.

## Safety and learning quality

- Recommendations are based on published content and explicit curriculum tags, not inferred personal attributes.
- Learners can still browse the published course catalog.
- No stage is silently assigned.
- The endpoint does not claim CEFR equivalence or certify proficiency.
- If no suitable lesson exists, content authoring and educator review are the next actions; do not fall back to a higher or lower stage without learner consent.
