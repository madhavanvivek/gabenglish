import type {FastifyInstance} from "fastify";
import {z} from "zod";
import type {Pool,PoolClient} from "pg";
import type {AppConfig} from "./config.js";
import {authenticateLearner} from "./auth.js";
import {getActiveSubscriptionEntitlement} from "./subscriptions.js";

export type GabrooConversationMode="free_flow"|"gentle_correction"|"detailed_correction"|"topic_practice"|"role_play"|"vocabulary_building"|"confidence_practice";
export type GabrooMessage={role:"user"|"assistant";content:string};
export type GabrooConversationProvider={
  reply(input:{mode:GabrooConversationMode;supportLanguage:"ml"|"en";history:GabrooMessage[]}):Promise<{content:string}>;
};
const modes=["free_flow","gentle_correction","detailed_correction","topic_practice","role_play","vocabulary_building","confidence_practice"] as const;
const createSchema=z.object({title:z.string().trim().min(1).max(120).optional(),mode:z.enum(modes).default("gentle_correction"),support_language:z.enum(["ml","en"]).default("ml")}).strict();
const sendSchema=z.object({message:z.string().trim().min(1).max(12000)}).strict();
const idSchema=z.string().uuid();
function error(reply:any,requestId:string,status:number,code:string,message:string){return reply.code(status).send({error:{code,message,request_id:requestId}});}
async function learnerFor(request:any,reply:any,pool:Pool,config:AppConfig){
 const learner=await authenticateLearner(request,pool,config);
 if(!learner){error(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account to continue.");return undefined;}
 const entitlement=await getActiveSubscriptionEntitlement(pool,learner.id);
 if(!entitlement){error(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active Gabenglish subscription is required to chat with Gabroo.");return undefined;}
 return learner;
}
const conversationSelect="id,title,mode,support_language,status,turn_count,created_at,updated_at,closed_at";
export async function registerGabrooConversationRoutes(app:FastifyInstance,pool:Pool,config:AppConfig,provider?:GabrooConversationProvider){
 app.post("/api/v1/gabroo/conversations",async(request,reply)=>{
  const learner=await learnerFor(request,reply,pool,config);if(!learner)return;
  if(!provider)return error(reply,request.id,503,"GABROO_PROVIDER_UNAVAILABLE","Gabroo conversations are not available yet. Your subscription and account remain unchanged.");
  const parsed=createSchema.safeParse(request.body??{});if(!parsed.success)return error(reply,request.id,400,"VALIDATION_ERROR","Please check your conversation preferences.");
  const created=await pool.query("INSERT INTO gabroo_conversations(user_id,title,mode,support_language) VALUES($1,$2,$3,$4) RETURNING "+conversationSelect,[learner.id,parsed.data.title??null,parsed.data.mode,parsed.data.support_language]);
  return reply.code(201).send({conversation:created.rows[0]});
 });
 app.get("/api/v1/gabroo/conversations",async(request,reply)=>{
  const learner=await learnerFor(request,reply,pool,config);if(!learner)return;
  const rows=await pool.query("SELECT "+conversationSelect+" FROM gabroo_conversations WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 100",[learner.id]);
  return {conversations:rows.rows};
 });
 app.get("/api/v1/gabroo/conversations/:id",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);if(!learner)return error(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account.");
  const idSchemaResult=idSchema.safeParse((request.params as {id?:string}).id);if(!idSchemaResult.success)return error(reply,request.id,400,"VALIDATION_ERROR","Invalid conversation id.");
  const found=await pool.query("SELECT "+conversationSelect+" FROM gabroo_conversations WHERE id=$1 AND user_id=$2",[idSchemaResult.data,learner.id]);
  if(!found.rows[0])return error(reply,request.id,404,"CONVERSATION_NOT_FOUND","This conversation is not available.");
  const entitlement=await getActiveSubscriptionEntitlement(pool,learner.id);if(!entitlement)return error(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active Gabenglish subscription is required to view conversations.");
  const messages=await pool.query("SELECT id,sequence_number,role,content,created_at FROM gabroo_conversation_messages WHERE conversation_id=$1 ORDER BY sequence_number",[idSchemaResult.data]);
  return {conversation:found.rows[0],messages:messages.rows};
 });

 app.patch("/api/v1/gabroo/conversations/:id",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);if(!learner)return error(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account.");
  const parsedId=idSchema.safeParse((request.params as {id?:string}).id);
  const parsedBody=z.object({title:z.string().trim().min(1).max(120).nullable().optional(),mode:z.enum(modes).optional(),support_language:z.enum(["ml","en"]).optional()}).strict().safeParse(request.body);
  if(!parsedId.success||!parsedBody.success||Object.keys(parsedBody.data??{}).length===0)return error(reply,request.id,400,"VALIDATION_ERROR","Please provide valid conversation settings.");
  const owned=await pool.query("SELECT id FROM gabroo_conversations WHERE id=$1 AND user_id=$2",[parsedId.data,learner.id]);if(!owned.rows[0])return error(reply,request.id,404,"CONVERSATION_NOT_FOUND","This conversation is not available.");
  const entitlement=await getActiveSubscriptionEntitlement(pool,learner.id);if(!entitlement)return error(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active Gabenglish subscription is required to update conversations.");
  const updated=await pool.query("UPDATE gabroo_conversations SET title=COALESCE($3,title),mode=COALESCE($4,mode),support_language=COALESCE($5,support_language),updated_at=now() WHERE id=$1 AND user_id=$2 AND status='open' RETURNING "+conversationSelect,[parsedId.data,learner.id,parsedBody.data.title??null,parsedBody.data.mode??null,parsedBody.data.support_language??null]);
  if(!updated.rows[0])return error(reply,request.id,409,"CONVERSATION_CLOSED","This conversation is closed and cannot be changed.");
  return {conversation:updated.rows[0]};
 });
 app.delete("/api/v1/gabroo/conversations/:id",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);if(!learner)return error(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account.");
  const parsed=idSchema.safeParse((request.params as {id?:string}).id);if(!parsed.success)return error(reply,request.id,400,"VALIDATION_ERROR","Invalid conversation id.");
  const deleted=await pool.query("DELETE FROM gabroo_conversations WHERE id=$1 AND user_id=$2 RETURNING id",[parsed.data,learner.id]);
  if(!deleted.rows[0])return error(reply,request.id,404,"CONVERSATION_NOT_FOUND","This conversation is not available.");
  return reply.code(204).send();
 });
 app.post("/api/v1/gabroo/conversations/:id/messages",async(request,reply)=>{
  const learner=await authenticateLearner(request,pool,config);if(!learner)return error(reply,request.id,401,"VERIFIED_ACCOUNT_REQUIRED","Please sign in with your verified account.");
  const parsedId=idSchema.safeParse((request.params as {id?:string}).id);const parsedBody=sendSchema.safeParse(request.body);
  if(!parsedId.success||!parsedBody.success)return error(reply,request.id,400,"VALIDATION_ERROR","Please provide a valid conversation and message.");
  const owned=await pool.query("SELECT id FROM gabroo_conversations WHERE id=$1 AND user_id=$2",[parsedId.data,learner.id]);if(!owned.rows[0])return error(reply,request.id,404,"CONVERSATION_NOT_FOUND","This conversation is not available.");
  const entitlement=await getActiveSubscriptionEntitlement(pool,learner.id);if(!entitlement)return error(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","An active Gabenglish subscription is required to chat with Gabroo.");
  if(!provider)return error(reply,request.id,503,"GABROO_PROVIDER_UNAVAILABLE","Gabroo conversations are not available yet. No message was saved.");
  const client:PoolClient=await pool.connect();
  try{
   await client.query("BEGIN");
   const found=await client.query<{id:string;mode:GabrooConversationMode;support_language:"ml"|"en";status:string;turn_count:number}>(
    "SELECT id,mode,support_language,status,turn_count FROM gabroo_conversations WHERE id=$1 AND user_id=$2 FOR UPDATE",[parsedId.data,learner.id]);
   const conversation=found.rows[0];
   if(!conversation){await client.query("ROLLBACK");return error(reply,request.id,404,"CONVERSATION_NOT_FOUND","This conversation is not available.");}
   if(conversation.status!=="open"){await client.query("ROLLBACK");return error(reply,request.id,409,"CONVERSATION_CLOSED","This conversation is closed.");}
   const existing=await client.query<{role:"user"|"assistant";content:string}>("SELECT role,content FROM gabroo_conversation_messages WHERE conversation_id=$1 ORDER BY sequence_number DESC LIMIT 20",[conversation.id]);
   const history=[...existing.rows].reverse();
   const response=await provider.reply({mode:conversation.mode,supportLanguage:conversation.support_language,history:[...history,{role:"user",content:parsedBody.data.message}]});
   const answer=typeof response?.content==="string"?response.content.trim():"";
   if(!answer||answer.length>12000)throw new Error("Gabroo provider returned an invalid response");
   const userSequence=conversation.turn_count*2+1;
   const assistantSequence=userSequence+1;
   const inserted=await client.query(
    "INSERT INTO gabroo_conversation_messages(conversation_id,sequence_number,role,content) VALUES($1,$2,'user',$3),($1,$4,'assistant',$5) RETURNING id,sequence_number,role,content,created_at",
    [conversation.id,userSequence,parsedBody.data.message,assistantSequence,answer]);
   await client.query("UPDATE gabroo_conversations SET turn_count=turn_count+1,updated_at=now() WHERE id=$1",[conversation.id]);
   await client.query("COMMIT");
   return {messages:inserted.rows};
  }catch(e){await client.query("ROLLBACK").catch(()=>undefined);request.log.error({request_id:request.id},"Gabroo conversation provider request failed");return error(reply,request.id,503,"GABROO_REPLY_UNAVAILABLE","Gabroo could not respond just now. Your message was not saved; please try again.");}
  finally{client.release();}
 });
}
