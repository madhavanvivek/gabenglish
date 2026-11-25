/** UUID identities for deliberate practice sessions and replay-safe submissions. */
function createUuid(){
 return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,(token)=>{
  const value=Math.floor(Math.random()*16);
  return (token==="x"?value:(value&0x3)|0x8).toString(16);
 });
}

export function createLearningSessionId(){return createUuid();}
export function createExerciseSubmissionIdempotencyKey(){return createUuid();}

export function isLearningSessionId(value:string){
 return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
