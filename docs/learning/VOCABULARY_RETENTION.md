# Vocabulary retention and spaced repetition

## Scheduling core

Gabenglish uses a deterministic, learner-owned recall schedule. A learner rates recall from 0 (could not recall) to 5 (effortless recall). Ratings below 3 reset the repetition run and schedule another review in one day. Successful recall schedules the first review in one day, the second in three days, and later reviews by the previous interval multiplied by an ease factor. Ease is bounded between 1.3 and 4.0.

The scheduler is deliberately isolated and unit-tested. It does not infer recall from time spent, streaks, or a multiple-choice score. The learner's rating is the signal for vocabulary retention.

## Persistence

Migration `0022_learner_vocabulary_reviews.sql` stores per-learner, per-direction schedules keyed to a published lesson version and stable vocabulary item ID. A lesson-version change creates a separate review identity so changed definitions are not silently treated as the same learning item.

## API integration

- `GET /api/v1/learning/vocabulary/reviews?limit=20` returns due and never-reviewed vocabulary from the learner's current published learning direction. The limit is 1–50 and defaults to 20.
- `POST /api/v1/learning/lessons/{lessonId}/vocabulary/{itemId}/review` accepts only a whole-number `rating` from 0 to 5 and persists the next due date.
- Both routes require a verified learner and active subscription. English-to-Malayalam items require educator-approved published content.
- Review items are keyed to the current lesson version. When content is revised and republished, the new version is treated as a new learning item rather than inheriting an outdated definition's schedule.
- Vocabulary item IDs are optional for legacy content, but only items with stable IDs participate in review scheduling.

## Mobile learner experience

The mobile app now includes a Word Garden review screen linked from the learner home. It loads up to 30 due or never-reviewed items, shows the target word and optional pronunciation/example first, reveals the meaning on learner action, and records one of six recall ratings. After a successful save it advances to the next item; when the queue is empty it offers a route back to lessons and Gabroo.

The screen uses the authenticated mobile API client, so access tokens remain in secure storage and the client refreshes an expired session through the existing session flow. Subscription and published-content checks remain enforced by the API. Review scheduling must never block normal lessons or punish missed days.

## Remaining integration work

- Add a learner progress summary for vocabulary retained, developing and due for review.
- Teach Gabroo to naturally revisit weak words during conversation, with learner consent and without interrupting the conversation.
- Run the complete mobile typecheck/test suite and API integration tests against PostgreSQL before merging.
