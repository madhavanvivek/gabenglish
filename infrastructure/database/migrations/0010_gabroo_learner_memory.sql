-- Compact, learner-controlled private memory for Gabroo.
-- Only facts explicitly saved by the learner or explicitly confirmed by them are eligible.
CREATE TABLE gabroo_learner_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('goal','interest','saved_phrase','learning_note')),
  memory_key text NOT NULL CHECK (length(memory_key) BETWEEN 1 AND 80),
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 500),
  source text NOT NULL DEFAULT 'learner_saved' CHECK (source IN ('learner_saved','learner_confirmed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,category,memory_key)
);
CREATE INDEX gabroo_learner_memory_user_updated_idx
  ON gabroo_learner_memory(user_id,updated_at DESC);
