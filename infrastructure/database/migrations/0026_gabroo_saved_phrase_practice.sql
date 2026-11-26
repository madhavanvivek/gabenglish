-- Learner-confirmed practice history is separate from AI suggestions and assessment evidence.
CREATE TABLE gabroo_saved_phrase_practice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  memory_id uuid NOT NULL REFERENCES gabroo_learner_memory(id) ON DELETE CASCADE,
  self_rating text NOT NULL CHECK (self_rating IN ('easy','some_effort','need_more_practice')),
  learner_note text,
  practiced_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX gabroo_saved_phrase_practice_owner_memory_time_idx
  ON gabroo_saved_phrase_practice(user_id,memory_id,practiced_at DESC);
