-- Client-generated idempotency key lets a learner safely retry after an ambiguous network failure.
-- Existing historical attempts remain valid with NULL submission_id.
ALTER TABLE learner_exercise_attempts
  ADD COLUMN submission_id uuid;
CREATE UNIQUE INDEX learner_exercise_attempts_user_submission_uidx
  ON learner_exercise_attempts(user_id,submission_id)
  WHERE submission_id IS NOT NULL;
