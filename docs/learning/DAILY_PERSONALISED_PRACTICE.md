# Daily personalised speaking practice

The learner Home screen presents one deterministic speaking challenge for the learner device's local calendar date. The challenge is stable for that date and rotates on the next date.

## Selection rules

- The challenge helper only uses exercise skill areas with at least the API's evidence threshold and a status of `practice_opportunity` or `developing_exercise_performance`.
- When multiple skill areas qualify, it selects the lowest recorded exercise accuracy. Ties prefer the area with more attempts.
- It never treats insufficient evidence or strong exercise performance as a weakness.
- If no skill area qualifies, it selects from a general everyday speaking prompt bank.
- Prompts are authored templates, not AI-generated diagnoses. A challenge is a practice suggestion, not a proficiency score.

## Starting a challenge

The learner explicitly taps **Start today's challenge with Gabroo**. The app opens a topic-practice conversation with the challenge title and sends the prompt as the first learner turn. Gabroo then responds using the existing conversation provider, stage-aware teaching policy and learner context.

If the conversation service is unavailable, the existing API error is shown; the app does not claim the practice started.

## Privacy and evidence

Challenge selection is computed on-device from the learner's already retrieved, account-scoped insights. No additional learner profile or challenge completion data is stored. Existing conversation persistence applies once the learner starts the challenge. Raw voice audio remains subject to the separate consent and transient-capture policy.

## Completion history

The learner must explicitly choose **Mark challenge complete** after Gabroo has replied in the challenge conversation. Completion is stored against the learner, current learning direction and local challenge date, with the challenge title, optional skill key and linked Gabroo conversation. Repeated submissions for the same learner/date/direction update the same record rather than creating duplicate completions.

- GET `/api/v1/learning/daily-challenges/:date` returns the current-direction completion state.
- POST `/api/v1/learning/daily-challenges/:date/complete` records the learner-confirmed completion.
- Both endpoints require a verified account and active subscription.
- The linked conversation must belong to the authenticated learner.
- Completion is an explicit self-report of practice finished; it is not an automatic judgement of speaking quality, accuracy or proficiency.
- The Home screen displays the saved completion state for the current local date.

## Current scope

- English speaking prompts for the Malayalam-to-English learning journey.
- Stable daily rotation by the learner's local calendar date.
- Skill-specific prompts for sentence formation, grammar, vocabulary, fluency, pronunciation, listening, speaking, comprehension and writing.
- General prompts when evidence is unavailable.
- Each supported skill bank has multiple authored prompts and rotates them by local calendar date, reducing repetitive daily practice for the same evidence-backed focus. The rotation is a content variety mechanism, not a spaced-repetition or mastery signal.

The Malayalam-learning direction needs its own educator-reviewed Malayalam prompt bank before this feature should be offered for that direction.

## Progress history

- GET `/api/v1/learning/daily-challenges?limit=14` returns the learner's most recent completed challenge records for the selected learning direction.
- The endpoint is verified-account and active-subscription gated, accepts a limit from 1 to 30, and returns both the number of records in the response and the learner's total completion count.
- The history is ordered by the learner's stored calendar dates and does not calculate a streak from server-local or UTC dates.
- The Progress screen presents saved challenge titles, dates and optional skill focus. It labels these as learner-confirmed practice records, not proof of improvement or speaking proficiency.

## Learner-saved phrase challenges

- When the learner has explicitly saved one or more `saved_phrase` entries in Speaking Journal, the Home screen can select one deterministically for that day's optional challenge.
- The app reads only the learner's own saved journal entries. It extracts the explicitly learner-entered `Learner phrase:` line and, when present, the learner-approved `Practice version:` line.
- If a practice version exists, the challenge uses that version as the practice target while showing the original phrase as context. It reminds the learner to preserve the original intended meaning and invites discussion of alternative wording when needed.
- If no practice version exists, the original learner-saved phrase remains the target. The app does not treat an AI suggestion as approved unless the learner explicitly saved it as the practice version.
- The prompt does not grade the phrase, assign a skill score, or treat challenge completion as evidence of improvement.
- If no usable phrase exists, the existing exercise-evidence/general challenge selection remains unchanged.
- Phrase selection is local to the Home screen and is not copied into a new server record; the daily completion record still stores only the challenge title, skill focus and optional conversation reference.
- Before rotating, the app normalises and deduplicates the learner's saved phrase entries, sorts them by their phrase content, and then selects by the learner's local calendar date. This keeps a day's selection stable if the journal API returns the same entries in a different order, and prevents duplicate journal entries from taking extra turns in the rotation. The selection remains deterministic rather than a claim that the learner has mastered or needs spaced repetition for a phrase.

## Unified learner practice queue

The mobile `/practice-queue` screen brings existing learner-owned practice sources into one view:
- Current due/first-review vocabulary from the Word Garden queue.
- Original phrases explicitly saved in the Speaking Journal.
- The weakest skill area with sufficient tagged exercise evidence, when available.
- Recent learner-confirmed daily challenge completions.

The screen loads each source independently. A temporary failure in one source does not hide the other available practice items. Actions open the existing vocabulary, journal, progress and Gabroo experiences; this screen does not create a second copy of learner data.

The suggested skill is based only on exercise attempts. Saved phrases are learner-selected content. Completed challenges remain self-reported practice records. None of these signals is presented as an overall proficiency or speaking score.


## Practice Queue phrase presentation refinement (25 Nov 2026)

- The unified Practice Queue now displays an explicitly learner-approved `Practice version:` as the primary phrase, with the learner's original phrase shown beneath it for context.
- Journal entries without a practice version continue to display the original saved phrase. Older entries without a structured original phrase fall back to their learner-owned memory key.
- The Home daily challenge and Practice Queue share the same phrase parser, so phrase extraction and the 180-character display bound remain consistent.
- Added parser tests for original/practice-version pairs, legacy memory-key fallback and phrase-length bounds.
- The queue remains read-only for journal content; edits and deletion continue through Speaking Journal. No duplicate phrase records or automatic AI approvals are created.
