-- Vocabulary review context is opt-in per Gabroo conversation.
ALTER TABLE gabroo_conversations
  ADD COLUMN include_vocabulary_support boolean NOT NULL DEFAULT false;
