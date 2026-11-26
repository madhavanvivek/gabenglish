-- Record explicit learner confirmation of a daily speaking practice session.
CREATE TABLE learner_daily_challenge_completions (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  learning_direction text NOT NULL CHECK (learning_direction IN ('ml_to_en','en_to_ml')),
  challenge_date date NOT NULL,
  challenge_title text NOT NULL CHECK (length(trim(challenge_title)) BETWEEN 1 AND 120),
  skill_key text CHECK (skill_key IS NULL OR skill_key IN ('vocabulary','pronunciation','sentence_formation','grammar','listening','speaking','fluency','comprehension','conversation','writing')),
  conversation_id uuid REFERENCES gabroo_conversations(id) ON DELETE SET NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, learning_direction, challenge_date)
);
CREATE INDEX learner_daily_challenge_completions_recent_idx
  ON learner_daily_challenge_completions(user_id, learning_direction, completed_at DESC);
