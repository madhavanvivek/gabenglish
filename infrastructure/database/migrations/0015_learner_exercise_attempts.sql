-- Persist exercise attempts against the exact published lesson version.
CREATE TABLE learner_exercise_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
  lesson_version_id uuid NOT NULL REFERENCES lesson_versions(id) ON DELETE RESTRICT,
  learning_direction text NOT NULL CHECK (learning_direction IN ('ml_to_en','en_to_ml')),
  exercise_id text NOT NULL CHECK (length(exercise_id) BETWEEN 1 AND 64),
  response text NOT NULL CHECK (length(response) BETWEEN 1 AND 2000),
  is_correct boolean NOT NULL,
  feedback text,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX learner_exercise_attempts_user_lesson_idx
  ON learner_exercise_attempts(user_id,lesson_id,lesson_version_id,attempted_at DESC);
CREATE FUNCTION enforce_learner_exercise_attempt_direction()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE course_direction text; version_direction text; parent_course uuid;
BEGIN
  SELECT c.learning_direction,c.id INTO course_direction,parent_course
    FROM courses c JOIN modules m ON m.course_id=c.id JOIN lessons l ON l.module_id=m.id
    WHERE c.id=NEW.course_id AND l.id=NEW.lesson_id;
  SELECT learning_direction INTO version_direction FROM lesson_versions
    WHERE id=NEW.lesson_version_id AND lesson_id=NEW.lesson_id;
  IF course_direction IS NULL OR parent_course IS DISTINCT FROM NEW.course_id
    OR version_direction IS NULL OR course_direction<>NEW.learning_direction
    OR version_direction<>NEW.learning_direction THEN
    RAISE EXCEPTION 'Exercise attempt direction/course/version mismatch';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER learner_exercise_attempt_direction_guard
  BEFORE INSERT OR UPDATE ON learner_exercise_attempts
  FOR EACH ROW EXECUTE FUNCTION enforce_learner_exercise_attempt_direction();
