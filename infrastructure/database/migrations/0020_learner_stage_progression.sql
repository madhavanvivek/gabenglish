-- Persist the learner's confirmed progression stage independently for each learning direction.
-- A default is not silently assigned: stage remains NULL until the learner chooses it
-- or a future validated assessment explicitly recommends one.
CREATE TABLE learner_learning_stages (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  learning_direction text NOT NULL CHECK (learning_direction IN ('ml_to_en','en_to_ml')),
  stage smallint NOT NULL CHECK (stage BETWEEN 1 AND 5),
  stage_source text NOT NULL CHECK (stage_source IN ('learner_selected','assessment_recommended','evidence_progression')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, learning_direction)
);

ALTER TABLE learner_exercise_attempts
  ADD COLUMN learner_stage smallint CHECK (learner_stage BETWEEN 1 AND 5);

CREATE INDEX learner_exercise_attempts_stage_evidence_idx
  ON learner_exercise_attempts(user_id, learning_direction, learner_stage, created_at DESC)
  WHERE learner_stage IS NOT NULL;

-- Freeze the learner's confirmed stage alongside direction for each Gabroo conversation.
ALTER TABLE gabroo_conversations
  ADD COLUMN learning_stage smallint CHECK (learning_stage BETWEEN 1 AND 5);
