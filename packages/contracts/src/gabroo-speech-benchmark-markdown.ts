import type {SpeechBenchmarkGroupReport} from "./gabroo-speech-benchmark-report.js";

/** Render aggregate metrics as a Markdown table; no raw transcript/audio is included. */
export function renderSpeechBenchmarkMarkdownReport(reports:SpeechBenchmarkGroupReport[]):string{
 if(!Array.isArray(reports))throw new TypeError("Benchmark reports must be an array.");
 const lines=[
  "# Gabroo speech benchmark results",
  "",
  "| Candidate | Mode | Environment | Samples | Success | WER | CER | Median ms | P95 ms | Audio sec | Cost |",
  "|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|"
 ];
 const cell=(value:string)=>value.replace(/\|/gu,"\\|").replace(/[\r\n]+/gu," ");
 const pct=(value:number)=>(value*100).toFixed(2)+"%";
 for(const report of reports){
  lines.push("| "+[
   cell(report.candidateId),report.mode,report.environment,
   String(report.samples),pct(report.successRate),pct(report.wordErrorRate),
   pct(report.characterErrorRate),
   report.medianLatencyMs===null?"—":String(report.medianLatencyMs),
   report.p95LatencyMs===null?"—":String(report.p95LatencyMs),
   report.totalAudioSeconds.toFixed(2),
   report.estimatedCost===null?"unknown":report.estimatedCost.toFixed(4)
  ].join(" | ")+" |");
 }
 lines.push("","WER/CER are calculated over successful transcripts only; success rate includes failed requests. Cost is shown only when every sample has a cost measurement.","");
 return lines.join("\n");
}
