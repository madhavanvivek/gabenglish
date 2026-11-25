-- Scheduling metadata for learner-controlled vocabulary revision.
ALTER TABLE gabroo_vocabulary
  ADD COLUMN review_due_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN last_reviewed_at timestamptz,
  ADD COLUMN review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  ADD COLUMN interval_days numeric(8,3) NOT NULL DEFAULT 0 CHECK (interval_days >= 0),
  ADD COLUMN ease_factor numeric(4,2) NOT NULL DEFAULT 2.50 CHECK (ease_factor BETWEEN 1.30 AND 2.50),
  ADD COLUMN last_review_rating text CHECK (last_review_rating IN ('again','hard','good','easy'));
CREATE INDEX gabroo_vocabulary_due_idx
  ON gabroo_vocabulary(user_id,review_due_at)
  WHERE status <> 'mastered';
