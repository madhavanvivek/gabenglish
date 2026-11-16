import type {FastifyInstance} from "fastify";
import {z} from "zod";
const submission=z.object({answers:z.array(z.object({question_id:z.string(),option_id:z.string()})).min(1).max(20)});
const questions=[
 {id:"q1",prompt:"Choose the correct sentence.",options:[{id:"a",text:"She go to work every day."},{id:"b",text:"She goes to work every day."},{id:"c",text:"She going to work every day."}],correct:"b",skill:"present_simple"},
 {id:"q2",prompt:"Complete: I have lived here ___ 2020.",options:[{id:"a",text:"since"},{id:"b",text:"for"},{id:"c",text:"from"}],correct:"a",skill:"time_prepositions"},
 {id:"q3",prompt:"Which sounds most natural?",options:[{id:"a",text:"I am having 25 years."},{id:"b",text:"I have 25 years old."},{id:"c",text:"I am 25 years old."}],correct:"c",skill:"natural_expression"},
 {id:"q4",prompt:"Choose the best response: “Would you mind opening the window?”",options:[{id:"a",text:"Not at all."},{id:"b",text:"Yes, I would mind."},{id:"c",text:"I don't mind to."}],correct:"a",skill:"everyday_conversation"},
 {id:"q5",prompt:"Choose the correct sentence.",options:[{id:"a",text:"If I knew, I would tell you."},{id:"b",text:"If I know, I would told you."},{id:"c",text:"If I had know, I tell you."}],correct:"a",skill:"conditionals"}
] as const;
export async function registerPlacementRoutes(app:FastifyInstance){
 app.get("/api/v1/placement/questions",async()=>({assessment_version:"pilot-1",questions:questions.map(({correct,...q})=>q)}));
 app.post("/api/v1/placement/score",async(request,reply)=>{
  const parsed=submission.safeParse(request.body);
  if(!parsed.success)return reply.code(400).send({error:{code:"VALIDATION_ERROR",message:"Submit between 1 and 20 valid answers.",request_id:request.id}});
  const answerMap=new Map(parsed.data.answers.map(a=>[a.question_id,a.option_id]));
  const score=questions.filter(q=>answerMap.get(q.id)===q.correct).length;
  const percentage=Math.round(score/questions.length*100);
  const suggested_stage=percentage<40?"malayalam_mode":percentage<80?"mixed_mode":"english_practice";
  return {assessment_version:"pilot-1",score,total:questions.length,percentage,suggested_stage,notice:"This short pilot assessment is a starting-point suggestion, not a formal certification. The learning path should adapt after further practice."};
 });
}
