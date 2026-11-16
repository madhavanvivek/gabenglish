-- Short-lived anonymous Gabroo placement sessions.
-- Answers are retained only for the active assessment window and purged on expiry.
CREATE TABLE placement_sessions (
  id uuid PRIMARY KEY,
  state jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX placement_sessions_expiry_idx ON placement_sessions(expires_at);
