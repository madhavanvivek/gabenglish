-- Make published lesson exercise attempts replay-safe without changing legacy rows.
ALTER TABLE learner_exercise_attempts
 ADD COLUMN IF NOT EXISTS idempotency_key uuid;
CREATE UNIQUE INDEX IF NOT EXISTS learner_exercise_attempts_idempotency_idx
 ON learner_exercise_attempts(user_id,lesson_version_id,exercise_id,idempotency_key)
 WHERE idempotency_key IS NOT NULL;

-- Distinguish lesson-task evidence from the placement pilot.
ALTER TABLE gabroo_skill_evidence
 DROP CONSTRAINT IF EXISTS gabroo_skill_evidence_source_check;
ALTER TABLE gabroo_skill_evidence
 ADD CONSTRAINT gabroo_skill_evidence_source_check
 CHECK (source IN ('placement_assessment','lesson_exercise','conversation','learner_review','human_review'));
