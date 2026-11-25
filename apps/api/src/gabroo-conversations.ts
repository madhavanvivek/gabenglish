import type {FastifyInstance} from "fastify";
import {z} from "zod";
import type {Pool,PoolClient} from "pg";
import type {AppConfig} from "./config.js";
import {authenticateLearner} from "./auth.js";
import {getActiveSubscriptionEntitlement} from "./subscriptions.js";
import {buildGabrooTeachingPolicy,type GabrooTeachingPolicy} from "./gabroo-teaching-policy.js";
import {buildGabrooFeedbackPrompt,parseGabrooFeedback} from "./gabroo-feedback.js";

export type GabrooConversationMode="free_flow"|"gentle_correction"|"detailed_correction"|"topic_practice"|"role_play"|"vocabulary_building"|"confidence_practice";
export type GabrooMessage={role:"user"|"assistant";content:string};
export type GabrooConversationProvider={
  reply(input:{mode:GabrooConversationMode;supportLanguage:"ml"|"en";learningDirection:"ml_to_en"|"en_to_ml";targetLanguage:"ml"|"en";history:GabrooMessage[];signal:AbortSignal;teachingPolicy:GabrooTeachingPolicy}):Promise<{content:string;model?:string;usage?:{promptTokens?:number;completionTokens?:number;totalTokens?:number}}>;
};
const PROVIDER_TIMEOUT_MS=15_000;
const modes=["free_flow","gentle_correction","detailed_correction","topic_practice","role_play","vocabulary_building","confidence_practice"] as const;
const createSchema=z.object({title:z.string().trim().min(1).max(120).optional(),mode:z.enum(modes).default("gentle_correction"),support_language:z.enum(["ml","en"]).optional()}).strict();
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
const conversationSelect="id,title,mode,support_language,learning_direction,target_language,learning_stage,status,turn_count,created_at,updated_at,closed_at";
export async function registerGabrooConversationRoutes(app:FastifyInstance,pool:Pool,config:AppConfig,provider?:GabrooConversationProvider){
 app.post("/api/v1/gabroo/feedback",async(request,reply)=>{
  const learner=await learnerFor(request,reply,pool,config);if(!learner)return;
  if(!provider)return error(reply,request.id,503,"GABROO_PROVIDER_UNAVAILABLE","Gabroo feedback is not available yet.");
  const parsed=z.object({text:z.string().trim().min(2).max(1500)}).strict().safeParse(request.body);
  if(!parsed.success)return error(reply,request.id,400,"VALIDATION_ERROR","Please provide a sentence between 2 and 1,500 characters.");
  const preferences=await pool.query<{support_language:"ml"|"en";learning_direction:"ml_to_en"|"en_to_ml"}>("SELECT support_language,learning_direction FROM user_preferences WHERE user_id=$1",[learner.id]);
  const saved=preferences.rows[0]??{support_language:"ml" as const,learning_direction:"ml_to_en" as const};
  const direction=saved.learning_direction;
  const targetLanguage=direction==="ml_to_en"?"en":"ml";
  const stage=await pool.query<{stage:1|2|3|4|5}>("SELECT stage FROM learner_learning_stages WHERE user_id=$1 AND learning_direction=$2",[learner.id,direction]);
  const controller=new AbortController();let timeout:ReturnType<typeof setTimeout>|undefined;
  try{
   const timedOut=new Promise<never>((_,reject)=>{timeout=setTimeout(()=>{controller.abort();reject(new Error("feedback timeout"));},PROVIDER_TIMEOUT_MS);});
   const response=await Promise.race([
    provider.reply({
     mode:"detailed_correction",supportLanguage:saved.support_language,learningDirection:direction,targetLanguage,
     history:[{role:"user",content:buildGabrooFeedbackPrompt({text:parsed.data.text,targetLanguage,supportLanguage:saved.support_language})}],
     signal:controller.signal,
     teachingPolicy:buildGabrooTeachingPolicy({mode:"detailed_correction",supportLanguage:saved.support_language,learningDirection:direction,targetLanguage,stage:stage.rows[0]?.stage})
    }),
    timedOut
   ]);
   const feedback=parseGabrooFeedback(response.content);
   if(!feedback)return error(reply,request.id,503,"GABROO_FEEDBACK_INVALID","Gabroo could not produce validated feedback. Please try again.");
   return {feedback,disclaimer:"Suggestions are language-learning guidance, not a formal proficiency assessment. Review each suggestion before saving it."};
  }catch(e){
   request.log.error({request_id:request.id},"Gabroo structured feedback request failed");
   return error(reply,request.id,503,"GABROO_FEEDBACK_UNAVAILABLE","Gabroo feedback is temporarily unavailable. Please try again.");
  }finally{if(timeout)clearTimeout(timeout);}
 });

 app.post("/api/v1/gabroo/conversations",async(request,reply)=>{
  const learner=await learnerFor(request,reply,pool,config);if(!learner)return;
  if(!provider)return error(reply,request.id,503,"GABROO_PROVIDER_UNAVAILABLE","Gabroo conversations are not available yet. Your subscription and account remain unchanged.");
  const parsed=createSchema.safeParse(request.body??{});if(!parsed.success)return error(reply,request.id,400,"VALIDATION_ERROR","Please check your conversation preferences.");
  const preferences=await pool.query<{support_language:"ml"|"en";learning_direction:"ml_to_en"|"en_to_ml"}>("SELECT support_language,learning_direction FROM user_preferences WHERE user_id=$1",[learner.id]);
  const saved=preferences.rows[0]??{support_language:"ml" as const,learning_direction:"ml_to_en" as const};
  const direction=saved.learning_direction;
  const targetLanguage=direction==="ml_to_en"?"en":"ml";
  const supportLanguage=parsed.data.support_language??saved.support_language;
  const stage=await pool.query<{stage:1|2|3|4|5}>("SELECT stage FROM learner_learning_stages WHERE user_id=$1 AND learning_direction=$2",[learner.id,direction]);
  const learningStage=stage.rows[0]?.stage??null;
  const created=await pool.query("INSERT INTO gabroo_conversations(user_id,title,mode,support_language,learning_direction,target_language,learning_stage) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING "+conversationSelect,[learner.id,parsed.data.title??null,parsed.data.mode,supportLanguage,direction,targetLanguage,learningStage]);
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
  let snapshot:{id:string;mode:GabrooConversationMode;support_language:"ml"|"en";learning_direction:"ml_to_en"|"en_to_ml";target_language:"ml"|"en";learning_stage:1|2|3|4|5|null;status:string;turn_count:number}|undefined;
  let history:GabrooMessage[]=[];
  let learnerProfile:{display_name:string|null;learning_goal:string|null;correction_mode:"gentle"|"balanced"|"detailed"}|undefined;
  let savedMemory:Array<{category:"goal"|"interest"|"saved_phrase"|"learning_note";memory_key:string;content:string}>=[];
 let vocabularyFocus:Array<{term:string;meaning:string;reason:"difficult"|"due"}>=[];
 let skillFocus:Array<{skillKey:string;accuracy:number;attemptCount:number}>=[];
  try{
   await client.query("BEGIN");
   const found=await client.query<{id:string;mode:GabrooConversationMode;support_language:"ml"|"en";learning_direction:"ml_to_en"|"en_to_ml";target_language:"ml"|"en";learning_stage:1|2|3|4|5|null;status:string;turn_count:number}>(
    "SELECT id,mode,support_language,learning_direction,target_language,learning_stage,status,turn_count FROM gabroo_conversations WHERE id=$1 AND user_id=$2 FOR UPDATE",[parsedId.data,learner.id]);
   snapshot=found.rows[0];
   if(!snapshot){await client.query("ROLLBACK");return error(reply,request.id,404,"CONVERSATION_NOT_FOUND","This conversation is not available.");}
   if(snapshot.status!=="open"){await client.query("ROLLBACK");return error(reply,request.id,409,"CONVERSATION_CLOSED","This conversation is closed.");}
   const profile=await client.query<{display_name:string|null;learning_goal:string|null;correction_mode:"gentle"|"balanced"|"detailed"}>(
    "SELECT p.display_name,up.learning_goal,up.correction_mode FROM user_profiles p JOIN user_preferences up ON up.user_id=p.user_id WHERE p.user_id=$1",[learner.id]);
   learnerProfile=profile.rows[0];
   const memory=await client.query<{category:"goal"|"interest"|"saved_phrase"|"learning_note";memory_key:string;content:string}>(
    "SELECT category,memory_key,content FROM gabroo_learner_memory WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 20",[learner.id]);
   savedMemory=memory.rows;
   const vocabulary=await client.query<{term:string;meaning:string;reason:"difficult"|"due"}>(
    `SELECT vocabulary_item.value->>'term' AS term,vocabulary_item.value->>'meaning' AS meaning,
      CASE WHEN r.last_rating<=2 THEN 'difficult' ELSE 'due' END AS reason
     FROM learner_vocabulary_reviews r
     JOIN lessons l ON l.id=r.lesson_id AND l.current_published_version_id=r.lesson_version_id
     JOIN modules m ON m.id=l.module_id JOIN courses c ON c.id=m.course_id
     JOIN lesson_versions lv ON lv.id=r.lesson_version_id AND lv.lesson_id=l.id
     CROSS JOIN LATERAL jsonb_array_elements(COALESCE(lv.content->'blocks','[]'::jsonb)) AS lesson_block(value)
     CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN lesson_block.value->>'type'='vocabulary' THEN COALESCE(lesson_block.value->'items','[]'::jsonb) ELSE '[]'::jsonb END) AS vocabulary_item(value)
     WHERE r.user_id=$1 AND r.learning_direction=$2
       AND l.status='published' AND c.status='published' AND lv.status='published'
       AND (c.learning_direction<>'en_to_ml' OR lv.educator_review_status='approved')
       AND vocabulary_item.value->>'id'=r.vocabulary_item_id
       AND (r.last_rating<=2 OR r.due_at<=now())
     ORDER BY CASE WHEN r.last_rating<=2 THEN 0 ELSE 1 END,r.due_at ASC
     LIMIT 5`,
    [learner.id,snapshot.learning_direction]
   );
   vocabularyFocus=vocabulary.rows;
   const skillEvidence=await client.query<{skill_key:string;attempt_count:number;accuracy:string}>(
    `SELECT skill_key,COUNT(*)::int AS attempt_count,
      ROUND(AVG(CASE WHEN is_correct THEN 1.0 ELSE 0.0 END)::numeric,2)::text AS accuracy
     FROM (
      SELECT DISTINCT ON (lesson_id,exercise_id) skill_key,is_correct,attempted_at
      FROM learner_exercise_attempts
      WHERE user_id=$1 AND learning_direction=$2 AND skill_key IS NOT NULL
      ORDER BY lesson_id,exercise_id,attempted_at DESC
     ) latest
     GROUP BY skill_key
     HAVING COUNT(*)>=5 AND AVG(CASE WHEN is_correct THEN 1.0 ELSE 0.0 END)<=0.5
     ORDER BY AVG(CASE WHEN is_correct THEN 1.0 ELSE 0.0 END),COUNT(*) DESC
     LIMIT 3`,
    [learner.id,snapshot.learning_direction]
   );
   skillFocus=skillEvidence.rows.map(row=>({skillKey:row.skill_key,accuracy:Number(row.accuracy),attemptCount:row.attempt_count}));
   const existing=await client.query<{role:"user"|"assistant";content:string}>(
    "SELECT role,content FROM gabroo_conversation_messages WHERE conversation_id=$1 ORDER BY sequence_number DESC LIMIT 20",[snapshot.id]);
   history=[...existing.rows].reverse();
   await client.query("COMMIT");
  }catch(e){
   await client.query("ROLLBACK").catch(()=>undefined);
   request.log.error({request_id:request.id},"Gabroo conversation context load failed");
   return error(reply,request.id,503,"GABROO_REPLY_UNAVAILABLE","Gabroo could not load this conversation just now. Please try again.");
  }finally{
   client.release();
  }
  const controller=new AbortController();
  const providerStartedAt=performance.now();
  let timeout:ReturnType<typeof setTimeout>|undefined;
  let timedOut=false;
  let disconnected=false;
  const onResponseClose=()=>{
   if(!reply.raw.writableEnded){
    disconnected=true;
    controller.abort();
    rejectDisconnected(new Error("Gabroo client disconnected"));
   }
  };
  let rejectDisconnected:(reason:Error)=>void=()=>undefined;
  const clientDisconnected=new Promise<never>((_,reject)=>{rejectDisconnected=reject;});
  let response:{content:string;model?:string;usage?:{promptTokens?:number;completionTokens?:number;totalTokens?:number}};
  reply.raw.once("close",onResponseClose);
  if(reply.raw.destroyed){reply.raw.off("close",onResponseClose);return;}
  try{
   const timeoutPromise=new Promise<never>((_,reject)=>{
    timeout=setTimeout(()=>{timedOut=true;controller.abort();reject(new Error("Gabroo provider timed out"));},PROVIDER_TIMEOUT_MS);
   });
   response=await Promise.race([
    provider.reply({
     mode:snapshot!.mode,
     supportLanguage:snapshot!.support_language,
     learningDirection:snapshot!.learning_direction,
     targetLanguage:snapshot!.target_language,
     history:[...history,{role:"user",content:parsedBody.data.message}],
     signal:controller.signal,
     teachingPolicy:buildGabrooTeachingPolicy({
      mode:snapshot!.mode,
      supportLanguage:snapshot!.support_language,
      learningDirection:snapshot!.learning_direction,
      targetLanguage:snapshot!.target_language,
      stage:snapshot!.learning_stage??undefined,
      preferredName:learnerProfile?.display_name,
      learningGoal:learnerProfile?.learning_goal,
      profileCorrectionPreference:learnerProfile?.correction_mode,
      learnerMemory:savedMemory.map(item=>({category:item.category,memoryKey:item.memory_key,content:item.content})),
      vocabularyFocus,
      skillFocus
     })
    }),
    timeoutPromise,
    clientDisconnected
   ]);
  }catch(e){
   if(disconnected||reply.raw.destroyed)return;
   request.log.warn({request_id:request.id,timed_out:timedOut},"Gabroo conversation provider request did not complete");
   if(timedOut)return error(reply,request.id,504,"GABROO_REPLY_TIMEOUT","Gabroo is taking longer than expected. Your message was not saved; please try again.");
   return error(reply,request.id,503,"GABROO_REPLY_UNAVAILABLE","Gabroo could not respond just now. Your message was not saved; please try again.");
  }finally{
   if(timeout)clearTimeout(timeout);
   reply.raw.off("close",onResponseClose);
  }
  request.log.info({
   request_id:request.id,
   provider_model:response.model??"configured-model",
   latency_ms:Math.round(performance.now()-providerStartedAt),
   prompt_tokens:response.usage?.promptTokens,
   completion_tokens:response.usage?.completionTokens,
   total_tokens:response.usage?.totalTokens
  },"Gabroo provider response completed");
  const answer=typeof response?.content==="string"?response.content.trim():"";
  if(!answer||answer.length>12000)return error(reply,request.id,503,"GABROO_REPLY_UNAVAILABLE","Gabroo returned an invalid response. Your message was not saved.");
  const writeClient:PoolClient=await pool.connect();
  try{
   await writeClient.query("BEGIN");
   const current=await writeClient.query<{status:string;turn_count:number}>(
    "SELECT status,turn_count FROM gabroo_conversations WHERE id=$1 AND user_id=$2 FOR UPDATE",[parsedId.data,learner.id]);
   const latest=current.rows[0];
   if(!latest){await writeClient.query("ROLLBACK");return error(reply,request.id,404,"CONVERSATION_NOT_FOUND","This conversation is not available.");}
   if(latest.status!=="open"){await writeClient.query("ROLLBACK");return error(reply,request.id,409,"CONVERSATION_CLOSED","This conversation was closed while Gabroo was responding.");}
   if(latest.turn_count!==snapshot!.turn_count){await writeClient.query("ROLLBACK");return error(reply,request.id,409,"CONVERSATION_UPDATED_RETRY","A newer message was saved first. Please reload the conversation and try again.");}
   const active=await writeClient.query("SELECT user_id FROM active_subscription_entitlements WHERE user_id=$1",[learner.id]);
   if(!active.rows[0]){await writeClient.query("ROLLBACK");return error(reply,request.id,403,"PAID_SUBSCRIPTION_REQUIRED","Your Gabroo subscription is no longer active. Your conversation remains saved.");}
   const userSequence=latest.turn_count*2+1;
   const assistantSequence=userSequence+1;
   const inserted=await writeClient.query(
    "INSERT INTO gabroo_conversation_messages(conversation_id,sequence_number,role,content) VALUES($1,$2,'user',$3),($1,$4,'assistant',$5) RETURNING id,sequence_number,role,content,created_at",
    [parsedId.data,userSequence,parsedBody.data.message,assistantSequence,answer]);
   await writeClient.query("UPDATE gabroo_conversations SET turn_count=turn_count+1,updated_at=now() WHERE id=$1",[parsedId.data]);
   await writeClient.query("COMMIT");
   return {messages:inserted.rows};
  }catch(e){
   await writeClient.query("ROLLBACK").catch(()=>undefined);
   request.log.error({request_id:request.id},"Gabroo conversation save failed");
   return error(reply,request.id,503,"GABROO_REPLY_UNAVAILABLE","Gabroo could not save this reply. Your message was not saved; please try again.");
  }finally{
   writeClient.release();
  }
 });
}
