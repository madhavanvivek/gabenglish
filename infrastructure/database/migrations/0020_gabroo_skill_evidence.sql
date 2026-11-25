-- Persist provenance-backed learner skill observations for GLIM.
CREATE TABLE gabroo_skill_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill text NOT NULL CHECK (skill IN ('grammar','vocabulary','pronunciation','fluency','comprehension','confidence')),
  score numeric(4,3) NOT NULL CHECK (score >= 0 AND score <= 1),
  confidence numeric(4,3) NOT NULL CHECK (confidence > 0 AND confidence <= 1),
  source text NOT NULL CHECK (source IN ('placement_assessment','conversation','learner_review','human_review')),
  task_id text NOT NULL CHECK (length(btrim(task_id)) BETWEEN 1 AND 160),
  observed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,skill,source,task_id)
);
CREATE INDEX gabroo_skill_evidence_learner_skill_idx
  ON gabroo_skill_evidence(user_id,skill,observed_at DESC);
CREATE INDEX gabroo_skill_evidence_learner_recent_idx
  ON gabroo_skill_evidence(user_id,observed_at DESC);

COMMENT ON TABLE gabroo_skill_evidence IS 'Task-linked, learner-owned evidence used by GLIM; not a direct proficiency label.';
COMMENT ON COLUMN gabroo_skill_evidence.confidence IS 'Reliability of the observation, not the learner ability score.';
