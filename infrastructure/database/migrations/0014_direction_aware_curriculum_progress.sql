-- Direction-aware curriculum and learner progress foundation.
-- Existing English courses are backfilled as ml_to_en; no content is published.
ALTER TABLE courses
  ADD COLUMN learning_direction text NOT NULL DEFAULT 'ml_to_en'
    CHECK (learning_direction IN ('ml_to_en','en_to_ml')),
  ADD COLUMN source_language text NOT NULL DEFAULT 'ml'
    CHECK (source_language IN ('ml','en')),
  ADD COLUMN target_language text NOT NULL DEFAULT 'en'
    CHECK (target_language IN ('ml','en')),
  ADD COLUMN support_language text NOT NULL DEFAULT 'ml'
    CHECK (support_language IN ('ml','en')),
  ADD CONSTRAINT courses_direction_language_check CHECK (
    (learning_direction='ml_to_en' AND source_language='ml' AND target_language='en')
    OR
    (learning_direction='en_to_ml' AND source_language='en' AND target_language='ml')
  );

CREATE INDEX courses_direction_status_sort_idx
  ON courses(learning_direction,status,sort_order);

-- Editorial metadata is versioned with each lesson so a content revision
-- cannot silently overwrite the learner's historical progress.
ALTER TABLE lesson_versions
  ADD COLUMN learning_direction text NOT NULL DEFAULT 'ml_to_en'
    CHECK (learning_direction IN ('ml_to_en','en_to_ml')),
  ADD COLUMN source_language text NOT NULL DEFAULT 'ml'
    CHECK (source_language IN ('ml','en')),
  ADD COLUMN target_language text NOT NULL DEFAULT 'en'
    CHECK (target_language IN ('ml','en')),
  ADD COLUMN script_mode text NOT NULL DEFAULT 'not_applicable'
    CHECK (script_mode IN ('not_applicable','native_script','native_with_optional_romanisation')),
  ADD COLUMN register text,
  ADD COLUMN dialect_scope text,
  ADD COLUMN romanisation text,
  ADD COLUMN educator_review_status text NOT NULL DEFAULT 'not_reviewed'
    CHECK (educator_review_status IN ('not_reviewed','in_review','approved','rejected')),
  ADD COLUMN educator_reviewed_by text,
  ADD COLUMN educator_reviewed_at timestamptz,
  ADD CONSTRAINT lesson_versions_direction_language_check CHECK (
    (learning_direction='ml_to_en' AND source_language='ml' AND target_language='en')
    OR
    (learning_direction='en_to_ml' AND source_language='en' AND target_language='ml')
  ),
  ADD CONSTRAINT lesson_versions_review_metadata_check CHECK (
    (educator_review_status='approved' AND educator_reviewed_by IS NOT NULL AND educator_reviewed_at IS NOT NULL)
    OR educator_review_status<>'approved'
  );

-- New direction-scoped progress records. This deliberately avoids mutating
-- legacy lesson_progress rows and keeps each course/version history distinct.
CREATE TABLE learner_course_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  learning_direction text NOT NULL CHECK (learning_direction IN ('ml_to_en','en_to_ml')),
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','in_progress','completed')),
  progress_percent numeric(5,2) NOT NULL DEFAULT 0
    CHECK (progress_percent BETWEEN 0 AND 100),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,course_id,learning_direction)
);
CREATE INDEX learner_course_progress_user_direction_idx
  ON learner_course_progress(user_id,learning_direction,updated_at DESC);

CREATE TABLE learner_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
  lesson_version_id uuid NOT NULL REFERENCES lesson_versions(id) ON DELETE RESTRICT,
  learning_direction text NOT NULL CHECK (learning_direction IN ('ml_to_en','en_to_ml')),
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','in_progress','completed')),
  progress_percent numeric(5,2) NOT NULL DEFAULT 0
    CHECK (progress_percent BETWEEN 0 AND 100),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,lesson_id,lesson_version_id,learning_direction)
);
CREATE INDEX learner_lesson_progress_user_direction_idx
  ON learner_lesson_progress(user_id,learning_direction,updated_at DESC);

-- Database-level consistency: progress direction must match its course and
-- lesson version. A trigger prevents cross-direction progress contamination.
CREATE FUNCTION enforce_learner_lesson_progress_direction()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE course_direction text; version_direction text; lesson_module_course uuid;
BEGIN
  SELECT c.learning_direction, m.course_id
    INTO course_direction, lesson_module_course
    FROM courses c JOIN modules m ON m.course_id=c.id
    JOIN lessons l ON l.module_id=m.id
    WHERE c.id=NEW.course_id AND l.id=NEW.lesson_id;
  SELECT learning_direction INTO version_direction
    FROM lesson_versions WHERE id=NEW.lesson_version_id AND lesson_id=NEW.lesson_id;
  IF course_direction IS NULL OR lesson_module_course IS DISTINCT FROM NEW.course_id
     OR version_direction IS NULL OR course_direction<>NEW.learning_direction
     OR version_direction<>NEW.learning_direction THEN
    RAISE EXCEPTION 'Learner lesson progress direction/course/version mismatch';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER learner_lesson_progress_direction_guard
  BEFORE INSERT OR UPDATE
  ON learner_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION enforce_learner_lesson_progress_direction();

CREATE FUNCTION enforce_learner_course_progress_direction()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE course_direction text;
BEGIN
  SELECT learning_direction INTO course_direction FROM courses WHERE id=NEW.course_id;
  IF course_direction IS NULL OR course_direction<>NEW.learning_direction THEN
    RAISE EXCEPTION 'Learner course progress direction mismatch';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER learner_course_progress_direction_guard
  BEFORE INSERT OR UPDATE
  ON learner_course_progress
  FOR EACH ROW EXECUTE FUNCTION enforce_learner_course_progress_direction();
