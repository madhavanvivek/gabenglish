-- Durable, atomic Gabroo TTS character metering by India-local day and month.
-- Usage is reserved before contacting the provider; failed/cancelled requests remain charged
-- conservatively because the provider may already have processed/billed the text.
CREATE TABLE gabroo_speech_usage_buckets (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bucket_type text NOT NULL CHECK (bucket_type IN ('day','month')),
  bucket_start date NOT NULL,
  characters_used bigint NOT NULL DEFAULT 0 CHECK (characters_used >= 0),
  requests_count bigint NOT NULL DEFAULT 0 CHECK (requests_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bucket_type, bucket_start)
);

CREATE INDEX gabroo_speech_usage_bucket_start_idx
  ON gabroo_speech_usage_buckets(bucket_start);

COMMENT ON TABLE gabroo_speech_usage_buckets IS
  'Aggregated per-learner Google/provider-neutral Gabroo TTS character reservations. No speech text or audio is stored.';
