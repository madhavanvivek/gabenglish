-- Tag free diagnostic evidence with the course direction it actually assesses.
-- The current conversation assessment measures English only; legacy reports remain ml_to_en.
ALTER TABLE free_diagnostic_reports
  ADD COLUMN learning_direction text NOT NULL DEFAULT 'ml_to_en'
    CHECK (learning_direction IN ('ml_to_en','en_to_ml')),
  ADD COLUMN target_language text NOT NULL DEFAULT 'en'
    CHECK (target_language IN ('ml','en'));

ALTER TABLE free_diagnostic_reports
  ADD CONSTRAINT free_diagnostic_direction_target_check
  CHECK ((learning_direction = 'ml_to_en' AND target_language = 'en')
      OR (learning_direction = 'en_to_ml' AND target_language = 'ml'));

CREATE INDEX free_diagnostic_reports_user_direction_created_idx
  ON free_diagnostic_reports(user_id, learning_direction, created_at DESC);
