-- Learner-owned vocabulary explicitly added from phrases they chose to save.
-- Meanings and examples are learner-confirmed input; no automatic conversation extraction.
CREATE TABLE gabroo_vocabulary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_saved_phrase_id uuid NOT NULL REFERENCES gabroo_learner_memory(id) ON DELETE CASCADE,
  term text NOT NULL CHECK (length(term) BETWEEN 1 AND 120),
  malayalam_meaning text NOT NULL CHECK (length(malayalam_meaning) BETWEEN 1 AND 300),
  example_sentence text NOT NULL DEFAULT '' CHECK (length(example_sentence) <= 500),
  learning_direction text NOT NULL DEFAULT 'ml_to_en' CHECK (learning_direction IN ('ml_to_en','en_to_ml')),
  status text NOT NULL DEFAULT 'learning' CHECK (status IN ('learning','familiar','mastered')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,source_saved_phrase_id,term),
);
CREATE INDEX gabroo_vocabulary_user_status_updated_idx
  ON gabroo_vocabulary(user_id,status,updated_at DESC);
