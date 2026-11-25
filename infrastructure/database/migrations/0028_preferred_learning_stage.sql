-- Store the learner's chosen starting stage separately from measured skill evidence.
-- A selected stage is a navigation preference, not an assessment result.
ALTER TABLE user_preferences
  ADD COLUMN preferred_learning_stage smallint
  CHECK (preferred_learning_stage BETWEEN 1 AND 5);

COMMENT ON COLUMN user_preferences.preferred_learning_stage IS
  'Learner-selected Gabenglish stage (1-5); never treat this preference as an assessed proficiency result.';
