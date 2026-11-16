-- Persistent, learner-owned Gabroo text conversations.
-- No provider prompts, hidden reasoning, or provider secrets are stored here.

CREATE TABLE gabroo_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text,
  mode text NOT NULL DEFAULT 'gentle_correction'
    CHECK (mode IN ('free_flow','gentle_correction','detailed_correction','topic_practice','role_play','vocabulary_building','confidence_practice')),
  support_language text NOT NULL DEFAULT 'ml' CHECK (support_language IN ('ml','en')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  turn_count integer NOT NULL DEFAULT 0 CHECK (turn_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  CHECK (title IS NULL OR length(title) <= 120),
  CHECK ((status = 'open' AND closed_at IS NULL) OR (status = 'closed' AND closed_at IS NOT NULL))
);
CREATE INDEX gabroo_conversations_user_updated_idx
  ON gabroo_conversations(user_id, updated_at DESC);

CREATE TABLE gabroo_conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES gabroo_conversations(id) ON DELETE CASCADE,
  sequence_number integer NOT NULL CHECK (sequence_number > 0),
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 12000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, sequence_number)
);
CREATE INDEX gabroo_conversation_messages_history_idx
  ON gabroo_conversation_messages(conversation_id, sequence_number);
