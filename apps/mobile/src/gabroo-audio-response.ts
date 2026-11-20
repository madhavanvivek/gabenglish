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


/**
 * Read MP3 bytes with an incremental cap when the runtime exposes a readable
 * response stream. This prevents an unexpectedly large chunked response from
 * being fully buffered before validation. Older React Native fetch adapters
 * without body readers retain the bounded-header + post-read fallback.
 */
export async function readGabrooAudioBytes(response:Pick<Response,"headers"|"body"|"arrayBuffer">,signal?:AbortSignal):Promise<Uint8Array>{
 validateGabrooAudioHeaders(response.headers.get("content-type"),response.headers.get("content-length"));
 const reader=response.body?.getReader();
 if(signal?.aborted){
  if(reader)await reader.cancel().catch(()=>undefined);
  else await response.body?.cancel().catch(()=>undefined);
  throw new Error("Gabroo audio reading was cancelled.");
 }
 if(!reader){
  const bytes=new Uint8Array(await response.arrayBuffer());
  validateGabrooAudioBytes(bytes);
  return bytes;
 }
 const chunks:Uint8Array[]=[];
 let total=0;
 const cancelOnAbort=()=>{void reader.cancel().catch(()=>undefined);};
 signal?.addEventListener("abort",cancelOnAbort,{once:true});
 try{
  while(true){
   if(signal?.aborted)throw new Error("Gabroo audio reading was cancelled.");
   const result=await reader.read();
   if(signal?.aborted)throw new Error("Gabroo audio reading was cancelled.");
   if(result.done)break;
   total+=result.value.byteLength;
   if(total>MAX_GABROO_AUDIO_BYTES){
    await reader.cancel().catch(()=>undefined);
    throw new Error("Gabroo audio exceeded the permitted size.");
   }
   chunks.push(result.value);
  }
 }catch(error){
  await reader.cancel().catch(()=>undefined);
  throw error;
 }finally{
  signal?.removeEventListener("abort",cancelOnAbort);
 }
 const bytes=new Uint8Array(total);
 let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 validateGabrooAudioBytes(bytes);
 return bytes;
}
