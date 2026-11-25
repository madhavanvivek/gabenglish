import { readFile, appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
const casesPath = resolve(process.env.GABROO_BENCHMARK_CASES || "docs/ai/gabroo-benchmark-cases.json");
const outputPath = resolve(process.env.GABROO_BENCHMARK_OUTPUT || "artifacts/gabroo-benchmark-results.jsonl");
const baseUrl = (process.env.GABROO_EVAL_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const apiKey = process.env.GABROO_EVAL_API_KEY || process.env.OPENAI_API_KEY;
const model = process.env.GABROO_EVAL_MODEL;
const repeats = Math.max(1, Math.min(10, Number.parseInt(process.env.GABROO_BENCHMARK_REPEATS || "3", 10) || 3));
if (!apiKey || !model) { console.error("Set GABROO_EVAL_API_KEY (or OPENAI_API_KEY) and GABROO_EVAL_MODEL. No request was sent."); process.exit(2); }
const cases = JSON.parse(await readFile(casesPath, "utf8"));
if (!Array.isArray(cases) || cases.length === 0) throw new Error("Benchmark case file must be a non-empty JSON array.");
await mkdir(dirname(outputPath), { recursive: true });
const system = ["You are Gabroo, a friendly, energetic and respectful spoken-English tutor for Malayalam-speaking learners.","Use natural, respectful Kerala Malayalam when Malayalam support is requested. Never use eda/edi by default.","Respond to the learner's immediate intent. Resolve direct doubts before resuming an earlier activity.","Keep language accessible and introduce at most one manageable stretch element per turn.","Respect conversation mode and learning direction. Do not invent learner facts or proficiency.","Text transcripts do not establish pronunciation, accent, fluency or speaking proficiency.","Be warm and concise. Ask at most one focused follow-up question."].join(" ");
let completed = 0; let failed = 0;
for (const testCase of cases) { for (let repetition = 1; repetition <= repeats; repetition++) {
 const started = performance.now();
 const messages = [{role:"system",content:system + "\nMode: " + testCase.mode + ". Learning direction: " + testCase.direction + ". Support language: " + testCase.supportLanguage + ". Stage: " + testCase.stage + "."}, ...testCase.history, {role:"user",content:testCase.message}];
 let record;
 try {
  const response = await fetch(baseUrl + "/chat/completions", {method:"POST",headers:{authorization:"Bearer " + apiKey,"content-type":"application/json"},body:JSON.stringify({model,messages,temperature:0.3}),signal:AbortSignal.timeout(90000)});
  const latencyMs = Math.round(performance.now() - started); const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Provider HTTP " + response.status + ": " + JSON.stringify(payload).slice(0,1000));
  const content = payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("Provider returned no text message.");
  record = {caseId:testCase.id,repetition,model,providerBaseUrl:baseUrl,latencyMs,status:"completed",response:content.trim(),usage:payload.usage??null,expectedChecks:testCase.expected,criticalChecks:testCase.critical,evaluatorScore:null,evaluatorNotes:null,recordedAt:new Date().toISOString()}; completed++;
 } catch (error) { record = {caseId:testCase.id,repetition,model,providerBaseUrl:baseUrl,latencyMs:Math.round(performance.now()-started),status:"error",error:error instanceof Error?error.message:String(error),evaluatorScore:null,evaluatorNotes:null,recordedAt:new Date().toISOString()}; failed++; }
 await appendFile(outputPath,JSON.stringify(record)+"\n","utf8"); console.log(record.status.toUpperCase()+" "+testCase.id+" run "+repetition+"/"+repeats+" "+record.latencyMs+"ms");
} }
console.log(JSON.stringify({model,total:cases.length*repeats,completed,failed,outputPath,note:"Responses are unscored. Qualified evaluators must assess Malayalam naturalness, English correctness and critical checks."},null,2));
if (failed > 0) process.exitCode = 1;