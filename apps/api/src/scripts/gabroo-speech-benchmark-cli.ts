import {readFile,realpath,stat} from "node:fs/promises";
import {isAbsolute,relative,resolve,sep} from "node:path";
import {parseGabrooSpeechBenchmarkManifest,GABROO_BENCHMARK_MAX_AUDIO_BYTES} from "@gabenglish/contracts";

export interface GabrooBenchmarkValidationSummary {
 manifestPath:string;
 audioRoot:string;
 samples:number;
 heldOut:number;
 tuning:number;
 totalAudioBytes:number;
 issues:{line:number;message:string}[];
}

function isWithin(parent:string,child:string):boolean{
 const rel=relative(parent,child);
 return rel===""||(!rel.startsWith(".."+sep)&&rel!==".."&&!isAbsolute(rel));
}

/** Validate a local manifest and its referenced files without opening or uploading audio. */
export async function validateGabrooBenchmarkFiles(manifestPath:string,audioRoot:string):Promise<GabrooBenchmarkValidationSummary>{
 const manifestReal=await realpath(resolve(manifestPath));
 const rootReal=await realpath(resolve(audioRoot));
 const manifestText=await readFile(manifestReal,"utf8");
 const parsed=parseGabrooSpeechBenchmarkManifest(manifestText);
 const issues=[...parsed.issues];
 let totalAudioBytes=0;
 for(const [index,sample] of parsed.samples.entries()){
  try{
   const candidate=resolve(rootReal,sample.audioFile);
   if(!isWithin(rootReal,candidate))throw new Error("Audio path escapes the approved audio root.");
   const fileReal=await realpath(candidate);
   if(!isWithin(rootReal,fileReal))throw new Error("Audio symlink escapes the approved audio root.");
   const info=await stat(fileReal);
   if(!info.isFile())throw new Error("Audio path is not a regular file.");
   if(info.size===0)throw new Error("Audio file is empty.");
   if(info.size>GABROO_BENCHMARK_MAX_AUDIO_BYTES)throw new Error("Audio file exceeds the 10 MB limit.");
   totalAudioBytes+=info.size;
  }catch(error){
   issues.push({line:index+1,message:error instanceof Error?error.message:"Audio file validation failed."});
  }
 }
 return {
  manifestPath:manifestReal,audioRoot:rootReal,samples:parsed.samples.length,
  heldOut:parsed.samples.filter(x=>x.split==="held_out").length,
  tuning:parsed.samples.filter(x=>x.split==="tuning").length,
  totalAudioBytes,issues
 };
}

async function main():Promise<void>{
 const args=process.argv.slice(2);
 if(args.length!==2||args.includes("--help")||args.includes("-h")){
  process.stdout.write("Usage: pnpm --filter @gabenglish/api benchmark:validate -- <manifest.jsonl> <audio-root>\\n");
  process.exitCode=args.length===0||args.includes("--help")||args.includes("-h")?0:2;
  return;
 }
 try{
  const summary=await validateGabrooBenchmarkFiles(args[0],args[1]);
  process.stdout.write(JSON.stringify(summary,null,2)+"\\n");
  if(summary.issues.length>0)process.exitCode=1;
 }catch{
  process.stderr.write("Benchmark validation failed. Check the manifest and approved audio-root paths.\\n");
  process.exitCode=1;
 }
}
if(process.argv[1]&&import.meta.url===new URL("file://"+process.argv[1]).href)void main();
