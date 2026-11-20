export type GabrooReviewRating="again"|"hard"|"good"|"easy";
export type GabrooReviewSchedule={intervalDays:number;easeFactor:number;reviewCount:number;dueAt:Date};

/**
 * A deliberately transparent, bounded interval schedule.
 * "Again" returns quickly; Hard/Good/Easy progressively lengthen recall intervals.
 */
export function calculateGabrooReviewSchedule(input:{
 rating:GabrooReviewRating;
 intervalDays:number;
 easeFactor:number;
 reviewCount:number;
 now?:Date;
}):GabrooReviewSchedule{
 const now=input.now??new Date();
 const ease=Math.min(2.5,Math.max(1.3,input.easeFactor));
 let nextEase=ease;
 let interval:number;
 switch(input.rating){
  case "again":
   nextEase=Math.max(1.3,ease-0.2);
   interval=0.01;
   break;
  case "hard":
   nextEase=Math.max(1.3,ease-0.15);
   interval=input.reviewCount===0?1:Math.max(1,input.intervalDays*1.2);
   break;
  case "good":
   interval=input.reviewCount===0?1:input.reviewCount===1?3:Math.max(1,input.intervalDays*ease);
   break;
  case "easy":
   nextEase=Math.min(2.5,ease+0.15);
   interval=input.reviewCount===0?4:Math.max(2,input.intervalDays*nextEase*1.3);
   break;
 }
 interval=Math.min(365,Math.round(interval*1000)/1000);
 return {intervalDays:interval,easeFactor:Math.round(nextEase*100)/100,reviewCount:input.reviewCount+1,dueAt:new Date(now.getTime()+interval*86_400_000)};
}
