import {createHash} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import {dirname,relative,resolve,sep} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {createGoogleCloudTtsProvider} from "../google-cloud-tts-provider.js";

const CANDIDATES=[
 {blindCode:"VOICE-01",voice:"ml-IN-Standard-B",family:"Standard"},
 {blindCode:"VOICE-02",voice:"ml-IN-Standard-D",family:"Standard"},
 {blindCode:"VOICE-03",voice:"ml-IN-Wavenet-B",family:"WaveNet"},
 {blindCode:"VOICE-04",voice:"ml-IN-Wavenet-D",family:"WaveNet"}
] as const;

const REPOSITORY_ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"../../../..");
const DEFAULT_OUTPUT_DIRECTORY=resolve(REPOSITORY_ROOT,".local/gabroo-voice-auditions");

function isWithin(parent:string,child:string):boolean{
 const rel=relative(parent,child);
 return rel===""||(!rel.startsWith(".."+sep)&&rel!==".."&&!resolve(rel).startsWith(sep));
}

export function resolveGabrooAuditionOutputDirectory(configured?:string):string{
 const candidate=configured?resolve(REPOSITORY_ROOT,configured):DEFAULT_OUTPUT_DIRECTORY;
 if(isWithin(REPOSITORY_ROOT,candidate)&&!isWithin(DEFAULT_OUTPUT_DIRECTORY,candidate)){
  throw new Error("Audition samples inside the repository must remain under the git-ignored .local/gabroo-voice-auditions directory.");
 }
 return candidate;
}

const SEGMENTS=[
 {id:"01-greeting",label:"Greeting and introduction",text:"ഹായ്, വിവേക്! ഞാൻ ഗബ്രൂ. ഇന്ന് നമുക്ക് ഇംഗ്ലീഷ് കുറച്ച് കുറച്ചായി, സുഖമായി പഠിക്കാം. തെറ്റുകൾ വന്നാലും പ്രശ്നമില്ല. ഞാൻ കൂടെയുണ്ട്!"},
 {id:"02-code-switch",label:"Natural Malayalam-English code-switch",text:"നിങ്ങൾ ഇന്ന് എന്താണ് ചെയ്തത്? അത് ആദ്യം മലയാളത്തിൽ പറയാം. പിന്നെ നമുക്ക് അതേ കാര്യം simple English-ൽ പറയാൻ ശ്രമിക്കാം."},
 {id:"03-english-clarity",label:"English teaching clarity",text:"Try this sentence: ‘I went to the market yesterday.’ Listen once, then say it in your own voice. Take your time."},
 {id:"04-gentle-correction",label:"Gentle correction",text:"നല്ല ശ്രമം! ചെറിയൊരു മാറ്റം മാത്രം മതി. ‘I go yesterday’ എന്നതിന് പകരം ‘I went yesterday’ എന്ന് പറയാം. കാരണം yesterday കഴിഞ്ഞുപോയ സമയമാണ്. ഒന്ന് കൂടി ശ്രമിക്കാമോ?"},
 {id:"05-friendly-humour",label:"Friendly humour",text:"Grammar-നെ പേടിക്കണ്ട! അത് ഒരു വലിയ monster ഒന്നുമല്ല. നമുക്ക് ഓരോ ചെറിയ step ആയി പിടിച്ചെടുക്കാം."},
 {id:"06-patient-response",label:"Patient response",text:"സമയം എടുത്തോളൂ. വേഗത്തിൽ പറയേണ്ട കാര്യമില്ല. നിങ്ങൾക്ക് എളുപ്പമുള്ള രീതിയിൽ പറയൂ. ആവശ്യമെങ്കിൽ ഞാൻ പതുക്കെ വീണ്ടും പറയാം."},
 {id:"07-follow-up",label:"Follow-up question",text:"ഇപ്പോൾ നിങ്ങൾക്ക് ഇഷ്ടമുള്ള ഒരു ഭക്ഷണത്തെക്കുറിച്ച് രണ്ട് ചെറിയ English sentences പറയാമോ?"}
] as const;

