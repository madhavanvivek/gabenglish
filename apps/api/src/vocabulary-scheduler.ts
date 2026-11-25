export type RecallRating=0|1|2|3|4|5;
export type ReviewSchedule={repetitions:number;intervalDays:number;easeFactor:number;dueAt:Date;lastRating:RecallRating};
export function scheduleVocabularyReview(current:Pick<ReviewSchedule,"repetitions"|"intervalDays"|"easeFactor">,rating:RecallRating,reviewedAt:Date):ReviewSchedule{
 if(!Number.isInteger(rating)||rating<0||rating>5)throw new Error("Recall rating must be an integer from 0 to 5.");
 if(!Number.isFinite(reviewedAt.getTime()))throw new Error("Review timestamp must be a valid date.");
 const ease=Math.max(1.3,current.easeFactor+(0.1-(5-rating)*(0.08+(5-rating)*0.02)));
 let repetitions:number,intervalDays:number;
 if(rating<3){repetitions=0;intervalDays=1;}
 else{
  repetitions=current.repetitions+1;
  intervalDays=repetitions===1?1:repetitions===2?3:Math.max(1,Math.round(current.intervalDays*ease));
 }
 return {repetitions,intervalDays,easeFactor:Number(ease.toFixed(2)),dueAt:new Date(reviewedAt.getTime()+intervalDays*86400000),lastRating:rating};
}
export function initialVocabularyReview(reviewedAt:Date=new Date()):ReviewSchedule{
 return {repetitions:0,intervalDays:0,easeFactor:2.5,dueAt:new Date(reviewedAt),lastRating:0};
}
