import {readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {
 parseSpeechBenchmarkJsonl,
 parseGabrooSpeechBenchmarkExperiment,
 renderGabrooSpeechBenchmarkComparison,
 gabrooSpeechHumanReviewSchema,
 type GabrooSpeechHumanReview
} from "@gabenglish/contracts";

/** Build a comparison report from local result JSONL and experiment metadata. */
export async function writeGabrooBenchmarkComparisonReport(
 resultsPath:string,experimentPath:string,outputPath:string,humanReviewsPath?:string
):Promise<{acceptedRecords:number;experimentId:string;humanReviewRecords:number}>{
 const [resultsSource,experimentSource,humanSource]=await Promise.all([
  readFile(resolve(resultsPath),"utf8"),readFile(resolve(experimentPath),"utf8"),
  humanReviewsPath?readFile(resolve(humanReviewsPath),"utf8"):Promise.resolve(undefined)
 ]);
 const parsed=parseSpeechBenchmarkJsonl(resultsSource);
 if(parsed.issues.length>0)throw new Error("Benchmark results contain invalid JSONL lines: "+parsed.issues.map(x=>x.line).join(", "));
 if(parsed.results.length===0)throw new Error("Benchmark results contain no accepted records.");
 const experiment=parseGabrooSpeechBenchmarkExperiment(experimentSource);
 let humanReviews:GabrooSpeechHumanReview[]=[];
 if(humanSource!==undefined){
  const decoded:unknown=JSON.parse(humanSource);
  if(!Array.isArray(decoded))throw new Error("Human review file must contain a JSON array.");
  humanReviews=decoded.map((entry,index)=>{
   const checked=gabrooSpeechHumanReviewSchema.safeParse(entry);
   if(!checked.success)throw new Error("Invalid human review record at index "+index+".");
   return checked.data;
  });
 }
 const markdown=renderGabrooSpeechBenchmarkComparison(experiment,parsed.results,humanReviews);
 await writeFile(resolve(outputPath),markdown,{encoding:"utf8",flag:"w"});
 return {acceptedRecords:parsed.results.length,experimentId:experiment.experimentId,humanReviewRecords:humanReviews.length};
}
async function main():Promise<void>{
 const args=process.argv.slice(2);
 if((args.length!==3&&args.length!==4)||args.includes("--help")||args.includes("-h")){
  process.stdout.write("Usage: pnpm --filter @gabenglish/api benchmark:compare -- <results.jsonl> <experiment.json> <comparison.md> [human-reviews.json]\\n");
  process.exitCode=args.length===0||args.includes("--help")||args.includes("-h")?0:2;return;
 }
 try{
  const result=await writeGabrooBenchmarkComparisonReport(args[0],args[1],args[2],args[3]);
  process.stdout.write(JSON.stringify(result,null,2)+"\\n");
 }catch{
  process.stderr.write("Benchmark comparison generation failed. Check result/experiment files and comparability.\\n");
  process.exitCode=1;
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)void main();
