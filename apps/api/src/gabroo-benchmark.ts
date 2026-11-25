import {appendFile,mkdir,readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {buildGabrooTeachingPolicy,type GabrooTeachingPolicy} from "./gabroo-teaching-policy.js";
import {createOpenAICompatibleGabrooProvider,GABROO_PROVIDER_ADAPTER_VERSION} from "./gabroo-openai-provider.js";
import type {GabrooConversationMode,GabrooMessage} from "./gabroo-conversations.js";

type BenchmarkCase={
 id:string;title:string;mode:GabrooConversationMode;
 direction:"ml_to_en"|"en_to_ml";supportLanguage:"ml"|"en";stage:1|2|3|4|5;
 history:GabrooMessage[];message:string;expected:string[];critical:string[];
};
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

export function buildGabrooBenchmarkPolicy(testCase:BenchmarkCase):GabrooTeachingPolicy{
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
 return createHash("sha256").update(JSON.stringify(buildGabrooBenchmarkPolicy(testCase))).digest("hex").slice(0,16);
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
 const casesContent=await readFile(casesPath,"utf8");
 const caseFileSha256=createHash("sha256").update(casesContent).digest("hex");
 const cases=JSON.parse(casesContent) as BenchmarkCase[];
 if(!Array.isArray(cases)||cases.length===0)throw new Error("Benchmark cases must be a non-empty JSON array.");
 await mkdir(dirname(outputPath),{recursive:true});
 const provider=createOpenAICompatibleGabrooProvider({apiKey,baseUrl,model});
 let completed=0,failed=0;const completedLatencies:number[]=[];
 for(const testCase of cases){
  for(let repetition=1;repetition<=repeats;repetition++){
   const started=performance.now();let record:Record<string,unknown>;
   try{
    const response=await provider.reply({
     mode:testCase.mode,
     supportLanguage:testCase.supportLanguage,
     learningDirection:testCase.direction,
     targetLanguage:testCase.direction==="ml_to_en"?"en":"ml",
     history:[...testCase.history,{role:"user",content:testCase.message}],
     signal:AbortSignal.timeout(90_000),
     teachingPolicy:buildGabrooBenchmarkPolicy(testCase)
    });
    const content=response.content;
    record={
     caseId:testCase.id,title:testCase.title,repetition,model:response.model??model,providerBaseUrl:baseUrl,
     providerAdapterVersion:GABROO_PROVIDER_ADAPTER_VERSION,caseFileSha256,
     teachingPolicyVersion:getGabrooBenchmarkPolicyVersion(testCase),latencyMs:Math.round(performance.now()-started),
     status:"completed",response:content.trim(),usage:response.usage??null,
     expectedChecks:testCase.expected,criticalChecks:testCase.critical,
     evaluatorScore:null,evaluatorNotes:null,evaluatorRubric:GABROO_EVALUATION_DIMENSIONS.map(dimension=>({dimension,score:null,notes:null})),recordedAt:new Date().toISOString()
    };completed++;completedLatencies.push(Number(record.latencyMs));
   }catch(error){
    record={
     caseId:testCase.id,title:testCase.title,repetition,model,providerBaseUrl:baseUrl,
     providerAdapterVersion:GABROO_PROVIDER_ADAPTER_VERSION,caseFileSha256,
     teachingPolicyVersion:getGabrooBenchmarkPolicyVersion(testCase),latencyMs:Math.round(performance.now()-started),
     status:"error",error:error instanceof Error?error.message:String(error),
     evaluatorScore:null,evaluatorNotes:null,evaluatorRubric:GABROO_EVALUATION_DIMENSIONS.map(dimension=>({dimension,score:null,notes:null})),recordedAt:new Date().toISOString()
    };failed++;
   }
   await appendFile(outputPath,JSON.stringify(record)+"\n","utf8");
   console.log(String(record.status).toUpperCase()+" "+testCase.id+" "+repetition+"/"+repeats+" "+String(record.latencyMs)+"ms");
  }
 }
 console.log(JSON.stringify({model,total:cases.length*repeats,completed,failed,errorRate:(failed/(cases.length*repeats)),successfulLatencyMs:{p50:percentile(completedLatencies,0.5),p95:percentile(completedLatencies,0.95)},outputPath,policy:"live buildGabrooTeachingPolicy + production OpenAI-compatible adapter",usageNote:"Token counts are included only when the provider returns valid usage metadata."},null,2));
 if(failed>0)process.exitCode=1;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await runBenchmark();
