-- Store learner-owned vocabulary review schedules; content remains sourced from published lessons.
CREATE TABLE learner_vocabulary_reviews (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  learning_direction text NOT NULL CHECK (learning_direction IN ('ml_to_en','en_to_ml')),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  lesson_version_id uuid NOT NULL REFERENCES lesson_versions(id) ON DELETE CASCADE,
  vocabulary_item_id text NOT NULL CHECK (vocabulary_item_id ~ '^[a-zA-Z0-9_-]{1,64}$'),
  repetitions integer NOT NULL DEFAULT 0 CHECK (repetitions >= 0),
  interval_days integer NOT NULL DEFAULT 0 CHECK (interval_days >= 0),
  ease_factor numeric(4,2) NOT NULL DEFAULT 2.50 CHECK (ease_factor >= 1.30 AND ease_factor <= 4.00),
  due_at timestamptz NOT NULL DEFAULT now(),
  last_rating smallint NOT NULL DEFAULT 0 CHECK (last_rating BETWEEN 0 AND 5),
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, learning_direction, lesson_version_id, vocabulary_item_id)
);
CREATE INDEX learner_vocabulary_reviews_due_idx
  ON learner_vocabulary_reviews(user_id, learning_direction, due_at ASC);
