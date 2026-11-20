import type {FastifyInstance} from "fastify";
import {randomUUID} from "node:crypto";
import type {Pool} from "pg";
import type {AppConfig} from "./config.js";
import {authenticateLearner} from "./auth.js";
import {z} from "zod";
import {placementSessionStartSchema,placementConversationRequestSchema} from "@gabenglish/contracts";
import {extractResponseEvidence, type ResponseEvidence} from "./placement-evidence.js";

const legacySubmission=z.object({answers:z.array(z.object({question_id:z.string(),option_id:z.string()})).min(1).max(20)});
const quiz=[{id:"q1",prompt:"Choose the correct sentence.",options:[{id:"a",text:"She go to work every day."},{id:"b",text:"She goes to work every day."},{id:"c",text:"She going to work every day."}],correct:"b"},{id:"q2",prompt:"Complete: I have lived here ___ 2020.",options:[{id:"a",text:"since"},{id:"b",text:"for"},{id:"c",text:"from"}],correct:"a"},{id:"q3",prompt:"Which sounds most natural?",options:[{id:"a",text:"I am having 25 years."},{id:"b",text:"I have 25 years old."},{id:"c",text:"I am 25 years old."}],correct:"c"},{id:"q4",prompt:"Choose the best response: “Would you mind opening the window?”",options:[{id:"a",text:"Not at all."},{id:"b",text:"Yes, I would mind."},{id:"c",text:"I don't mind to."}],correct:"a"},{id:"q5",prompt:"Choose the correct sentence.",options:[{id:"a",text:"If I knew, I would tell you."},{id:"b",text:"If I know, I would told you."},{id:"c",text:"If I had know, I tell you."}],correct:"a"}] as const;

type Prompt={id:string;band:number;text:string};
const prompts:Prompt[]=[
{id:"intro",band:1,text:"ഹായ്! ഞാൻ Gabroo. നമുക്ക് പരിചയപ്പെടാം. What is your name, and where are you from?"},
{id:"routine",band:1,text:"Nice to meet you! Tell me about a normal day in your life. What do you usually do?"},
{id:"clarify",band:1,text:"No rush! Could you tell me a little more about that? You can use simple English, and I can help if you need it."},
{id:"past",band:2,text:"Sounds interesting. Tell me about something you did last weekend. What happened?"},
{id:"reason",band:3,text:"What is one skill you would like to improve, and why is it important to you? Explain your reasons."},
{id:"opinion",band:4,text:"Some people believe that learning online is more effective than learning in a classroom. What is your view? Give examples."},
{id:"scenario",band:5,text:"Imagine you are leading a team through an unexpected project delay. Explain how you would communicate the situation, handle disagreement and regain the client's confidence."}
];
type Session={id:string;userId:string;name?:string;style:string;language:string;turn:number;band:number;revision:number;clarificationCount:number;currentPromptId:string;responses:Array<{prompt_id:string;text:string;response_mode:"text"|"voice"}>;evidence:ResponseEvidence[];created_at:number;lastTurn?:{prompt_id:string;response:string;response_mode:"text"|"voice";result:Record<string,unknown>}};
const sessions=new Map<string,Session>();
const SESSION_TTL_MS=30*60*1000;
const MAX_ACTIVE_SESSIONS=1000;
export function isPlacementSessionExpired(createdAt:number,now=Date.now()){return now-createdAt>SESSION_TTL_MS;}
function pruneSessions(now=Date.now()){for(const [id,session] of sessions){if(isPlacementSessionExpired(session.created_at,now))sessions.delete(id);}while(sessions.size>=MAX_ACTIVE_SESSIONS){const oldest=sessions.keys().next().value as string|undefined;if(!oldest)break;sessions.delete(oldest);}}
function countWords(text:string){return text.match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}'’-]*/gu)?.length??0;}
const CORE_PROMPT_IDS=["intro","routine","past","reason","opinion","scenario"] as const;
/** Conservative routing only: never infer proficiency from sample length or surface markers. */
function selectNextPrompt(session:Session,currentPromptId:string,response:string):Prompt|undefined{
 const coreResponseCount=session.responses.filter(item=>item.prompt_id!=="clarify").length;
 if(currentPromptId!=="clarify"&&countWords(response)<8&&session.clarificationCount<2&&coreResponseCount<CORE_PROMPT_IDS.length){
  session.clarificationCount+=1;
  return prompts.find(prompt=>prompt.id==="clarify");
 }
 const nextId=CORE_PROMPT_IDS[coreResponseCount];
 return nextId?prompts.find(prompt=>prompt.id===nextId):undefined;
}
function buildPlacementReport(session:Session){
 const patterns=[...new Set(session.evidence.flatMap(item=>item.observations))];
 const limitations=[...new Set(session.evidence.flatMap(item=>item.limitations))];
 const sources=new Set(session.evidence.map(item=>item.source));
 const assessment_mode=sources.size>1?"mixed":sources.has("voice_transcript")?"voice_transcript":"text";
 return {
  status:"provisional" as const,
  recommendation_status:"not_yet_available" as const,
  assessment_mode,
  response_count:session.evidence.length,
  extended_samples:session.evidence.filter(item=>item.sampleSize==="extended").length,
  brief_samples:session.evidence.filter(item=>item.sampleSize==="brief").length,
  response_metrics:{
   average_words_per_response:session.evidence.length?Math.round(session.evidence.reduce((sum,item)=>sum+item.metrics.wordCount,0)/session.evidence.length*10)/10:0,
   average_unique_word_ratio:session.evidence.length?Math.round(session.evidence.reduce((sum,item)=>sum+item.metrics.uniqueWordRatio,0)/session.evidence.length*100)/100:0,
   average_words_per_sentence:session.evidence.length?Math.round(session.evidence.reduce((sum,item)=>sum+item.metrics.averageWordsPerSentence,0)/session.evidence.length*10)/10:0
  },
  observed_patterns:patterns,
  limitations,
  next_steps:[
   "Complete a reviewed set of vocabulary, grammar, comprehension and communication activities before receiving a learning-stage recommendation.",
   "Use a consent-based voice assessment if you want speaking and pronunciation feedback.",
   "You can begin with Malayalam-supported lessons at any time; this conversation does not lock your learning path."
  ]
 };
}
function buildGabrooExplanation(report:ReturnType<typeof buildPlacementReport>){
 const sample=report.extended_samples>0
  ?"You shared a few longer answers, which gives us some useful examples to work with."
  :"Your answers were mostly brief, so I would like to learn a little more before suggesting a level.";
 const mode=report.assessment_mode==="text"
  ?"Because we used text, I cannot assess your pronunciation or confirm spoken fluency."
  :"This transcript-based conversation still cannot verify pronunciation; that needs a separate audio assessment.";
 return `Thanks for chatting with me! ${sample} I’m not going to guess your English level from this short conversation. ${mode} We can build a clearer picture with a few guided activities, and you can start with Malayalam support whenever you like.`;
}

