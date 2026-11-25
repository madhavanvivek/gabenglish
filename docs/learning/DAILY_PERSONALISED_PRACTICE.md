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

The Malayalam-learning direction needs its own educator-reviewed Malayalam prompt bank before this feature should be offered for that direction.
