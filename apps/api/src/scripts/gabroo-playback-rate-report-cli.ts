import {readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {summarizeGabrooPlaybackRateTrials,GABROO_PLAYBACK_RATE_LIMITS,GABROO_PLAYBACK_RATE_TEST_POINTS,type GabrooPlaybackRateTrial} from "@gabenglish/contracts";

/** Render a privacy-conscious playback-rate quality report from local trial JSON. */
export function renderGabrooPlaybackRateReport(trials:GabrooPlaybackRateTrial[]):string {
 const rows=summarizeGabrooPlaybackRateTrials(trials);
 const lines=[
  "# Gabroo playback-rate quality report","",
  "This report describes observed playback trials. It does not rank or select a voice.",
  "## Test configuration","",
  `- Supported rate range: ${GABROO_PLAYBACK_RATE_LIMITS.min}×–${GABROO_PLAYBACK_RATE_LIMITS.max}×`,
  `- Increment: ${GABROO_PLAYBACK_RATE_LIMITS.step}×`,
  `- Recommended test points: ${GABROO_PLAYBACK_RATE_TEST_POINTS.join(", ")}×`,
  "- Client rate adjustment and provider re-synthesis are reported separately.",
  "- Intelligibility and naturalness are subjective 1–5 reviewer ratings; they are not speech-recognition accuracy metrics.",
  "## Results","",
  "| Blind voice | Rate | Trials | Completed | Mean intelligibility | Mean naturalness | Artifact tags | Client-rate trials | Re-synthesis trials |",
  "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
  ...rows.map(x=>`| ${x.blindCode} | ${x.rate.toFixed(2)}× | ${x.trialCount} | ${x.completedCount} | ${x.meanIntelligibility.toFixed(2)}/5 | ${x.meanNaturalness.toFixed(2)}/5 | ${x.artifactCount} | ${x.clientRateTrials} | ${x.providerResynthesisTrials} |`),
  "","## Interpretation guardrails","",
  "- A requested/applied rate mismatch is rejected by the shared contract.",
  "- Provider re-synthesis is not evidence that the learner controls playback speed on the client.",
  "- Do not compare candidates with materially different devices, networks or trial conditions without disclosing the difference.",
  "- This aggregate does not establish a pass threshold. Review individual trial notes and listen to the corresponding samples.",
  "- No canonical Gabroo voice is selected by this report.",""
 ];
 return lines.join("\n");
}
export async function writeGabrooPlaybackRateReport(inputPath:string,outputPath:string):Promise<{trialCount:number;groupCount:number}>{
 const source=await readFile(resolve(inputPath),"utf8");
 const decoded:unknown=JSON.parse(source);
 if(!Array.isArray(decoded))throw new Error("Playback-rate input must be a JSON array.");
 const report=renderGabrooPlaybackRateReport(decoded as GabrooPlaybackRateTrial[]);
 await writeFile(resolve(outputPath),report,{encoding:"utf8",flag:"w"});
 return {trialCount:decoded.length,groupCount:summarizeGabrooPlaybackRateTrials(decoded as GabrooPlaybackRateTrial[]).length};
}
async function main():Promise<void>{
 const args=process.argv.slice(2);
 if(args.length!==2||args.includes("--help")||args.includes("-h")){
  process.stdout.write("Usage: pnpm --filter @gabenglish/api benchmark:playback-rate -- <trials.json> <report.md>\n");
  process.exitCode=args.length===0||args.includes("--help")||args.includes("-h")?0:2;return;
 }
 try{const result=await writeGabrooPlaybackRateReport(args[0],args[1]);process.stdout.write(JSON.stringify(result,null,2)+"\n");}
 catch{process.stderr.write("Playback-rate report generation failed. Check the JSON input and trial schema.\n");process.exitCode=1;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)void main();
