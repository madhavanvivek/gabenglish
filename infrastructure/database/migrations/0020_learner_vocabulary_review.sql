-- Learner-owned vocabulary and spaced-review scheduling.
CREATE TABLE learner_vocabulary_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  learning_direction text NOT NULL CHECK (learning_direction IN ('ml_to_en','en_to_ml')),
  source_term text NOT NULL CHECK (length(btrim(source_term)) BETWEEN 1 AND 160),
  target_term text NOT NULL CHECK (length(btrim(target_term)) BETWEEN 1 AND 240),
  example text CHECK (example IS NULL OR length(example)<=500),
  source_lesson_id uuid REFERENCES lessons(id) ON DELETE SET NULL,
  source_lesson_version_id uuid REFERENCES lesson_versions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  due_at timestamptz NOT NULL DEFAULT now(),
  interval_days integer NOT NULL DEFAULT 0 CHECK (interval_days>=0),
  ease_factor numeric(3,2) NOT NULL DEFAULT 2.50 CHECK (ease_factor BETWEEN 1.30 AND 3.00),
  repetitions integer NOT NULL DEFAULT 0 CHECK (repetitions>=0),
  lapses integer NOT NULL DEFAULT 0 CHECK (lapses>=0),
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,learning_direction,source_term,target_term)
);
CREATE INDEX learner_vocabulary_due_idx
  ON learner_vocabulary_items(user_id,learning_direction,due_at,id)
  WHERE status='active';
CREATE INDEX learner_vocabulary_recent_idx
  ON learner_vocabulary_items(user_id,learning_direction,updated_at DESC);

CREATE TABLE learner_vocabulary_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vocabulary_item_id uuid NOT NULL REFERENCES learner_vocabulary_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating text NOT NULL CHECK (rating IN ('again','hard','good','easy')),
  previous_interval_days integer NOT NULL CHECK (previous_interval_days>=0),
  next_interval_days integer NOT NULL CHECK (next_interval_days>=0),
  reviewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX learner_vocabulary_reviews_owner_idx
  ON learner_vocabulary_reviews(user_id,reviewed_at DESC);
