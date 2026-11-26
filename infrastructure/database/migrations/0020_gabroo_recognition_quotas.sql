-- Learner-scoped rolling-window quota for paid Gabroo speech recognition.
-- The quota is shared across API instances and stores counters only, never audio or transcript data.
CREATE TABLE gabroo_recognition_quotas (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE gabroo_recognition_quotas IS
  'Rolling one-hour Gabroo speech-recognition request counters per learner; contains no audio or transcript content.';
