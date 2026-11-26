export type StoredExerciseSubmission={
 lesson_id:string;lesson_version_id:string;exercise_id:string;response:string;
};
export type RequestedExerciseSubmission={
 lessonId:string;lessonVersionId:string;exerciseId:string;response:string;
};

/** A retry key is reusable only for the exact learner-scoped submission payload. */
export function isSameExerciseSubmission(stored:StoredExerciseSubmission,requested:RequestedExerciseSubmission):boolean{
 return stored.lesson_id===requested.lessonId
  &&stored.lesson_version_id===requested.lessonVersionId
  &&stored.exercise_id===requested.exerciseId
  &&stored.response===requested.response;
}