export async function createGabrooGoogleTtsAuditionPack(options:{
 apiKey:string;
 outputDirectory:string;
 synthesize?:(voice:string,text:string)=>Promise<Uint8Array>;
}):Promise<{outputDirectory:string;candidateCount:number;sampleCount:number}>{
 if(!options.apiKey.trim())throw new Error("A server-side Google Cloud TTS API key is required.");
 const outputDirectory=resolve(options.outputDirectory);
 await mkdir(outputDirectory,{recursive:true});
 const synthesize=options.synthesize??(async(voice,text)=>{
  const provider=createGoogleCloudTtsProvider({
   GABROO_GOOGLE_TTS_API_KEY:options.apiKey,
   GABROO_GOOGLE_TTS_VOICE:voice,
   GABROO_GOOGLE_TTS_LANGUAGE_CODE:"ml-IN"
  });
  if(!provider)throw new Error("Google Cloud TTS provider could not be configured.");
  const result=await provider.synthesize({text,speed:1,signal:new AbortController().signal});
  return result.audio;
 });
 const reviewerManifest={
  title:"Gabroo blind voice audition",
  locale:"ml-IN",
  format:"audio/mpeg",
  generated_at:new Date().toISOString(),
  script_sha256:createHash("sha256").update(JSON.stringify(SEGMENTS)).digest("hex"),
  instructions:"Listen in a randomized order. Score each blind code independently using docs/ai/GABROO_VOICE_AUDITION_PROTOCOL.md. This packet does not approve a voice.",
  candidates:[] as {blind_code:string;samples:{sample_id:string;label:string;file:string}[]}[]
 };
 const privateMapping:{blind_code:string;provider:string;voice_id:string;model_family:string}[]=[];
 let sampleCount=0;
 for(const candidate of CANDIDATES){
  const candidateDirectory=resolve(outputDirectory,candidate.blindCode);
  await mkdir(candidateDirectory,{recursive:true});
  const samples:{sample_id:string;label:string;file:string}[]=[];
  for(const segment of SEGMENTS){
   const audio=await synthesize(candidate.voice,segment.text);
   if(audio.byteLength===0)throw new Error("Provider returned empty audio for "+candidate.blindCode+"/"+segment.id+".");
   const filename=segment.id+".mp3";
   await writeFile(resolve(candidateDirectory,filename),audio,{mode:0o600});
   samples.push({sample_id:segment.id,label:segment.label,file:candidate.blindCode+"/"+filename});
   sampleCount+=1;
  }
  reviewerManifest.candidates.push({blind_code:candidate.blindCode,samples});
  privateMapping.push({blind_code:candidate.blindCode,provider:"Google Cloud Text-to-Speech",voice_id:candidate.voice,model_family:candidate.family});
 }
 await writeFile(resolve(outputDirectory,"reviewer-manifest.json"),JSON.stringify(reviewerManifest,null,2)+"\n",{mode:0o600});
 await writeFile(resolve(outputDirectory,"mapping.private.json"),JSON.stringify({
  warning:"RESTRICTED: do not share this file with blind reviewers.",
  generated_at:reviewerManifest.generated_at,
  candidates:privateMapping
 },null,2)+"\n",{mode:0o600});
 return {outputDirectory,candidateCount:CANDIDATES.length,sampleCount};
}

async function main():Promise<void>{
 const args=process.argv.slice(2);
 if(args.includes("--help")||args.includes("-h")){
  process.stdout.write("Usage: pnpm --filter @gabenglish/api audition:google-tts -- --confirm-provider-usage\n");
  process.stdout.write("Requires GABROO_GOOGLE_TTS_API_KEY. Optional GABROO_AUDITION_OUTPUT_DIR defaults to .local/gabroo-voice-auditions. Generates 28 paid-or-quota-counted samples across four candidate voices.\n");
  return;
 }
 if(!args.includes("--confirm-provider-usage")){
  process.stderr.write("No provider requests were made. Re-run with --confirm-provider-usage only after confirming Google Cloud access, billing and usage limits.\n");
  process.exitCode=2;
  return;
 }
 const apiKey=process.env.GABROO_GOOGLE_TTS_API_KEY?.trim();
 if(!apiKey){
  process.stderr.write("GABROO_GOOGLE_TTS_API_KEY is not configured. No provider requests were made.\n");
  process.exitCode=2;
  return;
 }
 try{
  const result=await createGabrooGoogleTtsAuditionPack({
   apiKey,
   outputDirectory:resolveGabrooAuditionOutputDirectory(process.env.GABROO_AUDITION_OUTPUT_DIR)
  });
  process.stdout.write(JSON.stringify(result,null,2)+"\n");
  process.stdout.write("Keep mapping.private.json restricted. Share only the blind-coded MP3 folders and reviewer-manifest.json.\n");
 }catch{
  process.stderr.write("Gabroo voice audition stopped. Check the server-side key, Google TTS access, quota and local output directory. Partial samples may exist; no voice was approved.\n");
  process.exitCode=1;
 }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)void main();
