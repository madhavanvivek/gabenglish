# Gabroo Vocabulary Revision

## Product intent

Vocabulary revision helps learners retain English words and expressions they deliberately add from a Gabroo reply they have saved. The vocabulary list is learner-owned. Gabroo must not silently extract, store or schedule arbitrary conversation text.

The first release supports Malayalam-to-English learning. Learners enter or confirm the Malayalam meaning and optional example sentence. The app does not present generated meanings as verified dictionary content.

## Learner flow

1. During a conversation, the learner explicitly saves a useful Gabroo reply.
2. In **My Vocabulary**, the learner selects that saved phrase and adds a word or expression with its Malayalam meaning and optional example.
3. New vocabulary is immediately eligible for review.
4. The learner attempts recall before revealing the meaning.
5. The learner chooses Again, Hard, Good or Easy. The choice schedules the next review.
6. The vocabulary list displays review count and next review date. Learners can independently change the Learning/Familiar/Mastered status or delete the vocabulary item.
7. A **Practise with Gabroo** action opens a Vocabulary-mode conversation with a suggested, editable first message containing the selected word, learner-entered Malayalam meaning and example. The learner chooses whether to send it.
8. The progress summary shows saved, Learning, Familiar and Mastered counts, total review attempts, words practised in the last seven days, due count and active items whose latest rating was Again. It is a personal activity summary, not a proficiency score.

Mastered items are excluded from the due queue. A learner can move an item out of Mastered to make it eligible again.

## Scheduling policy

This is a small, transparent, bounded interval scheduler, not a claim of clinical or pedagogical validation.

| Recall rating | First review interval | Subsequent behaviour |
|---|---:|---|
| Again | 0.01 day (about 14.4 minutes) | Decreases ease factor by 0.20, minimum 1.30 |
| Hard | 1 day | Uses 1.2 × previous interval, minimum 1 day; ease decreases by 0.15 |
| Good | 1 day | Second successful review: 3 days; later: previous interval × ease factor |
| Easy | 4 days | Later: previous interval × adjusted ease factor × 1.3; ease increases by 0.15 |

- Ease factor is bounded between 1.30 and 2.50.
- Review intervals are rounded to 0.001 day and capped at 365 days.
- A successful review records its timestamp, rating, count, interval and next due time.
- Updates are performed in a database transaction with a row lock to prevent simultaneous reviews overwriting one another.
- Due items are returned in due-time order, with a maximum of 50 per request.
- New items are due immediately; mastered items are excluded.
- The learner can review an item manually before its next due time.

## Privacy and ownership

- Every vocabulary item belongs to one authenticated learner.
- A source phrase must be a saved phrase owned by the same learner.
- List, review, edit and delete operations are scoped by learner ID.
- Deleting a source saved phrase cascades to vocabulary entries created from it.
- No conversation history, profile details or private memory is sent to an external vocabulary provider by this feature.
- Review history is scheduling metadata, not a public leaderboard or a measure of learner ability. The progress summary is derived only from the learner’s own vocabulary rows; “needs attention” means the latest recorded rating was Again, not a diagnosis of difficulty.

## API and persistence

- `GET /api/v1/gabroo/vocabulary` — list vocabulary and scheduling metadata.
- `GET /api/v1/gabroo/vocabulary/review-due` — list up to 50 due, non-mastered items.
- `GET /api/v1/gabroo/vocabulary/progress` — return learner-owned status counts and bounded review activity summary.
- `POST /api/v1/gabroo/vocabulary` — create from an owned saved phrase.
- `POST /api/v1/gabroo/vocabulary/:id/review` — submit a recall rating and calculate next due time.
- `PATCH /api/v1/gabroo/vocabulary/:id` — edit learner content or learning status.
- `DELETE /api/v1/gabroo/vocabulary/:id` — delete an item.

Migration `0023_gabroo_vocabulary.sql` creates learner-owned vocabulary. Migration `0024_gabroo_vocabulary_review_schedule.sql` adds review metadata and the due-queue index.

## Follow-up validation

Before calling the schedule pedagogically proven, run a learner pilot and evaluate:
- recall accuracy after Again/Hard/Good/Easy ratings;
- whether 14.4-minute retry is helpful rather than disruptive;
- daily review burden and overdue-item recovery;
- Malayalam meaning quality and regional language preferences;
- learner confidence and vocabulary retention over several weeks.

The scheduler should remain configurable if pilot evidence supports different intervals. Do not introduce push notifications or reminders until learners explicitly opt in and notification scheduling is implemented.
