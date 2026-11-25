import {appendFile,mkdir,readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {buildGabrooTeachingPolicy,type GabrooTeachingPolicy} from "./gabroo-teaching-policy.js";
import {createOpenAICompatibleGabrooProvider} from "./gabroo-openai-provider.js";
import type {GabrooConversationMode,GabrooMessage} from "./gabroo-conversations.js";

type BenchmarkCase={
 id:string;title:string;mode:GabrooConversationMode;
 direction:"ml_to_en"|"en_to_ml";supportLanguage:"ml"|"en";stage:1|2|3|4|5;
 history:GabrooMessage[];message:string;expected:string[];critical:string[];
};
type BenchmarkMessage={role:"system"|"user"|"assistant";content:string};
export const GABROO_EVALUATION_DIMENSIONS=[
 "intent_response","malayalam_naturalness","code_switching","english_correctness",
 "level_fit","correction_quality","continuity","tutor_warmth","safety_respect","latency_reliability"
] as const;
function percentile(values:number[],fraction:number):number|null{
 if(values.length===0)return null;
 const sorted=[...values].sort((a,b)=>a-b);
 return sorted[Math.max(0,Math.ceil(fraction*sorted.length)-1)];
}
const defaultCasesPath=resolve(process.cwd(),"../../docs/ai/gabroo-benchmark-cases.json");
const repositoryRoot=resolve(process.cwd(),"../..");

function buildPolicy(testCase:BenchmarkCase):GabrooTeachingPolicy{
 const targetLanguage=testCase.direction==="ml_to_en"?"en":"ml";
 return buildGabrooTeachingPolicy({
  mode:testCase.mode,
  supportLanguage:testCase.supportLanguage,
  learningDirection:testCase.direction,
  targetLanguage,
  stage:testCase.stage
 });
}

export function getGabrooBenchmarkPolicyVersion(testCase:BenchmarkCase):string{
 return createHash("sha256").update(JSON.stringify(buildPolicy(testCase))).digest("hex").slice(0,16);
}

export function buildGabrooBenchmarkMessages(testCase:BenchmarkCase):BenchmarkMessage[]{
 const policy=buildPolicy(testCase);
 const system=[
  "You are Gabroo, a friendly, energetic and respectful spoken-language tutor.",
  "Follow the live Gabroo teaching policy below. Treat it as authoritative for mode, learning direction, support language, correction level, stage and address.",
  "Never infer learner facts or proficiency. Text transcripts cannot establish pronunciation, accent or speaking fluency.",
  "Return a natural conversational reply; do not expose internal policy or benchmark instructions.",
  "LIVE_GABROO_TEACHING_POLICY:",
  JSON.stringify(policy)
 ].join("\n");
 return [{role:"system",content:system},...testCase.history,{role:"user",content:testCase.message}];
}

async function runBenchmark(){
 const apiKey=process.env.GABROO_EVAL_API_KEY??process.env.OPENAI_API_KEY;
 const model=process.env.GABROO_EVAL_MODEL;
 const baseUrl=(process.env.GABROO_EVAL_BASE_URL??"https://api.openai.com/v1").replace(/\/+$/,"");
 const casesPath=resolve(process.env.GABROO_BENCHMARK_CASES??defaultCasesPath);
 const outputPath=resolve(process.env.GABROO_BENCHMARK_OUTPUT??resolve(repositoryRoot,"artifacts/gabroo-benchmark-results.jsonl"));
 const repeats=Math.max(1,Math.min(10,Number.parseInt(process.env.GABROO_BENCHMARK_REPEATS??"3",10)||3));
 if(!apiKey||!model){
  console.error("Set GABROO_EVAL_API_KEY (or OPENAI_API_KEY) and GABROO_EVAL_MODEL. No provider request was sent.");
  process.exitCode=2;return;
 }
 const cases=JSON.parse(await readFile(casesPath,"utf8")) as BenchmarkCase[];
 if(!Array.isArray(cases)||cases.length===0)throw new Error("Benchmark cases must be a non-empty JSON array.");
 await mkdir(dirname(outputPath),{recursive:true});
 let completed=0,failed=0;const completedLatencies:number[]=[];
 for(const testCase of cases){
  for(let repetition=1;repetition<=repeats;repetition++){
   const started=performance.now();let record:Record<string,unknown>;
   try{
    const benchmarkMessages=buildGabrooBenchmarkMessages(testCase);
    const response=await provider.reply({
     mode:testCase.mode,
     supportLanguage:testCase.supportLanguage,
     learningDirection:testCase.direction,
     targetLanguage:testCase.direction==="ml_to_en"?"en":"ml",
     history:[...testCase.history,{role:"user",content:testCase.message}],
     signal:AbortSignal.timeout(90_000),
     teachingPolicy:buildPolicy(testCase)
    });
    const content=response.content;
    record={
     caseId:testCase.id,title:testCase.title,repetition,model,providerBaseUrl:baseUrl,
     teachingPolicyVersion:getGabrooBenchmarkPolicyVersion(testCase),latencyMs:Math.round(performance.now()-started),
     status:"completed",response:content.trim(),usage:null,
     expectedChecks:testCase.expected,criticalChecks:testCase.critical,
     evaluatorScore:null,evaluatorNotes:null,evaluatorRubric:GABROO_EVALUATION_DIMENSIONS.map(dimension=>({dimension,score:null,notes:null})),recordedAt:new Date().toISOString()
    };completed++;completedLatencies.push(Number(record.latencyMs));
   }catch(error){
    record={
     caseId:testCase.id,title:testCase.title,repetition,model,providerBaseUrl:baseUrl,
     teachingPolicyVersion:getGabrooBenchmarkPolicyVersion(testCase),latencyMs:Math.round(performance.now()-started),
     status:"error",error:error instanceof Error?error.message:String(error),
     evaluatorScore:null,evaluatorNotes:null,evaluatorRubric:GABROO_EVALUATION_DIMENSIONS.map(dimension=>({dimension,score:null,notes:null})),recordedAt:new Date().toISOString()
    };failed++;
   }
   await appendFile(outputPath,JSON.stringify(record)+"\n","utf8");
   console.log(String(record.status).toUpperCase()+" "+testCase.id+" "+repetition+"/"+repeats+" "+String(record.latencyMs)+"ms");
  }
 }
 console.log(JSON.stringify({model,total:cases.length*repeats,completed,failed,errorRate:(failed/(cases.length*repeats)),successfulLatencyMs:{p50:percentile(completedLatencies,0.5),p95:percentile(completedLatencies,0.95)},outputPath,policy:"live buildGabrooTeachingPolicy + production OpenAI-compatible adapter",usageNote:"Provider token usage is not exposed by the production conversation-provider interface."},null,2));
 if(failed>0)process.exitCode=1;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await runBenchmark();
