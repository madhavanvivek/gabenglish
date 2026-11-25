import type {FastifyInstance} from "fastify";
import {z} from "zod";
import type {Pool} from "pg";
import type {AppConfig} from "./config.js";
import {authenticateLearner} from "./auth.js";
import {getActiveSubscriptionEntitlement} from "./subscriptions.js";

const datePattern=/^\d{4}-\d{2}-\d{2}$/;
const completionSchema=z.object({
 title:z.string().trim().min(1).max(120),
 skill_key:z.enum(["vocabulary","pronunciation","sentence_formation","grammar","listening","speaking","fluency","comprehension","conversation","writing"]).nullable().optional(),
 conversation_id:z.string().uuid().optional()
}).strict();
function failure(reply:any,requestId:string,status:number,code:string,message:string){
 return reply.code(status).send({error:{code,message,request_id:requestId}});
}
function validDate(value:string){
 if(!datePattern.test(value))return false;
 const parsed=new Date(value+"T00:00:00.000Z");
 return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
}
export async function registerDailyChallengeRoutes(app:FastifyInstance,pool:Pool,config:AppConfig){
 app.get("/api/v1/learning/daily-challenges/:date",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return failure(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in to view your practice history.");
  const entitlement=await getActiveSubscriptionEntitlement(pool,learner.id);
  if(!entitlement)return failure(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active Gabenglish subscription is required for daily speaking practice.");
  const date=(request.params as {date?:string}).date??"";
  if(!validDate(date))return failure(reply,request.id,400,"VALIDATION_ERROR","Please provide a valid challenge date.");
  const result=await pool.query(
   "SELECT challenge_date,learning_direction,challenge_title,skill_key,conversation_id,completed_at FROM learner_daily_challenge_completions WHERE user_id=$1 AND challenge_date=$2 AND learning_direction=COALESCE((SELECT learning_direction FROM user_preferences WHERE user_id=$1),'ml_to_en')",
   [learner.id,date]
  );
  return {completion:result.rows[0]??null};
 });
 app.post("/api/v1/learning/daily-challenges/:date/complete",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return failure(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in to save your practice completion.");
  const entitlement=await getActiveSubscriptionEntitlement(pool,learner.id);
  if(!entitlement)return failure(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active Gabenglish subscription is required for daily speaking practice.");
  const date=(request.params as {date?:string}).date??"";
  if(!validDate(date))return failure(reply,request.id,400,"VALIDATION_ERROR","Please provide a valid challenge date.");
  const parsed=completionSchema.safeParse(request.body);
  if(!parsed.success)return failure(reply,request.id,400,"VALIDATION_ERROR","Please provide a valid challenge title and skill.");
  if(parsed.data.conversation_id){
   const conversation=await pool.query("SELECT id FROM gabroo_conversations WHERE id=$1 AND user_id=$2",[parsed.data.conversation_id,learner.id]);
   if(!conversation.rows[0])return failure(reply,request.id,404,"CONVERSATION_NOT_FOUND","The linked Gabroo conversation was not found.");
  }
  const preferences=await pool.query<{learning_direction:"ml_to_en"|"en_to_ml"}>("SELECT learning_direction FROM user_preferences WHERE user_id=$1",[learner.id]);
  const direction=preferences.rows[0]?.learning_direction??"ml_to_en";
  const saved=await pool.query(
   `INSERT INTO learner_daily_challenge_completions(user_id,learning_direction,challenge_date,challenge_title,skill_key,conversation_id)
    VALUES($1,$2,$3,$4,$5,$6)
    ON CONFLICT(user_id,learning_direction,challenge_date) DO UPDATE SET
     challenge_title=EXCLUDED.challenge_title,skill_key=EXCLUDED.skill_key,
     conversation_id=COALESCE(EXCLUDED.conversation_id,learner_daily_challenge_completions.conversation_id),
     completed_at=now()
    RETURNING challenge_date,learning_direction,challenge_title,skill_key,conversation_id,completed_at`,
   [learner.id,direction,date,parsed.data.title,parsed.data.skill_key??null,parsed.data.conversation_id??null]
  );
  return reply.code(201).send({completion:saved.rows[0]});
 });
}
