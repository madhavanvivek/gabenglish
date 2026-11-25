# Learner skill profile

## Endpoint

`GET /api/v1/learning/skill-profile` requires a verified learner and active subscription. It returns the learner's saved stage and skill-level evidence for the selected learning direction.

## Authoring tags

An authored exercise may include `skill_key` using one of:

- `vocabulary`
- `pronunciation`
- `sentence_formation`
- `grammar`
- `listening`
- `speaking`
- `fluency`
- `comprehension`
- `conversation`
- `writing`

Tags are optional for legacy content. Untagged exercises still work normally but do not contribute to the skill profile. The learner-safe lesson projection does not expose author-only metadata.

## Evidence rules

- The profile uses only the latest attempt for each lesson/exercise pair, so repeated retries do not inflate the sample count.
- Skills with fewer than five distinct exercises are marked `insufficient_evidence`.
- At five or more distinct exercises, accuracy of 80% or above is `strong`; 50% or below is `needs_practice`; values between are `developing`.
- These are coaching signals, not validated proficiency scores, CEFR levels, or certificates.
- Results are isolated by learner and learning direction. No untagged skill is inferred from a lesson title or AI guess.
