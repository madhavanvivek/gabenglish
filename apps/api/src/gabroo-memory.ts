import type {FastifyInstance} from "fastify";
import {z} from "zod";
import type {Pool} from "pg";
import type {AppConfig} from "./config.js";
import {authenticateLearner} from "./auth.js";

const categories=["goal","interest","saved_phrase","learning_note"] as const;
const createSchema=z.object({
 category:z.enum(categories),
 memory_key:z.string().trim().min(1).max(80),
 content:z.string().trim().min(1).max(500)
}).strict();
const updateSchema=z.object({
 category:z.enum(categories).optional(),
 memory_key:z.string().trim().min(1).max(80).optional(),
 content:z.string().trim().min(1).max(500).optional()
}).strict().refine(value=>Object.keys(value).length>0);
const idSchema=z.string().uuid();
function fail(reply:any,requestId:string,status:number,code:string,message:string){
 return reply.code(status).send({error:{code,message,request_id:requestId}});
}

export async function registerGabrooMemoryRoutes(app:FastifyInstance,pool:Pool,config:AppConfig){
 app.get("/api/v1/gabroo/memory",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return fail(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account.");
  const rows=await pool.query(
   "SELECT id,category,memory_key,content,source,created_at,updated_at FROM gabroo_learner_memory WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 100",
   [learner.id]
  );
  return {memory:rows.rows,privacy:{owner_only:true,editable:true,deletable:true,retained_after_subscription_expiry:true}};
 });
 app.post("/api/v1/gabroo/memory",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return fail(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account.");
  const parsed=createSchema.safeParse(request.body);
  if(!parsed.success)return fail(reply,request.id,400,"VALIDATION_ERROR","Please provide a valid memory category, title and note.");
  try{
   const created=await pool.query(
    "INSERT INTO gabroo_learner_memory(user_id,category,memory_key,content,source) VALUES($1,$2,$3,$4,'learner_saved') RETURNING id,category,memory_key,content,source,created_at,updated_at",
    [learner.id,parsed.data.category,parsed.data.memory_key,parsed.data.content]
   );
   return reply.code(201).send({memory:created.rows[0]});
  }catch(error){
   if((error as {code?:string}).code==="23505")return fail(reply,request.id,409,"MEMORY_ALREADY_EXISTS","A memory with this category and title already exists. Edit the existing item instead.");
   throw error;
  }
 });
 app.patch("/api/v1/gabroo/memory/:id",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return fail(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account.");
  const id=idSchema.safeParse((request.params as {id?:string}).id);
  const parsed=updateSchema.safeParse(request.body);
  if(!id.success||!parsed.success)return fail(reply,request.id,400,"VALIDATION_ERROR","Please provide valid memory changes.");
  const updated=await pool.query(
   "UPDATE gabroo_learner_memory SET category=COALESCE($3,category),memory_key=COALESCE($4,memory_key),content=COALESCE($5,content),updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING id,category,memory_key,content,source,created_at,updated_at",
   [id.data,learner.id,parsed.data.category??null,parsed.data.memory_key??null,parsed.data.content??null]
  );
  if(!updated.rows[0])return fail(reply,request.id,404,"MEMORY_NOT_FOUND","This saved memory is not available.");
  return {memory:updated.rows[0]};
 });
 app.delete("/api/v1/gabroo/memory",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return fail(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account.");
  const deleted=await pool.query("DELETE FROM gabroo_learner_memory WHERE user_id=$1",[learner.id]);
  return {deleted_count:deleted.rowCount??0};
 });
 app.delete("/api/v1/gabroo/memory/:id",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return fail(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account.");
  const id=idSchema.safeParse((request.params as {id?:string}).id);
  if(!id.success)return fail(reply,request.id,400,"VALIDATION_ERROR","Invalid memory id.");
  const deleted=await pool.query("DELETE FROM gabroo_learner_memory WHERE id=$1 AND user_id=$2 RETURNING id",[id.data,learner.id]);
  if(!deleted.rows[0])return fail(reply,request.id,404,"MEMORY_NOT_FOUND","This saved memory is not available.");
  return reply.code(204).send();
 });
}
