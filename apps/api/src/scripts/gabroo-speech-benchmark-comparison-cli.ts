import {readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {
 parseSpeechBenchmarkJsonl,
 parseGabrooSpeechBenchmarkExperiment,
 renderGabrooSpeechBenchmarkComparison
} from "@gabenglish/contracts";

/** Build a comparison report from local result JSONL and experiment metadata. */
export async function writeGabrooBenchmarkComparisonReport(
 resultsPath:string,experimentPath:string,outputPath:string
):Promise<{acceptedRecords:number;experimentId:string}>{
 const [resultsSource,experimentSource]=await Promise.all([
  readFile(resolve(resultsPath),"utf8"),readFile(resolve(experimentPath),"utf8")
 ]);
 const parsed=parseSpeechBenchmarkJsonl(resultsSource);
 if(parsed.issues.length>0)throw new Error("Benchmark results contain invalid JSONL lines: "+parsed.issues.map(x=>x.line).join(", "));
 if(parsed.results.length===0)throw new Error("Benchmark results contain no accepted records.");
 const experiment=parseGabrooSpeechBenchmarkExperiment(experimentSource);
 const markdown=renderGabrooSpeechBenchmarkComparison(experiment,parsed.results);
 await writeFile(resolve(outputPath),markdown,{encoding:"utf8",flag:"w"});
 return {acceptedRecords:parsed.results.length,experimentId:experiment.experimentId};
}
async function main():Promise<void>{
 const args=process.argv.slice(2);
 if(args.length!==3||args.includes("--help")||args.includes("-h")){
  process.stdout.write("Usage: pnpm --filter @gabenglish/api benchmark:compare -- <results.jsonl> <experiment.json> <comparison.md>\\n");
  process.exitCode=args.length===0||args.includes("--help")||args.includes("-h")?0:2;return;
 }
 try{
  const result=await writeGabrooBenchmarkComparisonReport(args[0],args[1],args[2]);
  process.stdout.write(JSON.stringify(result,null,2)+"\\n");
 }catch{
  process.stderr.write("Benchmark comparison generation failed. Check result/experiment files and comparability.\\n");
  process.exitCode=1;
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)void main();
