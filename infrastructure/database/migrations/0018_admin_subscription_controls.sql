-- Administrative authentication sessions and Superadmin subscription-offer controls.
-- Initial Superadmin accounts must be provisioned out-of-band; this migration creates no credentials.

INSERT INTO admin_roles(code,name) VALUES ('superadmin','Super Administrator') ON CONFLICT(code) DO NOTHING;

ALTER TABLE admin_accounts
  ADD COLUMN failed_login_attempts integer NOT NULL DEFAULT 0 CHECK (failed_login_attempts >= 0),
  ADD COLUMN locked_until timestamptz;

CREATE TABLE admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_account_id uuid NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_sessions_account_active_idx ON admin_sessions(admin_account_id,expires_at) WHERE revoked_at IS NULL;

COMMENT ON TABLE admin_sessions IS 'Revocable sessions for admin portal access; never shared with learner sessions.';
