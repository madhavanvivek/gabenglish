export type RecallRating=0|1|2|3|4|5;
export type ReviewSchedule={repetitions:number;intervalDays:number;easeFactor:number;dueAt:Date;lastRating:RecallRating};

function validateScheduleState(current:Pick<ReviewSchedule,"repetitions"|"intervalDays"|"easeFactor">){
 if(!Number.isSafeInteger(current.repetitions)||current.repetitions<0)throw new Error("Review repetitions must be a non-negative safe integer.");
 if(!Number.isSafeInteger(current.intervalDays)||current.intervalDays<0)throw new Error("Review interval must be a non-negative safe integer.");
 if(!Number.isFinite(current.easeFactor)||current.easeFactor<1.3||current.easeFactor>4)throw new Error("Review ease factor must be between 1.3 and 4.");
}
function validDate(value:Date){
 return value instanceof Date&&Number.isFinite(value.getTime());
}

export function scheduleVocabularyReview(current:Pick<ReviewSchedule,"repetitions"|"intervalDays"|"easeFactor">,rating:RecallRating,reviewedAt:Date):ReviewSchedule{
 if(!Number.isInteger(rating)||rating<0||rating>5)throw new Error("Recall rating must be an integer from 0 to 5.");
 if(!validDate(reviewedAt))throw new Error("Review timestamp must be a valid date.");
 validateScheduleState(current);
 const ease=Math.min(4,Math.max(1.3,current.easeFactor+(0.1-(5-rating)*(0.08+(5-rating)*0.02))));
 let repetitions:number,intervalDays:number;
 if(rating<3){repetitions=0;intervalDays=1;}
 else{
  repetitions=current.repetitions+1;
  intervalDays=repetitions===1?1:repetitions===2?3:Math.max(1,Math.round(current.intervalDays*ease));
 }
 if(!Number.isSafeInteger(repetitions)||!Number.isSafeInteger(intervalDays))throw new Error("Calculated review schedule is outside the supported range.");
 const dueAt=new Date(reviewedAt.getTime()+intervalDays*86400000);
 if(!validDate(dueAt))throw new Error("Calculated review date is outside the supported date range.");
 return {repetitions,intervalDays,easeFactor:Number(ease.toFixed(2)),dueAt,lastRating:rating};
}
export function initialVocabularyReview(reviewedAt:Date=new Date()):ReviewSchedule{
 if(!validDate(reviewedAt))throw new Error("Review timestamp must be a valid date.");
 return {repetitions:0,intervalDays:0,easeFactor:2.5,dueAt:new Date(reviewedAt),lastRating:0};
}
