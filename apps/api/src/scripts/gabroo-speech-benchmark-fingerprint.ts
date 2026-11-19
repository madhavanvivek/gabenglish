import {createHash} from "node:crypto";
import {constants} from "node:fs";
import {open,readFile,realpath,stat} from "node:fs/promises";
import {isAbsolute,relative,resolve,sep} from "node:path";
import {pathToFileURL} from "node:url";
import {parseGabrooSpeechBenchmarkManifest,GABROO_BENCHMARK_MAX_AUDIO_BYTES} from "@gabenglish/contracts";

function isWithin(parent:string,child:string):boolean{
 const rel=relative(parent,child);
 return rel===""||(!rel.startsWith(".."+sep)&&rel!==".."&&!isAbsolute(rel));
}

/**
 * Fingerprint canonical manifest metadata plus the SHA-256 digest and byte length
 * of each referenced audio file. Sample ordering and audio paths do not affect
 * the digest; changing any transcript, sample metadata or audio bytes does.
 */
export async function fingerprintGabrooBenchmarkCorpus(manifestPath:string,audioRoot:string):Promise<{
 algorithm:"sha256";fingerprint:string;samples:number;totalAudioBytes:number;
 heldOut:number;tuning:number;manifestPath:string;audioRoot:string;
}>{
 const manifestReal=await realpath(resolve(manifestPath));
 const rootReal=await realpath(resolve(audioRoot));
 if(!(await stat(rootReal)).isDirectory())throw new Error("Approved audio root must be a directory.");
 const parsed=parseGabrooSpeechBenchmarkManifest(await readFile(manifestReal,"utf8"));
 if(parsed.issues.length)throw new Error("Invalid manifest lines: "+parsed.issues.map(x=>x.line).join(", "));
 if(!parsed.samples.length)throw new Error("Manifest contains no samples.");
 const canonical=[];
 let totalAudioBytes=0;
 for(const sample of [...parsed.samples].sort((a,b)=>a.sampleId.localeCompare(b.sampleId))){
  const target=resolve(rootReal,sample.audioFile);
  if(!isWithin(rootReal,target))throw new Error("Audio path escapes approved root.");
  const fileReal=await realpath(target);
  if(!isWithin(rootReal,fileReal))throw new Error("Audio symlink escapes approved root.");
  const handle=await open(fileReal,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{
   const info=await handle.stat();
   if(!info.isFile()||info.size<=0||info.size>GABROO_BENCHMARK_MAX_AUDIO_BYTES)throw new Error("Audio must be a regular non-empty file within the 10 MB limit.");
   const bytes=await handle.readFile();
   if(bytes.byteLength!==info.size||bytes.byteLength>GABROO_BENCHMARK_MAX_AUDIO_BYTES)throw new Error("Audio changed while fingerprinting.");
   const audioSha256=createHash("sha256").update(bytes).digest("hex");
   totalAudioBytes+=bytes.byteLength;
   canonical.push({
    sampleId:sample.sampleId,mode:sample.mode,environment:sample.environment,
    mimeType:sample.mimeType,durationMs:sample.durationMs,referenceText:sample.referenceText,
    split:sample.split,audioBytes:bytes.byteLength,audioSha256
   });
  }finally{await handle.close();}
 }
 const fingerprint=createHash("sha256").update(JSON.stringify({
  schema:"gabroo-corpus-fingerprint-v1",samples:canonical
 }),"utf8").digest("hex");
 return {
  algorithm:"sha256",fingerprint,samples:canonical.length,totalAudioBytes,
  heldOut:canonical.filter(x=>x.split==="held_out").length,
  tuning:canonical.filter(x=>x.split==="tuning").length,
  manifestPath:manifestReal,audioRoot:rootReal
 };
}

async function main():Promise<void>{
 const args=process.argv.slice(2);
 if(args.length!==2||args.includes("--help")||args.includes("-h")){
  process.stdout.write("Usage: pnpm --filter @gabenglish/api benchmark:fingerprint -- <manifest.jsonl> <audio-root>\\n");
  process.exitCode=args.length===0||args.includes("--help")||args.includes("-h")?0:2;return;
 }
 try{process.stdout.write(JSON.stringify(await fingerprintGabrooBenchmarkCorpus(args[0],args[1]),null,2)+"\\n");}
 catch{process.stderr.write("Corpus fingerprint failed. Check manifest and approved audio-root files.\\n");process.exitCode=1;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)void main();
