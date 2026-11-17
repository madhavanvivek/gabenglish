-- Freeze each Gabroo conversation to the learner's course direction at creation.
-- Existing conversations retain the original Malayalam-supported English course.
ALTER TABLE gabroo_conversations
  ADD COLUMN learning_direction text NOT NULL DEFAULT 'ml_to_en'
    CHECK (learning_direction IN ('ml_to_en','en_to_ml')),
  ADD COLUMN target_language text NOT NULL DEFAULT 'en'
    CHECK (target_language IN ('ml','en'));

ALTER TABLE gabroo_conversations
  ADD CONSTRAINT gabroo_conversation_direction_target_check
  CHECK ((learning_direction = 'ml_to_en' AND target_language = 'en')
      OR (learning_direction = 'en_to_ml' AND target_language = 'ml'));
