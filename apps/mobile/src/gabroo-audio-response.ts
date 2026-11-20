const MAX_GABROO_AUDIO_BYTES=12*1024*1024;

export function expectedGabrooAudioLength(contentLength:string|null):number|null{
 if(contentLength===null)return null;
 // Content-Length is an unsigned decimal integer; Number() alone also accepts
 // whitespace, signs and hexadecimal notation that are not valid header values.
 if(!/^\\d+$/.test(contentLength))throw new Error("Gabroo returned an invalid audio length.");
 const length=Number(contentLength);
 if(!Number.isSafeInteger(length))throw new Error("Gabroo returned an invalid audio length.");
 if(length>MAX_GABROO_AUDIO_BYTES)throw new Error("Gabroo audio exceeded the permitted size.");
 return length;
}

export function validateGabrooAudioHeaders(contentType:string|null,contentLength:string|null):void{
 const normalized=contentType?.split(";")[0].trim().toLowerCase();
 if(normalized!=="audio/mpeg")throw new Error("Gabroo returned an unsupported audio format.");
 expectedGabrooAudioLength(contentLength);
}

function validateGabrooAudioLength(actual:number,expected:number|null):void{
 if(expected!==null&&actual!==expected)throw new Error("Gabroo audio length did not match the declared content length.");
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
 const expectedLength=expectedGabrooAudioLength(response.headers.get("content-length"));
 const reader=response.body?.getReader();
 if(signal?.aborted){
  if(reader)await reader.cancel().catch(()=>undefined);
  else await response.body?.cancel().catch(()=>undefined);
  throw new Error("Gabroo audio reading was cancelled.");
 }
 if(!reader){
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(signal?.aborted)throw new Error("Gabroo audio reading was cancelled.");
  validateGabrooAudioBytes(bytes);
  validateGabrooAudioLength(bytes.byteLength,expectedLength);
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
 validateGabrooAudioLength(bytes.byteLength,expectedLength);
 return bytes;
}
