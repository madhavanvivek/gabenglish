import type {FastifyInstance} from "fastify";
import {z} from "zod";
import type {Pool} from "pg";
import type {AppConfig} from "./config.js";
import {authenticateLearner} from "./auth.js";
import {getActiveSubscriptionEntitlement} from "./subscriptions.js";

const directionSchema=z.enum(["ml_to_en","en_to_ml"]);
const createSchema=z.object({
 source_term:z.string().trim().min(1).max(160),
 target_term:z.string().trim().min(1).max(240),
 example:z.string().trim().max(500).optional(),
 lesson_id:z.string().uuid().optional()
}).strict();
const reviewSchema=z.object({rating:z.enum(["again","hard","good","easy"])}).strict();
const idSchema=z.string().uuid();
function fail(reply:any,requestId:string,status:number,code:string,message:string){
 return reply.code(status).send({error:{code,message,request_id:requestId}});
}
async function learnerContext(request:any,reply:any,pool:Pool,config:AppConfig){
 const learner=await authenticateLearner(request,pool,config);
 if(!learner){fail(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account.");return;}
 if(!await getActiveSubscriptionEntitlement(pool,learner.id)){fail(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active subscription is required to save and review vocabulary.");return;}
 const preference=await pool.query<{learning_direction:"ml_to_en"|"en_to_ml"}>(
  "SELECT learning_direction FROM user_preferences WHERE user_id=$1",[learner.id]
 );
 return {learner,direction:preference.rows[0]?.learning_direction??"ml_to_en" as const};
}
export async function registerVocabularyRoutes(app:FastifyInstance,pool:Pool,config:AppConfig){
 app.get("/api/v1/vocabulary/review",async(request,reply)=>{
  const context=await learnerContext(request,reply,pool,config);if(!context)return;
  const raw=(request.query as {limit?:string}).limit;
  const limit=raw===undefined?20:Number(raw);
  if(!Number.isInteger(limit)||limit<1||limit>100)return fail(reply,request.id,400,"VALIDATION_ERROR","Limit must be a whole number from 1 to 100.");
  const rows=await pool.query(
   `SELECT id,learning_direction,source_term,target_term,example,source_lesson_id,
     due_at,interval_days,ease_factor,repetitions,lapses,last_reviewed_at,created_at
    FROM learner_vocabulary_items
    WHERE user_id=$1 AND learning_direction=$2 AND status='active' AND due_at<=now()
    ORDER BY due_at,id LIMIT $3`,
   [context.learner.id,context.direction,limit]
  );
  return {learning_direction:context.direction,items:rows.rows};
 });
 app.get("/api/v1/vocabulary/stats",async(request,reply)=>{
  const context=await learnerContext(request,reply,pool,config);if(!context)return;
  const result=await pool.query<{
   active_items:number;due_items:number;reviewed_last_7_days:number;positive_ratings_last_7_days:number;
   again_ratings_last_7_days:number;practice_days_last_7_days:number;
  }>(
   `WITH item_stats AS (
      SELECT COUNT(*) FILTER (WHERE status='active')::int AS active_items,
       COUNT(*) FILTER (WHERE status='active' AND due_at<=now())::int AS due_items
      FROM learner_vocabulary_items WHERE user_id=$1 AND learning_direction=$2
    ), review_stats AS (
      SELECT COUNT(*)::int AS reviewed_last_7_days,
       COUNT(*) FILTER (WHERE r.rating<>'again')::int AS positive_ratings_last_7_days,
       COUNT(*) FILTER (WHERE r.rating='again')::int AS again_ratings_last_7_days,
       COUNT(DISTINCT (r.reviewed_at AT TIME ZONE 'UTC')::date)::int AS practice_days_last_7_days
      FROM learner_vocabulary_reviews r
      JOIN learner_vocabulary_items i ON i.id=r.vocabulary_item_id
      WHERE r.user_id=$1 AND i.user_id=$1 AND i.learning_direction=$2
       AND r.reviewed_at>=now()-interval '7 days'
    )
    SELECT item_stats.active_items,item_stats.due_items,review_stats.reviewed_last_7_days,
     review_stats.positive_ratings_last_7_days,review_stats.again_ratings_last_7_days,
     review_stats.practice_days_last_7_days FROM item_stats CROSS JOIN review_stats`,
   [context.learner.id,context.direction]
  );
  const stats=result.rows[0]??{active_items:0,due_items:0,reviewed_last_7_days:0,positive_ratings_last_7_days:0,again_ratings_last_7_days:0,practice_days_last_7_days:0};
  return {learning_direction:context.direction,stats};
 });
 app.get("/api/v1/vocabulary",async(request,reply)=>{
  const context=await learnerContext(request,reply,pool,config);if(!context)return;
  const rows=await pool.query(
   `SELECT id,learning_direction,source_term,target_term,example,source_lesson_id,
     status,due_at,interval_days,ease_factor,repetitions,lapses,last_reviewed_at,created_at,updated_at
    FROM learner_vocabulary_items WHERE user_id=$1 AND learning_direction=$2
    ORDER BY CASE WHEN status='active' THEN 0 ELSE 1 END,due_at,id LIMIT 200`,
   [context.learner.id,context.direction]
  );
  return {learning_direction:context.direction,items:rows.rows};
 });
 app.post("/api/v1/vocabulary",async(request,reply)=>{
  const context=await learnerContext(request,reply,pool,config);if(!context)return;
  const parsed=createSchema.safeParse(request.body);
  if(!parsed.success)return fail(reply,request.id,400,"VALIDATION_ERROR","Provide a source word and its translation; the example is optional.");
  const input=parsed.data;
  let lessonId:string|null=null,versionId:string|null=null;
  if(input.lesson_id){
   const lesson=await pool.query<{lesson_id:string;version_id:string}>(
    `SELECT l.id AS lesson_id,lv.id AS version_id
     FROM lessons l JOIN modules m ON m.id=l.module_id JOIN courses c ON c.id=m.course_id
     JOIN lesson_versions lv ON lv.id=l.current_published_version_id AND lv.lesson_id=l.id
     WHERE l.id=$1 AND l.status='published' AND c.status='published'
       AND c.learning_direction=$2 AND lv.status='published'
       AND (c.learning_direction<>'en_to_ml' OR lv.educator_review_status='approved')`,
    [input.lesson_id,context.direction]
   );
   if(!lesson.rows[0])return fail(reply,request.id,404,"LESSON_NOT_FOUND","This lesson is not published for your selected learning direction.");
   lessonId=lesson.rows[0].lesson_id;versionId=lesson.rows[0].version_id;
  }
  try{
   const created=await pool.query(
    `INSERT INTO learner_vocabulary_items(user_id,learning_direction,source_term,target_term,example,source_lesson_id,source_lesson_version_id)
     VALUES($1,$2,$3,$4,$5,$6,$7)
     RETURNING id,learning_direction,source_term,target_term,example,source_lesson_id,status,due_at,interval_days,ease_factor,repetitions,lapses,last_reviewed_at,created_at,updated_at`,
    [context.learner.id,context.direction,input.source_term,input.target_term,input.example??null,lessonId,versionId]
   );
   return reply.code(201).send({item:created.rows[0]});
  }catch(error){
   if((error as {code?:string}).code==="23505")return fail(reply,request.id,409,"VOCABULARY_ALREADY_SAVED","This vocabulary item is already in your saved list.");
   throw error;
  }
 });
 app.post("/api/v1/vocabulary/:id/review",async(request,reply)=>{
  const context=await learnerContext(request,reply,pool,config);if(!context)return;
  const id=idSchema.safeParse((request.params as {id?:string}).id);
  const parsed=reviewSchema.safeParse(request.body);
  if(!id.success||!parsed.success)return fail(reply,request.id,400,"VALIDATION_ERROR","Choose again, hard, good or easy for a valid vocabulary item.");
  const client=await pool.connect();
  try{
   await client.query("BEGIN");
   const found=await client.query<{interval_days:number;ease_factor:string;repetitions:number;lapses:number}>(
    "SELECT interval_days,ease_factor::text,repetitions,lapses FROM learner_vocabulary_items WHERE id=$1 AND user_id=$2 AND learning_direction=$3 AND status='active' FOR UPDATE",
    [id.data,context.learner.id,context.direction]
   );
   const current=found.rows[0];
   if(!current){await client.query("ROLLBACK");return fail(reply,request.id,404,"VOCABULARY_NOT_FOUND","This saved vocabulary item is not available.");}
   const rating=parsed.data.rating;
   const ease=Number(current.ease_factor);
   let nextEase=ease,nextInterval=0,nextRepetitions=current.repetitions,nextLapses=current.lapses;
   if(rating==="again"){nextInterval=1;nextRepetitions=0;nextLapses+=1;nextEase=Math.max(1.3,ease-0.2);}
   else if(rating==="hard"){nextInterval=Math.max(1,Math.ceil(Math.max(1,current.interval_days)*1.2));nextRepetitions+=1;nextEase=Math.max(1.3,ease-0.15);}
   else if(rating==="good"){nextInterval=current.repetitions===0?1:current.repetitions===1?6:Math.ceil(Math.max(1,current.interval_days)*ease);nextRepetitions+=1;}
   else{nextInterval=current.repetitions===0?2:Math.ceil(Math.max(1,current.interval_days)*(ease+0.3));nextRepetitions+=1;nextEase=Math.min(3,ease+0.15);}
   const saved=await client.query(
    `UPDATE learner_vocabulary_items SET interval_days=$3,ease_factor=$4,repetitions=$5,lapses=$6,
      last_reviewed_at=now(),due_at=now()+($3::text||' days')::interval,updated_at=now()
     WHERE id=$1 AND user_id=$2
     RETURNING id,source_term,target_term,due_at,interval_days,ease_factor,repetitions,lapses,last_reviewed_at`,
    [id.data,context.learner.id,nextInterval,nextEase,nextRepetitions,nextLapses]
   );
   await client.query(
    "INSERT INTO learner_vocabulary_reviews(vocabulary_item_id,user_id,rating,previous_interval_days,next_interval_days) VALUES($1,$2,$3,$4,$5)",
    [id.data,context.learner.id,rating,current.interval_days,nextInterval]
   );
   await client.query("COMMIT");
   return {item:saved.rows[0],review:{rating,next_interval_days:nextInterval}};
  }catch(error){
   await client.query("ROLLBACK").catch(()=>undefined);
   request.log.error({request_id:request.id},"Vocabulary review could not be saved");
   return fail(reply,request.id,503,"VOCABULARY_REVIEW_UNAVAILABLE","Your review could not be saved. Please try again.");
  }finally{client.release();}
 });
 app.delete("/api/v1/vocabulary/:id",async(request,reply)=>{
  const context=await learnerContext(request,reply,pool,config);if(!context)return;
  const id=idSchema.safeParse((request.params as {id?:string}).id);
  if(!id.success)return fail(reply,request.id,400,"VALIDATION_ERROR","Invalid vocabulary item id.");
  const archived=await pool.query(
   "UPDATE learner_vocabulary_items SET status='archived',updated_at=now() WHERE id=$1 AND user_id=$2 AND learning_direction=$3 AND status='active' RETURNING id",
   [id.data,context.learner.id,context.direction]
  );
  if(!archived.rows[0])return fail(reply,request.id,404,"VOCABULARY_NOT_FOUND","This saved vocabulary item is not available.");
  return reply.code(204).send();
 });
}
