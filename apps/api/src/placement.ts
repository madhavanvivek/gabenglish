import type {FastifyInstance} from "fastify";
import {randomUUID} from "node:crypto";
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
type Session={id:string;name?:string;style:string;language:string;turn:number;band:number;currentPromptId:string;responses:Array<{prompt_id:string;text:string;response_mode:"text"|"voice"}>;evidence:ResponseEvidence[];created_at:number};
const sessions=new Map<string,Session>();
function responseSignal(text:string){const words=text.trim().split(/\s+/).filter(Boolean);const clauses=(text.match(/[.!?;,]/g)||[]).length;const connectors=/\b(because|although|however|therefore|while|whereas|for example|if|when|since)\b/i.test(text);const past=/\b(yesterday|last|ago|was|were|did|went|had|visited|worked)\b/i.test(text);return {wordCount:words.length,clauses,connectors,past};}
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
function chooseBand(session:Session){if(session.responses.length<2)return 1;const recent=session.responses.slice(-2).map(r=>responseSignal(r.text));const latest=recent.at(-1);if(!latest||latest.wordCount<8)return session.band;const avg=recent.reduce((n,x)=>n+x.wordCount,0)/recent.length;const advanced=recent.some(x=>x.connectors&&x.wordCount>=22);if(advanced&&avg>=25)return Math.min(5,session.band+1);if(avg>=16)return Math.min(4,Math.max(3,session.band+1));if(avg>=8)return Math.min(3,Math.max(2,session.band+1));return Math.max(1,Math.min(session.band,2));}
export async function registerPlacementRoutes(app:FastifyInstance){
 app.post("/api/v1/placement/conversation/start",async(request,reply)=>{
  const parsed=placementSessionStartSchema.safeParse(request.body??{});
  if(!parsed.success)return reply.code(400).send({error:{code:"VALIDATION_ERROR",message:"Please check your assessment preferences.",request_id:request.id}});
  const id=randomUUID();const session:Session={id,name:parsed.data.display_name,style:parsed.data.communication_style,language:parsed.data.preferred_language,turn:0,band:1,currentPromptId:"intro",responses:[],evidence:[],created_at:Date.now()};sessions.set(id,session);
  const first=prompts[0]!;
  const greeting=session.language==="ml"?"ഹായ്! ഞാൻ Gabroo. നമുക്ക് ഒരു friendly conversation തുടങ്ങാം. ഇത് exam അല്ല; നിനക്ക് പറ്റുന്ന പോലെ സംസാരിച്ചാൽ മതി. തെറ്റുകൾ വന്നാലും പ്രശ്നമില്ല.":"Hi! I'm Gabroo. Let's have a relaxed conversation. This isn't an exam, so just express yourself naturally. Mistakes are completely okay.";
  return {session_id:id,prompt_id:first.id,gabroo_message:greeting+" "+first.text,difficulty_band:1,turn_number:1,is_complete:false};
 });
 app.post("/api/v1/placement/conversation/respond",async(request,reply)=>{
  const parsed=placementConversationRequestSchema.safeParse(request.body);
  if(!parsed.success)return reply.code(400).send({error:{code:"VALIDATION_ERROR",message:"Please provide a valid conversation response.",request_id:request.id}});
  const session=sessions.get(parsed.data.session_id);if(!session)return reply.code(404).send({error:{code:"SESSION_NOT_FOUND",message:"This assessment session is no longer available. Please start again.",request_id:request.id}});
  const expected=prompts.find(p=>p.id===session.currentPromptId);if(!expected||expected.id!==parsed.data.turn.prompt_id)return reply.code(409).send({error:{code:"TURN_OUT_OF_ORDER",message:"This response does not match the current assessment question.",request_id:request.id}});
  session.responses.push({prompt_id:expected.id,text:parsed.data.turn.response,response_mode:parsed.data.turn.response_mode});
  session.evidence.push(extractResponseEvidence(expected.id,parsed.data.turn.response,parsed.data.turn.response_mode==="voice"?"voice_transcript":"text"));
  session.turn+=1;
  const nextBand=chooseBand(session);session.band=nextBand;
  const hasClarification=session.responses.some(x=>x.prompt_id==="clarify");
  const latestSignal=responseSignal(parsed.data.turn.response);
  const shouldClarify=latestSignal.wordCount<8&&!hasClarification&&session.responses.length<5;
  const next=shouldClarify?prompts.find(p=>p.id==="clarify"):prompts.find(p=>p.band===nextBand&&p.id!==expected.id&&p.id!=="clarify"&&!session.responses.some(x=>x.prompt_id===p.id))??prompts.find(p=>p.id!=="clarify"&&!session.responses.some(x=>x.prompt_id===p.id));
  const complete=!next||session.responses.length>=6;
  if(complete){const report=buildPlacementReport(session);const gabroo_explanation=buildGabrooExplanation(report);return {session_id:session.id,prompt_id:"complete",gabroo_message:"Thank you for sharing that with me. I have prepared a preliminary report from this conversation. It does not assign a learning stage yet.",difficulty_band:session.band,turn_number:session.turn+1,is_complete:true,evidence:session.evidence,report,gabroo_explanation};}
  const selected=next!;session.currentPromptId=selected.id;
  return {session_id:session.id,prompt_id:selected.id,gabroo_message:selected.text,difficulty_band:selected.band,turn_number:session.turn+1,is_complete:false};
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
