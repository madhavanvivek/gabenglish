import type {FastifyInstance} from "fastify";
import {z} from "zod";
import type {Pool,PoolClient} from "pg";
import type {AppConfig} from "./config.js";
import {authenticateLearner} from "./auth.js";
import {getActiveSubscriptionEntitlement} from "./subscriptions.js";
import {buildGabrooTeachingPolicy,type GabrooTeachingPolicy} from "./gabroo-teaching-policy.js";
import {chooseGabrooLearningDecision,type GabrooSkillEvidence,type GabrooLearningDecision} from "./gabroo-learning-model.js";

export type GabrooConversationMode="free_flow"|"gentle_correction"|"detailed_correction"|"topic_practice"|"role_play"|"vocabulary_building"|"confidence_practice";
export type GabrooMessage={role:"user"|"assistant";content:string};
export type GabrooConversationProvider={
  reply(input:{mode:GabrooConversationMode;supportLanguage:"ml"|"en";learningDirection:"ml_to_en"|"en_to_ml";targetLanguage:"ml"|"en";history:GabrooMessage[];signal:AbortSignal;teachingPolicy:GabrooTeachingPolicy;learningDecision?:GabrooLearningDecision}):Promise<{content:string}>;
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
const conversationSelect="id,title,mode,support_language,learning_direction,target_language,status,turn_count,created_at,updated_at,closed_at";
export async function registerGabrooConversationRoutes(app:FastifyInstance,pool:Pool,config:AppConfig,provider?:GabrooConversationProvider){
 app.post("/api/v1/gabroo/conversations",async(request,reply)=>{
  const learner=await learnerFor(request,reply,pool,config);if(!learner)return;
  if(!provider)return error(reply,request.id,503,"GABROO_PROVIDER_UNAVAILABLE","Gabroo conversations are not available yet. Your subscription and account remain unchanged.");
  const parsed=createSchema.safeParse(request.body??{});if(!parsed.success)return error(reply,request.id,400,"VALIDATION_ERROR","Please check your conversation preferences.");
  const preferences=await pool.query<{support_language:"ml"|"en";learning_direction:"ml_to_en"|"en_to_ml"}>("SELECT support_language,learning_direction FROM user_preferences WHERE user_id=$1",[learner.id]);
  const saved=preferences.rows[0]??{support_language:"ml" as const,learning_direction:"ml_to_en" as const};
  const direction=saved.learning_direction;
  const targetLanguage=direction==="ml_to_en"?"en":"ml";
  const supportLanguage=parsed.data.support_language??saved.support_language;
  const created=await pool.query("INSERT INTO gabroo_conversations(user_id,title,mode,support_language,learning_direction,target_language) VALUES($1,$2,$3,$4,$5,$6) RETURNING "+conversationSelect,[learner.id,parsed.data.title??null,parsed.data.mode,supportLanguage,direction,targetLanguage]);
  return reply.code(201).send({conversation:created.rows[0]});
 });
 app.get("/api/v1/gabroo/conversations",async(request,reply)=>{
  const learner=await learnerFor(request,reply,pool,config);if(!learner)return;
  const rows=await pool.query("SELECT "+conversationSelect+" FROM gabroo_conversations WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 100",[learner.id]);
  return {conversations:rows.rows};
 });
 app.get("/api/v1/gabroo/speaking-progress",async(request,reply)=>{
  const learner=await learnerFor(request,reply,pool,config);if(!learner)return;
  const summary=await pool.query<{
   period:"current"|"previous";
   sessions:number;
   learner_turns:number;
   learner_words:string;
   average_words_per_turn:string|null;
  }>(`
   WITH bounds AS (
    SELECT now()-interval '7 days' AS current_start,now()-interval '14 days' AS previous_start
   ), learner_messages AS (
    SELECT c.id AS conversation_id,m.created_at,
     CASE WHEN btrim(m.content)='' THEN 0 ELSE cardinality(regexp_split_to_array(btrim(m.content),'\\s+')) END AS word_count,
     CASE WHEN m.created_at>=b.current_start THEN 'current' ELSE 'previous' END AS period
    FROM gabroo_conversation_messages m
    JOIN gabroo_conversations c ON c.id=m.conversation_id
    CROSS JOIN bounds b
    WHERE c.user_id=$1 AND m.role='user' AND m.created_at>=b.previous_start
   )
   SELECT period,count(DISTINCT conversation_id)::int AS sessions,count(*)::int AS learner_turns,
    COALESCE(sum(word_count),0)::text AS learner_words,
    round(avg(word_count),1)::text AS average_words_per_turn
   FROM learner_messages GROUP BY period
  `,[learner.id]);
  const empty={sessions:0,learner_turns:0,learner_words:0,average_words_per_turn:0};
  const current=summary.rows.find(row=>row.period==="current");
  const previous=summary.rows.find(row=>row.period==="previous");
  const shape=(row:typeof current)=>row?{
   sessions:Number(row.sessions),learner_turns:Number(row.learner_turns),
   learner_words:Number(row.learner_words),average_words_per_turn:Number(row.average_words_per_turn??0)
  }:empty;
  return {window_days:7,current:shape(current),previous:shape(previous),interpretation:"Activity indicators only; word counts and response length are not an English proficiency or fluency score."};
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
  let snapshot:{id:string;mode:GabrooConversationMode;support_language:"ml"|"en";learning_direction:"ml_to_en"|"en_to_ml";target_language:"ml"|"en";status:string;turn_count:number}|undefined;
  let history:GabrooMessage[]=[];
  let learnerProfile:{display_name:string|null;learning_goal:string|null;correction_mode:"gentle"|"balanced"|"detailed"}|undefined;
  let savedMemory:Array<{category:"goal"|"interest"|"saved_phrase"|"learning_note";memory_key:string;content:string}>=[];
  let savedVocabulary:Array<{term:string;malayalamMeaning:string;exampleSentence:string;status:"learning"|"familiar";isDue:boolean;lastReviewRating:"again"|"hard"|"good"|"easy"|null}>=[];
  let skillEvidence:GabrooSkillEvidence[]=[];
  let dueVocabularyCount=0;
  try{
   await client.query("BEGIN");
   const found=await client.query<{id:string;mode:GabrooConversationMode;support_language:"ml"|"en";learning_direction:"ml_to_en"|"en_to_ml";target_language:"ml"|"en";status:string;turn_count:number}>(
    "SELECT id,mode,support_language,learning_direction,target_language,status,turn_count FROM gabroo_conversations WHERE id=$1 AND user_id=$2 FOR UPDATE",[parsedId.data,learner.id]);
   snapshot=found.rows[0];
   if(!snapshot){await client.query("ROLLBACK");return error(reply,request.id,404,"CONVERSATION_NOT_FOUND","This conversation is not available.");}
   if(snapshot.status!=="open"){await client.query("ROLLBACK");return error(reply,request.id,409,"CONVERSATION_CLOSED","This conversation is closed.");}
   const profile=await client.query<{display_name:string|null;learning_goal:string|null;correction_mode:"gentle"|"balanced"|"detailed"}>(
    "SELECT p.display_name,up.learning_goal,COALESCE(up.correction_mode,'balanced') AS correction_mode FROM users u LEFT JOIN user_profiles p ON p.user_id=u.id LEFT JOIN user_preferences up ON up.user_id=u.id WHERE u.id=$1",[learner.id]);
   learnerProfile=profile.rows[0];
   const memory=await client.query<{category:"goal"|"interest"|"saved_phrase"|"learning_note";memory_key:string;content:string}>(
    "SELECT category,memory_key,content FROM gabroo_learner_memory WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 20",[learner.id]);
   savedMemory=memory.rows;
   const vocabulary=await client.query<{term:string;malayalamMeaning:string;exampleSentence:string;status:"learning"|"familiar";isDue:boolean;lastReviewRating:"again"|"hard"|"good"|"easy"|null}>(
    "SELECT term,malayalam_meaning AS \"malayalamMeaning\",example_sentence AS \"exampleSentence\",status,(review_due_at<=now()) AS \"isDue\",last_review_rating AS \"lastReviewRating\" FROM gabroo_vocabulary WHERE user_id=$1 AND learning_direction=$2 AND status IN ('learning','familiar') ORDER BY CASE WHEN last_review_rating='again' THEN 0 WHEN review_due_at<=now() THEN 1 WHEN status='learning' THEN 2 ELSE 3 END,updated_at DESC LIMIT 5",[learner.id,snapshot.learning_direction]);
   savedVocabulary=vocabulary.rows;
   const [evidenceRows,dueRows]=await Promise.all([
    client.query<{skill:GabrooSkillEvidence["skill"];score:string;confidence:string;source:GabrooSkillEvidence["source"];task_id:string;observed_at:Date}>(
     "SELECT skill,score::text,confidence::text,source,task_id,observed_at FROM gabroo_skill_evidence WHERE user_id=$1 AND observed_at>=now()-interval '180 days' ORDER BY observed_at DESC LIMIT 300",[learner.id]),
    client.query<{count:string}>(
     "SELECT count(*)::text AS count FROM gabroo_vocabulary WHERE user_id=$1 AND learning_direction=$2 AND status<>'mastered' AND review_due_at<=now()",[learner.id,snapshot.learning_direction])
   ]);
   skillEvidence=evidenceRows.rows.map(row=>({skill:row.skill,score:Number(row.score),confidence:Number(row.confidence),source:row.source,taskId:row.task_id,observedAt:row.observed_at.toISOString()}));
   dueVocabularyCount=Number(dueRows.rows[0]?.count??0);
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
  const learningDecision=chooseGabrooLearningDecision({
   evidence:skillEvidence,
   learningDirection:snapshot!.learning_direction,
   dueVocabularyCount,
   learnerAskedForFreeConversation:snapshot!.mode==="free_flow"
  });
  const controller=new AbortController();
  let timeout:ReturnType<typeof setTimeout>|undefined;
  let response:{content:string};
  const abortOnDisconnect=()=>{
   if(!reply.raw.writableFinished)controller.abort();
  };
  reply.raw.once("close",abortOnDisconnect);
  try{
   const timedOut=new Promise<never>((_,reject)=>{
    timeout=setTimeout(()=>{controller.abort();reject(new Error("Gabroo provider timed out"));},PROVIDER_TIMEOUT_MS);
   });
   response=await Promise.race([
    provider.reply({
     mode:snapshot!.mode,
     supportLanguage:snapshot!.support_language,
     learningDirection:snapshot!.learning_direction,
     targetLanguage:snapshot!.target_language,
     history:[...history,{role:"user",content:parsedBody.data.message}],
     signal:controller.signal,
     learningDecision,
     teachingPolicy:buildGabrooTeachingPolicy({
      mode:snapshot!.mode,
      supportLanguage:snapshot!.support_language,
      learningDirection:snapshot!.learning_direction,
      targetLanguage:snapshot!.target_language,
      preferredName:learnerProfile?.display_name,
      learningGoal:learnerProfile?.learning_goal,
      profileCorrectionPreference:learnerProfile?.correction_mode,
      latestLearnerMessage:parsedBody.data.message,
      conversationHistory:[...history,{role:"user",content:parsedBody.data.message}],
      learnerMemory:savedMemory.map(item=>({category:item.category,memoryKey:item.memory_key,content:item.content})),
      learnerVocabulary:savedVocabulary
     })
    }),
    timedOut
   ]);
  }catch(e){
   request.log.error({request_id:request.id},"Gabroo conversation provider request failed");
   return error(reply,request.id,503,"GABROO_REPLY_UNAVAILABLE","Gabroo could not respond just now. Your message was not saved; please try again.");
  }finally{
   if(timeout)clearTimeout(timeout);
   reply.raw.off("close",abortOnDisconnect);
  }
  if(controller.signal.aborted)return reply;
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
