import type {FastifyInstance} from "fastify";
import {z} from "zod";
import type {Pool} from "pg";
import type {AppConfig} from "./config.js";
import {authenticateLearner} from "./auth.js";

const createSchema=z.object({
 source_saved_phrase_id:z.string().uuid(),
 term:z.string().trim().min(1).max(120),
 malayalam_meaning:z.string().trim().min(1).max(300),
 example_sentence:z.string().trim().max(500).optional().default(""),
 learning_direction:z.enum(["ml_to_en","en_to_ml"]).default("ml_to_en")
}).strict();
const updateSchema=z.object({
 term:z.string().trim().min(1).max(120).optional(),
 malayalam_meaning:z.string().trim().min(1).max(300).optional(),
 example_sentence:z.string().trim().max(500).optional(),
 status:z.enum(["learning","familiar","mastered"]).optional()
}).strict().refine(value=>Object.keys(value).length>0);
const idSchema=z.string().uuid();
function fail(reply:any,requestId:string,status:number,code:string,message:string){
 return reply.code(status).send({error:{code,message,request_id:requestId}});
}
import {calculateGabrooReviewSchedule,type GabrooReviewRating} from "./gabroo-review-schedule.js";
const columns="id,source_saved_phrase_id,term,malayalam_meaning,example_sentence,learning_direction,status,review_due_at,last_reviewed_at,review_count,interval_days,ease_factor,last_review_rating,created_at,updated_at";
const reviewSchema=z.object({rating:z.enum(["again","hard","good","easy"])}).strict();

export async function registerGabrooVocabularyRoutes(app:FastifyInstance,pool:Pool,config:AppConfig){
 app.get("/api/v1/gabroo/vocabulary/review-due",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return fail(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account.");
  const rows=await pool.query(`SELECT ${columns} FROM gabroo_vocabulary WHERE user_id=$1 AND status <> 'mastered' AND review_due_at<=now() ORDER BY review_due_at ASC LIMIT 50`,[learner.id]);
  return {items:rows.rows,reviewed_due_count:rows.rowCount??0};
 });
 app.post("/api/v1/gabroo/vocabulary/:id/review",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return fail(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account.");
  const id=idSchema.safeParse((request.params as {id?:string}).id),parsed=reviewSchema.safeParse(request.body);
  if(!id.success||!parsed.success)return fail(reply,request.id,400,"VALIDATION_ERROR","Choose a valid recall rating.");
  const client=await pool.connect();
  try{
   await client.query("BEGIN");
   const current=await client.query<{interval_days:string;ease_factor:string;review_count:number;status:string}>(
    "SELECT interval_days,ease_factor,review_count,status FROM gabroo_vocabulary WHERE id=$1 AND user_id=$2 FOR UPDATE",[id.data,learner.id]);
   if(!current.rows[0]){await client.query("ROLLBACK");return fail(reply,request.id,404,"VOCABULARY_NOT_FOUND","This vocabulary item is not available.");}
   const item=current.rows[0];
   if(item.status==="mastered"){await client.query("ROLLBACK");return fail(reply,request.id,409,"VOCABULARY_ALREADY_MASTERED","This item is marked mastered. Change its status before reviewing it again.");}
   const schedule=calculateGabrooReviewSchedule({rating:parsed.data.rating,intervalDays:Number(item.interval_days),easeFactor:Number(item.ease_factor),reviewCount:item.review_count});
   const updated=await client.query(`UPDATE gabroo_vocabulary SET review_due_at=$3,last_reviewed_at=now(),review_count=$4,interval_days=$5,ease_factor=$6,last_review_rating=$7,updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING ${columns}`,
    [id.data,learner.id,schedule.dueAt,schedule.reviewCount,schedule.intervalDays,schedule.easeFactor,parsed.data.rating]);
   await client.query("COMMIT");
   return {vocabulary:updated.rows[0],schedule:{interval_days:schedule.intervalDays,ease_factor:schedule.easeFactor,review_count:schedule.reviewCount,next_review_at:schedule.dueAt.toISOString(),rating:parsed.data.rating}};
  }catch(error){await client.query("ROLLBACK");throw error;}
  finally{client.release();}
 });
 app.get("/api/v1/gabroo/vocabulary",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return fail(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account.");
  const rows=await pool.query(`SELECT ${columns} FROM gabroo_vocabulary WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 200`,[learner.id]);
  return {vocabulary:rows.rows,privacy:{owner_only:true,editable:true,deletable:true,explicitly_saved_only:true}};
 });
 app.post("/api/v1/gabroo/vocabulary",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return fail(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account.");
  const parsed=createSchema.safeParse(request.body);
  if(!parsed.success)return fail(reply,request.id,400,"VALIDATION_ERROR","Provide a saved phrase, its vocabulary item and a Malayalam meaning.");
  const source=await pool.query("SELECT id FROM gabroo_learner_memory WHERE id=$1 AND user_id=$2 AND category='saved_phrase'",[parsed.data.source_saved_phrase_id,learner.id]);
  if(!source.rows[0])return fail(reply,request.id,404,"SAVED_PHRASE_NOT_FOUND","Save this Gabroo phrase first, then add vocabulary from it.");
  try{
   const created=await pool.query(`INSERT INTO gabroo_vocabulary(user_id,source_saved_phrase_id,term,malayalam_meaning,example_sentence,learning_direction) VALUES($1,$2,$3,$4,$5,$6) RETURNING ${columns}`,
    [learner.id,parsed.data.source_saved_phrase_id,parsed.data.term,parsed.data.malayalam_meaning,parsed.data.example_sentence,parsed.data.learning_direction]);
   return reply.code(201).send({vocabulary:created.rows[0]});
  }catch(error){
   if((error as {code?:string}).code==="23505")return fail(reply,request.id,409,"VOCABULARY_ALREADY_EXISTS","This word or phrase is already in your vocabulary list.");
   throw error;
  }
 });
 app.patch("/api/v1/gabroo/vocabulary/:id",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return fail(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account.");
  const id=idSchema.safeParse((request.params as {id?:string}).id),parsed=updateSchema.safeParse(request.body);
  if(!id.success||!parsed.success)return fail(reply,request.id,400,"VALIDATION_ERROR","Provide valid vocabulary changes.");
  const updated=await pool.query(`UPDATE gabroo_vocabulary SET term=COALESCE($3,term),malayalam_meaning=COALESCE($4,malayalam_meaning),example_sentence=COALESCE($5,example_sentence),status=COALESCE($6,status),updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING ${columns}`,
   [id.data,learner.id,parsed.data.term??null,parsed.data.malayalam_meaning??null,parsed.data.example_sentence??null,parsed.data.status??null]);
  if(!updated.rows[0])return fail(reply,request.id,404,"VOCABULARY_NOT_FOUND","This vocabulary item is not available.");
  return {vocabulary:updated.rows[0]};
 });
 app.delete("/api/v1/gabroo/vocabulary/:id",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return fail(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account.");
  const id=idSchema.safeParse((request.params as {id?:string}).id);
  if(!id.success)return fail(reply,request.id,400,"VALIDATION_ERROR","Invalid vocabulary item id.");
  const deleted=await pool.query("DELETE FROM gabroo_vocabulary WHERE id=$1 AND user_id=$2 RETURNING id",[id.data,learner.id]);
  if(!deleted.rows[0])return fail(reply,request.id,404,"VOCABULARY_NOT_FOUND","This vocabulary item is not available.");
  return reply.code(204).send();
 });
}
