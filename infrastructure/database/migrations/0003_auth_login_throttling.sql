-- Database-backed authentication throttling without retaining raw email addresses or IPs.
CREATE TABLE auth_login_attempts (
  id bigserial PRIMARY KEY,
  email_digest char(64) NOT NULL,
  ip_digest char(64) NOT NULL,
  succeeded boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_login_attempts_email_time_idx ON auth_login_attempts(email_digest,attempted_at DESC);
CREATE INDEX auth_login_attempts_ip_time_idx ON auth_login_attempts(ip_digest,attempted_at DESC);
CREATE INDEX auth_login_attempts_cleanup_idx ON auth_login_attempts(attempted_at);
