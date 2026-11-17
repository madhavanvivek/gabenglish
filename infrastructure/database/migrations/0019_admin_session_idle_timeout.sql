-- Enforce an inactivity limit independently of browser-side timers.
ALTER TABLE admin_sessions
  ADD COLUMN last_seen_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN admin_sessions.last_seen_at IS 'Last successful authenticated admin API activity; sessions idle for 30 minutes are rejected.';
