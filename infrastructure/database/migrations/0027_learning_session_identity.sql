-- Give deliberate practice sessions an identity separate from request idempotency keys.
-- Nullable for backward compatibility with historical attempts and older clients.
ALTER TABLE learner_exercise_attempts
  ADD COLUMN IF NOT EXISTS learning_session_id uuid;

CREATE INDEX IF NOT EXISTS learner_exercise_attempts_learning_session_idx
  ON learner_exercise_attempts(user_id,lesson_version_id,learning_session_id,exercise_id,attempted_at DESC)
  WHERE learning_session_id IS NOT NULL;
