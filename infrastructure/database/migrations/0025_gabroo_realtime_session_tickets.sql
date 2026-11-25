-- One-time, short-lived capabilities used to authenticate a future realtime
-- transport handshake without putting the learner's access token in a URL.
CREATE TABLE gabroo_realtime_session_tickets (
  token_digest char(64) PRIMARY KEY CHECK (token_digest ~ '^[0-9a-f]{64}$'),
  session_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  CHECK (expires_at > created_at)
);

-- Only one unconsumed ticket may exist for a learner at a time.
CREATE UNIQUE INDEX gabroo_realtime_session_tickets_one_unconsumed_per_user_idx
  ON gabroo_realtime_session_tickets(user_id)
  WHERE consumed_at IS NULL;

CREATE INDEX gabroo_realtime_session_tickets_expiry_idx
  ON gabroo_realtime_session_tickets(expires_at);

COMMENT ON TABLE gabroo_realtime_session_tickets IS
  'Short-lived, single-use realtime connection capabilities. Only SHA-256 ticket digests are stored; raw tickets are returned once to the authenticated learner.';
