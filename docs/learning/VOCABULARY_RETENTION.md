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

## Review history

Migration `0023_learner_vocabulary_review_history.sql` adds an append-only event log. A database trigger records a history row whenever a learner's recall rating updates the current schedule, preserving the rating, resulting interval, ease factor, due date and review timestamp. The mutable schedule remains the source for the next due review; the history table is the source for the learner's past activity.

- `GET /api/v1/learning/vocabulary/history?limit=20` returns the most recent self-reported recall events, with a bounded limit of 1–50.
- The endpoint requires a verified learner and active subscription.
- Events are shown only while their lesson version remains the current published version, and English-to-Malayalam content must remain educator-approved.
- Word Garden displays recent ratings, review dates and resulting intervals. These records describe recall attempts, not a proficiency score.

## Remaining integration work

- Add a learner progress summary for vocabulary retained, developing and due for review.
- Teach Gabroo to naturally revisit weak words during conversation, with learner consent and without interrupting the conversation.
- Run the complete mobile typecheck/test suite and API integration tests against PostgreSQL before merging.

## Retention insights

The authenticated endpoint `GET /api/v1/learning/vocabulary/summary` aggregates only stable-ID vocabulary in the learner's current published curriculum direction and current published lesson versions. It returns total tagged words, words reviewed at least once, words still developing recall, words due now, and the most recent review timestamp.

“Stable recall” is a scheduling signal defined as at least three successful repetitions with a seven-day-or-longer interval. It is not a fluency, vocabulary-size, or proficiency score. The endpoint requires an active subscription, and the mobile progress screen shows the summary when available while keeping the free diagnostic report independent.

## Gabroo conversation integration

When a learner starts or continues a conversation, the API now loads up to five of that learner's difficult or due vocabulary items from the current published lesson versions in the selected learning direction. Only learner-owned review rows are considered; English-to-Malayalam content must still be educator-approved.

The items are passed to Gabroo's teaching policy as bounded context. Gabroo is instructed to reuse a relevant word naturally when it fits the conversation, without turning every chat into a quiz, interrupting the learner, or claiming mastery. A conversation without eligible review evidence receives an empty vocabulary focus and behaves as before. The learner's normal conversation history and saved memory remain separate.
