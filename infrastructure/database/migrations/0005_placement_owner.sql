-- Bind every new placement conversation to a verified learner account.
ALTER TABLE placement_sessions
  ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX placement_sessions_user_created_idx ON placement_sessions(user_id, created_at DESC);
