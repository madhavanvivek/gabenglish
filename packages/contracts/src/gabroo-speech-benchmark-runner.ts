import {buildSpeechBenchmarkReport} from "./gabroo-speech-benchmark-report.js";
import {parseSpeechBenchmarkJsonl} from "./gabroo-speech-benchmark-input.js";
import {renderSpeechBenchmarkMarkdownReport} from "./gabroo-speech-benchmark-markdown.js";

/**
 * End-to-end, offline conversion of JSONL result text into a Markdown report.
 * Invalid lines are surfaced to the caller; valid lines are still reportable.
 */
export function generateSpeechBenchmarkMarkdown(source:string):{
 markdown:string;
 acceptedRecords:number;
 rejectedLines:{line:number;message:string}[];
}{
 const parsed=parseSpeechBenchmarkJsonl(source);
 if(parsed.results.length===0){
  return {markdown:renderSpeechBenchmarkMarkdownReport([]),acceptedRecords:0,rejectedLines:parsed.issues};
 }
 const report=buildSpeechBenchmarkReport(parsed.results);
 return {
  markdown:renderSpeechBenchmarkMarkdownReport(report),
  acceptedRecords:parsed.results.length,
  rejectedLines:parsed.issues
 };
}
