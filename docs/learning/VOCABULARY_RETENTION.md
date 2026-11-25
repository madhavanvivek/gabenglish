# Vocabulary retention and spaced repetition

## Scheduling core

Gabenglish uses a deterministic, learner-owned recall schedule. A learner rates recall from 0 (could not recall) to 5 (effortless recall). Ratings below 3 reset the repetition run and schedule another review in one day. Successful recall schedules the first review in one day, the second in three days, and later reviews by the previous interval multiplied by an ease factor. Ease is bounded below by 1.3.

The scheduler is deliberately isolated and unit-tested. It does not infer recall from time spent, streaks, or a multiple-choice score. The learner's rating is the signal for vocabulary retention.

## Persistence

Migration `0022_learner_vocabulary_reviews.sql` stores per-learner, per-direction schedules keyed to a published lesson version and stable vocabulary item ID. A lesson-version change creates a separate review identity so changed definitions are not silently treated as the same learning item.

## Integration still required

Vocabulary authoring must assign stable IDs to vocabulary items. The next API/mobile slice must source due terms from published learner-safe lesson content, present a review queue, collect the learner's recall rating, and persist the scheduler output. Review scheduling must never block normal lessons or punish missed days.
