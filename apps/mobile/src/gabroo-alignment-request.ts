import type {GabrooAudioResponseMetadata} from "./gabroo-audio-metadata";

export type GabrooAlignmentRequestValidation =
 | {ok:true;text:string}
 | {ok:false;reason:"unavailable"|"missing_input"};

const MAX_TEXT_LENGTH=4_000;
const MAX_AUDIO_BYTES=12*1024*1024;
const MAX_DURATION_MS=10*60*1000;

/** Fail closed before any local audio read or network upload. */
export function validateGabrooAlignmentRequest(input:{
 text:string;
 metadata:GabrooAudioResponseMetadata|null;
 phonemeAlignmentAvailable:boolean;
}):GabrooAlignmentRequestValidation{
 const text=input.text.trim();
 if(!input.phonemeAlignmentAvailable)return {ok:false,reason:"unavailable"};
 if(!input.metadata||!text)return {ok:false,reason:"missing_input"};
 const metadata=input.metadata;
 if(text.length>MAX_TEXT_LENGTH)throw new Error("Gabroo alignment text exceeds the permitted length.");
 if(!/^[a-f0-9]{64}$/.test(metadata.audioId)||metadata.audioId!==metadata.audioSha256
  ||!/^[a-f0-9]{64}$/.test(metadata.textSha256)
  ||!Number.isSafeInteger(metadata.durationMs)||metadata.durationMs<=0||metadata.durationMs>MAX_DURATION_MS){
  throw new Error("Gabroo audio identity is invalid for alignment.");
 }
 return {ok:true,text};
}

/** Validate cached-file size before converting it to a base64 request body. */
export function assertGabrooAlignmentAudioSize(size:number|undefined):void{
 if(typeof size!=="number"||!Number.isSafeInteger(size)||size<=0||size>MAX_AUDIO_BYTES){
  throw new Error("The cached Gabroo audio is missing or exceeds the alignment size limit.");
 }
}
