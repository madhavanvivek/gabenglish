-- Free diagnostic reports are account-owned and remain accessible without a paid subscription.
CREATE TABLE free_diagnostic_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  placement_session_id uuid NOT NULL UNIQUE,
  report jsonb NOT NULL,
  gabroo_explanation text NOT NULL,
  assessment_mode text NOT NULL CHECK (assessment_mode IN ('text','voice_transcript','mixed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX free_diagnostic_reports_user_created_idx
  ON free_diagnostic_reports(user_id, created_at DESC);
