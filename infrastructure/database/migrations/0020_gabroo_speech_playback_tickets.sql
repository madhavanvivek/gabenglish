-- Opaque, short-lived, one-time tickets for native Gabroo audio playback.
-- The learner's speech text is stored server-side and never placed in a URL.
CREATE TABLE gabroo_speech_playback_tickets (
  token_digest char(64) PRIMARY KEY CHECK (token_digest ~ '^[0-9a-f]{64}$'),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  speech_text text NOT NULL CHECK (char_length(speech_text) BETWEEN 1 AND 4000),
  speech_speed numeric(3,2) NOT NULL CHECK (speech_speed BETWEEN 0.75 AND 1.50),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  CHECK (expires_at > created_at)
);

CREATE INDEX gabroo_speech_playback_tickets_expiry_idx
  ON gabroo_speech_playback_tickets(expires_at);

CREATE INDEX gabroo_speech_playback_tickets_user_idx
  ON gabroo_speech_playback_tickets(user_id, created_at DESC);

COMMENT ON TABLE gabroo_speech_playback_tickets IS
  'Short-lived, one-time opaque playback capabilities. Raw ticket tokens are never persisted; speech text is kept out of URLs.';
