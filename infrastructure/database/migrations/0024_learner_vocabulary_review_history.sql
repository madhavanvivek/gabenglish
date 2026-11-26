-- Preserve each learner recall event separately from the mutable next-review schedule.
CREATE TABLE learner_vocabulary_review_history (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  learning_direction text NOT NULL CHECK (learning_direction IN ('ml_to_en','en_to_ml')),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  lesson_version_id uuid NOT NULL REFERENCES lesson_versions(id) ON DELETE CASCADE,
  vocabulary_item_id text NOT NULL CHECK (vocabulary_item_id ~ '^[a-zA-Z0-9_-]{1,64}$'),
  rating smallint NOT NULL CHECK (rating BETWEEN 0 AND 5),
  repetitions integer NOT NULL CHECK (repetitions >= 0),
  interval_days integer NOT NULL CHECK (interval_days >= 0),
  ease_factor numeric(4,2) NOT NULL CHECK (ease_factor >= 1.30 AND ease_factor <= 4.00),
  due_at timestamptz NOT NULL,
  reviewed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX learner_vocabulary_review_history_recent_idx
  ON learner_vocabulary_review_history(user_id, learning_direction, reviewed_at DESC, id DESC);

CREATE FUNCTION record_learner_vocabulary_review_event()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.last_reviewed_at IS DISTINCT FROM OLD.last_reviewed_at THEN
    INSERT INTO learner_vocabulary_review_history(
      user_id, learning_direction, lesson_id, lesson_version_id, vocabulary_item_id,
      rating, repetitions, interval_days, ease_factor, due_at, reviewed_at
    ) VALUES (
      NEW.user_id, NEW.learning_direction, NEW.lesson_id, NEW.lesson_version_id, NEW.vocabulary_item_id,
      NEW.last_rating, NEW.repetitions, NEW.interval_days, NEW.ease_factor, NEW.due_at,
      COALESCE(NEW.last_reviewed_at, now())
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER learner_vocabulary_review_history_capture
AFTER INSERT OR UPDATE ON learner_vocabulary_reviews
FOR EACH ROW EXECUTE FUNCTION record_learner_vocabulary_review_event();
