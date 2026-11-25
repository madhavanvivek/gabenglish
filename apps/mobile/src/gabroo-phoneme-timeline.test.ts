import {describe,expect,it} from "vitest";
import {parseGabrooPhonemeTimelineForAudio} from "./gabroo-phoneme-timeline";

const audioId="a".repeat(64),textSha="b".repeat(64);
const metadata={audioId,audioSha256:audioId,textSha256:textSha,durationMs:1000};
const alignment={audio_id:audioId,audio_sha256:audioId,duration_ms:1000,phonemes:[
 {phoneme:"m",start_ms:0,end_ms:120},
 {phoneme:"aː",start_ms:120,end_ms:420},
 {phoneme:"unknown-phone",start_ms:420,end_ms:700}
]};

describe("Gabroo mobile phoneme timeline",()=>{
 it("converts real phoneme timestamps only for the matching measured audio",()=>{
  const timeline=parseGabrooPhonemeTimelineForAudio(alignment,metadata);
  expect(timeline?.audio_id).toBe(audioId);
  expect(timeline?.duration_ms).toBe(1000);
  expect(timeline?.visemes.map(event=>event.shape)).toEqual(["closed_lips","open_wide","neutral"]);
  expect(timeline?.visemes[1]).toMatchObject({start_ms:120,end_ms:420,weight:1});
 });
 it("refuses an alignment belonging to different audio bytes",()=>{
  expect(parseGabrooPhonemeTimelineForAudio({...alignment,audio_sha256:"c".repeat(64)},metadata)).toBeNull();
 });
 it("refuses an alignment with a different content identity or measured duration",()=>{
  expect(parseGabrooPhonemeTimelineForAudio({...alignment,audio_id:"d".repeat(64)},metadata)).toBeNull();
  expect(parseGabrooPhonemeTimelineForAudio({...alignment,duration_ms:998},metadata)).toBeNull();
 });
 it("fails closed when the measured metadata is malformed",()=>{
  expect(parseGabrooPhonemeTimelineForAudio(alignment,{...metadata,audioSha256:"c".repeat(64)})).toBeNull();
  expect(parseGabrooPhonemeTimelineForAudio(alignment,{...metadata,textSha256:"not-a-hash"})).toBeNull();
  expect(parseGabrooPhonemeTimelineForAudio(alignment,{...metadata,durationMs:0})).toBeNull();
  expect(parseGabrooPhonemeTimelineForAudio(alignment,{...metadata,durationMs:1000.5})).toBeNull();
 });
 it("accepts an alignment hash with equivalent hexadecimal casing",()=>{
  const upper={...alignment,audio_sha256:audioId.toUpperCase()};
  expect(parseGabrooPhonemeTimelineForAudio(upper,metadata)?.audio_id).toBe(audioId);
 });
 it("refuses malformed or missing provider alignment instead of guessing timing",()=>{
  expect(parseGabrooPhonemeTimelineForAudio({audio_id:audioId,phonemes:[]},metadata)).toBeNull();
  expect(parseGabrooPhonemeTimelineForAudio(alignment,null)).toBeNull();
 });
 it("refuses events outside the measured audio duration",()=>{
  expect(parseGabrooPhonemeTimelineForAudio({...alignment,phonemes:[{phoneme:"a",start_ms:900,end_ms:1100}]},metadata)).toBeNull();
 });
});
