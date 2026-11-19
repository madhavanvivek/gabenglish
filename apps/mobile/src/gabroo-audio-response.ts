const MAX_GABROO_AUDIO_BYTES=12*1024*1024;

export function validateGabrooAudioHeaders(contentType:string|null,contentLength:string|null):void{
 const normalized=contentType?.split(";")[0].trim().toLowerCase();
 if(normalized!=="audio/mpeg")throw new Error("Gabroo returned an unsupported audio format.");
 if(contentLength!==null){
  const length=Number(contentLength);
  if(!Number.isSafeInteger(length)||length<0)throw new Error("Gabroo returned an invalid audio length.");
  if(length>MAX_GABROO_AUDIO_BYTES)throw new Error("Gabroo audio exceeded the permitted size.");
 }
}

export function validateGabrooAudioBytes(bytes:Uint8Array):void{
 if(bytes.byteLength===0||bytes.byteLength>MAX_GABROO_AUDIO_BYTES){
  throw new Error("Gabroo returned an invalid audio response.");
 }
}
