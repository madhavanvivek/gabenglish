import {createHash,randomUUID} from "node:crypto";

export interface GabrooSynthesizedAudioIdentity {
 audio_id:string;
 audio_sha256:string;
 text_sha256:string;
 text_length:number;
 duration_ms:number;
}

/**
 * Bind measured alignment to the exact MP3 bytes and exact UTF-8 text sent to
 * synthesis. Call only after the complete audio asset and measured duration
 * are available; this helper deliberately does not buffer or alter streams.
 */
export function createGabrooSynthesizedAudioIdentity(input:{
 audio:Uint8Array;
 text:string;
 durationMs:number;
 audioId?:string;
}):GabrooSynthesizedAudioIdentity{
 if(!(input.audio instanceof Uint8Array)||input.audio.byteLength===0){
  throw new Error("Gabroo audio identity requires non-empty synthesized audio bytes.");
 }
 if(input.audio.byteLength>12*1024*1024){
  throw new Error("Gabroo audio identity cannot exceed the 12 MiB audio limit.");
 }
 if(typeof input.text!=="string"||input.text.trim().length===0||Array.from(input.text).length>4_000){
  throw new Error("Gabroo audio identity requires the exact non-empty synthesis text of at most 4000 characters.");
 }
 if(!Number.isFinite(input.durationMs)||input.durationMs<=0||input.durationMs>10*60*1000){
  throw new Error("Gabroo audio duration must be positive and no longer than ten minutes.");
 }
 const audioId=input.audioId??randomUUID();
 if(typeof audioId!=="string"||audioId.trim().length===0||audioId!==audioId.trim()||audioId.length>160){
  throw new Error("Gabroo audio identity requires a valid audio ID.");
 }
 return {
  audio_id:audioId,
  audio_sha256:createHash("sha256").update(input.audio).digest("hex"),
  text_sha256:createHash("sha256").update(input.text,"utf8").digest("hex"),
  text_length:Array.from(input.text).length,
  duration_ms:input.durationMs
 };
}
