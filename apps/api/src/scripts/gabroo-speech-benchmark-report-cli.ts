import {readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {generateSpeechBenchmarkMarkdown} from "@gabenglish/contracts";

/** Convert benchmark JSONL results into an aggregate Markdown report. */
export async function writeGabrooBenchmarkReport(inputPath:string,outputPath:string):Promise<{acceptedRecords:number;rejectedLines:number[]}>{
 const source=await readFile(resolve(inputPath),"utf8");
 const report=generateSpeechBenchmarkMarkdown(source);
 await writeFile(resolve(outputPath),report.markdown,{encoding:"utf8",flag:"w"});
 return {acceptedRecords:report.acceptedRecords,rejectedLines:report.rejectedLines.map(issue=>issue.line)};
}
async function main():Promise<void>{
 const args=process.argv.slice(2);
 if(args.length!==2||args.includes("--help")||args.includes("-h")){
  process.stdout.write("Usage: pnpm --filter @gabenglish/api benchmark:report -- <results.jsonl> <report.md>\n");
  process.exitCode=args.length===0||args.includes("--help")||args.includes("-h")?0:2;
  return;
 }
 try{
  const result=await writeGabrooBenchmarkReport(args[0],args[1]);
  process.stdout.write(JSON.stringify(result,null,2)+"\n");
  if(result.rejectedLines.length>0||result.acceptedRecords===0)process.exitCode=1;
 }catch{
  process.stderr.write("Benchmark report generation failed. Check input and output paths.\n");
  process.exitCode=1;
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)void main();
