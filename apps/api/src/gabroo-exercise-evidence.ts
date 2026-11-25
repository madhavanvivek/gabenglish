/** Stable task identity prevents repeated submissions of one exercise from inflating evidence. */
export function buildLessonExerciseEvidenceTaskId(input:{
 lessonVersionId:string;
 exerciseId:string;
 learningSessionId?:string;
}):string{
 return input.learningSessionId
  ? "lesson-exercise-session:"+input.learningSessionId+":"+input.exerciseId
  : "lesson-exercise:"+input.lessonVersionId+":"+input.exerciseId;
}
