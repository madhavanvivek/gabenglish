-- Persist explicit curriculum skill evidence for explainable learner profiles.
ALTER TABLE learner_exercise_attempts
  ADD COLUMN skill_key text
  CHECK (skill_key IS NULL OR skill_key IN (
    'vocabulary','pronunciation','sentence_formation','grammar','listening',
    'speaking','fluency','comprehension','conversation','writing'
  ));

CREATE INDEX learner_exercise_attempts_skill_evidence_idx
  ON learner_exercise_attempts(user_id, learning_direction, skill_key, attempted_at DESC)
  WHERE skill_key IS NOT NULL;