export async function registerPlacementRoutes(app:FastifyInstance,pool:Pool|undefined,config:AppConfig){
 const getSession=async(id:string)=>{if(pool){const found=await pool.query<{state:Session;expired:boolean}>("SELECT state,expires_at<=now() AS expired FROM placement_sessions WHERE id=$1",[id]);const row=found.rows[0];return row?{session:row.state,expired:row.expired}:undefined;}const session=sessions.get(id);return session?{session,expired:isPlacementSessionExpired(session.created_at)}:undefined;};
 const saveSession=async(session:Session):Promise<boolean>=>{
  if(pool){
   if(session.revision===0){
    session.revision=1;
    await pool.query("INSERT INTO placement_sessions(id,user_id,state,created_at,expires_at,updated_at) VALUES($1,$2,$3::jsonb,to_timestamp($4/1000.0),to_timestamp($4/1000.0)+interval '30 minutes',now())",[session.id,session.userId,JSON.stringify(session),session.created_at]);
    return true;
   }
   const expectedRevision=session.revision;
   const nextState={...session,revision:expectedRevision+1};
   const updated=await pool.query("UPDATE placement_sessions SET state=$2::jsonb,updated_at=now() WHERE id=$1 AND (state->>'revision')::integer=$3 AND expires_at>now() RETURNING id",[session.id,JSON.stringify(nextState),expectedRevision]);
   if(updated.rows.length===0)return false;
   session.revision=nextState.revision;
   return true;
  }
  session.revision+=1;
  sessions.set(session.id,session);
  return true;
 };
 const deleteSession=async(id:string)=>{if(pool)await pool.query("DELETE FROM placement_sessions WHERE id=$1",[id]);else sessions.delete(id);};
 const persistCompletedReport=async(session:Session,result:Record<string,unknown>)=>{
  if(!pool||result.is_complete!==true||!result.report)return;
  const report=result.report as {assessment_mode?:"text"|"voice_transcript"|"mixed"};
  await pool.query(
   "INSERT INTO free_diagnostic_reports(user_id,placement_session_id,report,gabroo_explanation,assessment_mode) VALUES($1,$2,$3::jsonb,$4,$5) ON CONFLICT(placement_session_id) DO NOTHING",
   [session.userId,session.id,JSON.stringify(result.report),String(result.gabroo_explanation??""),report.assessment_mode??"text"]
  );
 };


 app.get("/api/v1/placement/reports/latest",async(request,reply)=>{
  if(!pool)return reply.code(503).send({error:{code:"DATABASE_UNAVAILABLE",message:"Your saved report is temporarily unavailable.",request_id:request.id}});
  const learner=await authenticateLearner(request,pool,config);
  if(!learner)return reply.code(401).send({error:{code:"VERIFIED_ACCOUNT_REQUIRED",message:"Please sign in with your verified account to view your report.",request_id:request.id}});
  const found=await pool.query<{id:string;report:Record<string,unknown>;gabroo_explanation:string;assessment_mode:string;learning_direction:"ml_to_en"|"en_to_ml";target_language:"en"|"ml";created_at:Date}>(
   "SELECT id,report,gabroo_explanation,assessment_mode,learning_direction,target_language,created_at FROM free_diagnostic_reports WHERE user_id=$1 AND learning_direction=COALESCE((SELECT learning_direction FROM user_preferences WHERE user_id=$1),'ml_to_en') ORDER BY created_at DESC LIMIT 1",[learner.id]
  );
  if(!found.rows[0])return reply.code(404).send({error:{code:"REPORT_NOT_FOUND",message:"You have not completed a free analysis yet.",request_id:request.id}});
  return {report_id:found.rows[0].id,report:found.rows[0].report,gabroo_explanation:found.rows[0].gabroo_explanation,assessment_mode:found.rows[0].assessment_mode,learning_direction:found.rows[0].learning_direction,target_language:found.rows[0].target_language,created_at:found.rows[0].created_at,access:"free"};
 });

 app.post("/api/v1/placement/conversation/start",async(request,reply)=>{
  if(!pool&&config.NODE_ENV!=="test")return reply.code(503).send({error:{code:"DATABASE_UNAVAILABLE",message:"Sign-in is required before starting your free analysis.",request_id:request.id}});
  const learner=pool?await authenticateLearner(request,pool,config):{id:"test-only-learner"};
  if(!learner)return reply.code(401).send({error:{code:"VERIFIED_ACCOUNT_REQUIRED",message:"Please register or sign in with a verified email or phone before starting your free analysis.",request_id:request.id}});
  const parsed=placementSessionStartSchema.safeParse(request.body??{});
  if(!parsed.success)return reply.code(400).send({error:{code:"VALIDATION_ERROR",message:"Please check your assessment preferences.",request_id:request.id}});
  if(pool){
   const preference=await pool.query<{learning_direction:"ml_to_en"|"en_to_ml"}>("SELECT learning_direction FROM user_preferences WHERE user_id=$1",[learner.id]);
   if(preference.rows[0]?.learning_direction==="en_to_ml")return reply.code(409).send({error:{code:"DIRECTION_ASSESSMENT_UNAVAILABLE",message:"The Malayalam-learning assessment is still being prepared. Your course preference is saved; please switch to English through Malayalam only if you want to take the currently available English analysis.",request_id:request.id}});
  }
  pruneSessions();
  if(pool)await pool.query("DELETE FROM placement_sessions WHERE expires_at<=now()");
  const id=randomUUID();const session:Session={id,userId:learner.id,name:parsed.data.display_name,style:parsed.data.communication_style,language:parsed.data.preferred_language,turn:0,band:1,revision:0,clarificationCount:0,currentPromptId:"intro",responses:[],evidence:[],created_at:Date.now()};await saveSession(session);
  const first=prompts[0]!;
  const greeting=session.language==="ml"?"ഹായ്! ഞാൻ Gabroo. നമുക്ക് ഒരു friendly conversation തുടങ്ങാം. ഇത് exam അല്ല; നിനക്ക് പറ്റുന്ന പോലെ സംസാരിച്ചാൽ മതി. തെറ്റുകൾ വന്നാലും പ്രശ്നമില്ല.":"Hi! I'm Gabroo. Let's have a relaxed conversation. This isn't an exam, so just express yourself naturally. Mistakes are completely okay.";
  return {session_id:id,prompt_id:first.id,gabroo_message:greeting+" "+first.text,difficulty_band:1,turn_number:1,is_complete:false};
 });
 app.post("/api/v1/placement/conversation/respond",async(request,reply)=>{
  if(!pool&&config.NODE_ENV!=="test")return reply.code(503).send({error:{code:"DATABASE_UNAVAILABLE",message:"Sign in to continue your free analysis.",request_id:request.id}});
  const learner=pool?await authenticateLearner(request,pool,config):{id:"test-only-learner"};
  if(!learner)return reply.code(401).send({error:{code:"VERIFIED_ACCOUNT_REQUIRED",message:"Please sign in with your verified account to continue.",request_id:request.id}});
  const parsed=placementConversationRequestSchema.safeParse(request.body);
  if(!parsed.success)return reply.code(400).send({error:{code:"VALIDATION_ERROR",message:"Please provide a valid conversation response.",request_id:request.id}});
  const stored=await getSession(parsed.data.session_id);if(!stored)return reply.code(404).send({error:{code:"SESSION_NOT_FOUND",message:"This assessment session is no longer available. Please start again.",request_id:request.id}});
  const session=stored.session;
  if(session.userId!==learner.id)return reply.code(404).send({error:{code:"SESSION_NOT_FOUND",message:"This assessment session is not available for this account.",request_id:request.id}});
  if(stored.expired||isPlacementSessionExpired(session.created_at)){await deleteSession(session.id);return reply.code(410).send({error:{code:"SESSION_EXPIRED",message:"This assessment session has expired. Please start again.",request_id:request.id}});}
  const incoming=parsed.data.turn;
  if(session.lastTurn?.prompt_id===incoming.prompt_id){
   if(session.lastTurn.response===incoming.response&&session.lastTurn.response_mode===incoming.response_mode){await persistCompletedReport(session,session.lastTurn.result);return reply.send(session.lastTurn.result);}
   return reply.code(409).send({error:{code:"TURN_ALREADY_SUBMITTED",message:"This question has already been answered. Continue with the latest question.",request_id:request.id}});
  }
  const expected=prompts.find(p=>p.id===session.currentPromptId);if(!expected||expected.id!==incoming.prompt_id)return reply.code(409).send({error:{code:"TURN_OUT_OF_ORDER",message:"This response does not match the current assessment question.",request_id:request.id}});
  session.responses.push({prompt_id:expected.id,text:incoming.response,response_mode:incoming.response_mode});
  if(expected.id!=="clarify")session.evidence.push(extractResponseEvidence(expected.id,parsed.data.turn.response,parsed.data.turn.response_mode==="voice"?"voice_transcript":"text"));
  session.turn+=1;
  const next=selectNextPrompt(session,expected.id,incoming.response);
  const complete=!next;
  let result:Record<string,unknown>;
  if(complete){const report=buildPlacementReport(session);const gabroo_explanation=buildGabrooExplanation(report);const evidence=session.evidence.map(item=>({prompt_id:item.promptId,source:item.source,observed_skills:item.observedSkills,observations:item.observations,sample_size:item.sampleSize,limitations:item.limitations,metrics:{word_count:item.metrics.wordCount,unique_word_count:item.metrics.uniqueWordCount,unique_word_ratio:item.metrics.uniqueWordRatio,average_words_per_sentence:item.metrics.averageWordsPerSentence,sentence_count:item.metrics.sentenceCount,connector_count:item.metrics.connectorCount,has_past_reference:item.metrics.hasPastReference,has_reasoning_marker:item.metrics.hasReasoningMarker}}));result={session_id:session.id,prompt_id:"complete",gabroo_message:"Thank you for sharing that with me. I have prepared a preliminary report from this conversation. It does not assign a learning stage yet.",difficulty_band:session.band,turn_number:session.turn+1,is_complete:true,evidence,report,gabroo_explanation};}
  else {const selected=next!;session.currentPromptId=selected.id;session.band=selected.band;result={session_id:session.id,prompt_id:selected.id,gabroo_message:selected.text,difficulty_band:selected.band,turn_number:session.turn+1,is_complete:false};}
  session.lastTurn={prompt_id:incoming.prompt_id,response:incoming.response,response_mode:incoming.response_mode,result};
  const saved=await saveSession(session);
  if(!saved)return reply.code(409).send({error:{code:"SESSION_UPDATED",message:"This assessment changed while your response was being saved. Please retry the same answer to continue.",request_id:request.id}});
  await persistCompletedReport(session,result);
  return result;
 });
 app.get("/api/v1/placement/questions",async()=>({assessment_version:"pilot-1",questions:quiz.map(({correct,...q})=>q)}));
 app.post("/api/v1/placement/score",async(request,reply)=>{
  const parsed=legacySubmission.safeParse(request.body);
  if(!parsed.success)return reply.code(400).send({error:{code:"VALIDATION_ERROR",message:"Submit between 1 and 20 valid answers.",request_id:request.id}});
  const answerMap=new Map(parsed.data.answers.map(a=>[a.question_id,a.option_id]));const score=quiz.filter(q=>answerMap.get(q.id)===q.correct).length;const percentage=Math.round(score/quiz.length*100);
  const suggested_stage=percentage<40?"malayalam_mode":percentage<80?"mixed_mode":"english_practice";
  return {assessment_version:"pilot-1",score,total:quiz.length,percentage,suggested_stage,notice:"This short pilot assessment is a starting-point suggestion, not a formal certification."};
 });
}
