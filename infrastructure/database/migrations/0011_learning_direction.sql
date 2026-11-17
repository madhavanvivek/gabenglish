-- Persist the learner's course direction separately from their explanation language.
-- Existing learners remain on the original Malayalam-supported English journey.
ALTER TABLE user_preferences
  ADD COLUMN learning_direction text NOT NULL DEFAULT 'ml_to_en'
  CHECK (learning_direction IN ('ml_to_en','en_to_ml'));
