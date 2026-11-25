CREATE TABLE gabroo_placement_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 idempotency_key uuid NOT NULL,
 assessment_version text NOT NULL,
 answers jsonb NOT NULL,
 result jsonb NOT NULL,
 completed_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,idempotency_key)
);
CREATE INDEX gabroo_placement_attempts_learner_recent_idx
 ON gabroo_placement_attempts(user_id,completed_at DESC);
COMMENT ON TABLE gabroo_placement_attempts IS 'Authenticated, versioned placement attempts with learner-scoped idempotency.';
