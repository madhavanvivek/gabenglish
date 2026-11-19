import {buildSpeechBenchmarkReport,type SpeechBenchmarkResult} from "./gabroo-speech-benchmark-report.js";
import {assertComparableSpeechBenchmarkResults,type GabrooSpeechBenchmarkExperiment} from "./gabroo-speech-benchmark-experiment.js";
import {summarizeGabrooSpeechHumanReviews,type GabrooSpeechHumanReview} from "./gabroo-speech-benchmark-human-review.js";

const cell=(value:string)=>value.replace(/[|]/gu,"\\|").replace(/[\r\n]+/gu," ");
const pct=(value:number)=>(value*100).toFixed(2)+"%";

/**
 * Build a reproducible candidate comparison. This intentionally reports metrics,
 * not a winner: transcript quality requires blind human review before selection.
 */
export function renderGabrooSpeechBenchmarkComparison(
 experiment:GabrooSpeechBenchmarkExperiment,
 results:SpeechBenchmarkResult[],
 humanReviews:GabrooSpeechHumanReview[]=[]
):string{
 if(!Array.isArray(results)||results.length===0)throw new Error("Benchmark results are required.");
 const expected=new Set(experiment.candidates.map(candidate=>candidate.candidateId));
 const actual=new Set(results.map(result=>result.candidateId));
 if(expected.size!==actual.size||[...expected].some(id=>!actual.has(id))){
  throw new Error("Result candidates must exactly match the experiment candidate list.");
 }
 assertComparableSpeechBenchmarkResults(results);
 const reports=buildSpeechBenchmarkReport(results);
 const humanSummaries=humanReviews.length?summarizeGabrooSpeechHumanReviews(humanReviews):[];
 
 const dimensions=new Set(reports.map(report=>JSON.stringify([report.mode,report.environment])));
 for(const dimension of dimensions){
  const present=new Set(reports.filter(report=>JSON.stringify([report.mode,report.environment])===dimension).map(report=>report.candidateId));
  if(present.size!==expected.size||[...expected].some(id=>!present.has(id))){
   throw new Error("Every experiment candidate must have results for every compared mode/environment.");
  }
 }
 const lines=[
  "# Gabroo speech recognition candidate comparison","",
  "- Experiment: "+cell(experiment.experimentId),
  "- Started: "+experiment.startedAt,
  "- Corpus: "+cell(experiment.corpusVersion)+" (SHA-256: `"+experiment.corpusSha256+"`)",
  "- Split: "+experiment.split,
  "- Declared sample count: "+experiment.sampleCount,
  "",
  "| Candidate | Provider / model | Region | Mode | Environment | Samples | Success | WER | CER | Median ms | P95 ms | Cost / audio min |",
  "|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|"
 ];
 const candidateById=new Map(experiment.candidates.map(candidate=>[candidate.candidateId,candidate]));
 for(const report of reports){
  const candidate=candidateById.get(report.candidateId)!;
  const costPerMinute=report.estimatedCost===null||report.totalAudioSeconds<=0? "unknown":
   (report.estimatedCost/report.totalAudioSeconds*60).toFixed(4);
  lines.push("| "+[
   cell(report.candidateId),
   cell(candidate.providerName)+" / "+cell(candidate.modelVersion),
   cell(candidate.region),report.mode,report.environment,String(report.samples),
   pct(report.successRate),pct(report.wordErrorRate),pct(report.characterErrorRate),
   report.medianLatencyMs===null?"—":String(report.medianLatencyMs),
   report.p95LatencyMs===null?"—":String(report.p95LatencyMs),costPerMinute
  ].join(" | ")+" |");
 }
 lines.push("",
  "## Interpretation and release gates","",
  "- Success rate includes failed requests. WER/CER are calculated over successful transcripts only.",
  "- Cost per audio minute is unavailable when any request in a candidate group lacks a cost measurement.",
  "- CER is based on NFC-normalised Unicode code points, not grapheme clusters.",
  "- This report does not include blind Malayalam-fluent human ratings, meaning preservation, code-switch handling adjudication, or commercial/privacy approval.",
  "- Do not select or enable a provider from these metrics alone. Complete held-out human review and the legal, security, privacy and commercial decision gates first.",
  "",
  "## Human review (separate from automated WER/CER)","",
  "| Candidate | Mode | Environment | Reviewed samples | Reviewers | Meaning | Code-switch | Readability | Intelligibility | Adjudication required |",
  "|---|---|---|---:|---:|---:|---:|---:|---:|---|"
 );
 for(const summary of humanSummaries){
  lines.push("| "+[
   cell(summary.candidateId),summary.mode,summary.environment,String(summary.reviewedSamples),
   String(summary.reviewerCount),summary.meanMeaningPreservation.toFixed(2),
   summary.meanCodeSwitchHandling===null?"—":summary.meanCodeSwitchHandling.toFixed(2),
   summary.meanReadability.toFixed(2),summary.meanIntelligibility.toFixed(2),
   summary.samplesNeedingAdjudication.length?summary.samplesNeedingAdjudication.map(cell).join(", "):"No flagged samples"
  ].join(" | ")+" |");
 }
 lines.push("","Human review scores are descriptive averages, not a provider ranking. Samples with fewer than two independent reviews or material reviewer disagreement require adjudication.","","No provider is ranked or declared the winner by this report.",""
 );
 return lines.join("\\n");
}
