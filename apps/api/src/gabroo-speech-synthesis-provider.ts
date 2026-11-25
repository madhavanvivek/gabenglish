import {Readable,Transform} from "node:stream";

export type GabrooSpeechSynthesisInput={
 text:string;
 speed:number;
 signal:AbortSignal;
};
export type GabrooSpeechSynthesisResult={
 audio:Uint8Array;
 contentType:"audio/mpeg";
};
export type GabrooSpeechSynthesisStreamResult={
 audio:Readable;
 contentType:"audio/mpeg";
 contentLength?:number;
};
export type GabrooSpeechSynthesisProvider={
 synthesize(input:GabrooSpeechSynthesisInput):Promise<GabrooSpeechSynthesisResult>;
 synthesizeStream?(input:GabrooSpeechSynthesisInput):Promise<GabrooSpeechSynthesisStreamResult>;
};

type ProviderConfig={
 GABROO_LLM_API_KEY?:string;
 GABROO_LLM_BASE_URL:string;
 GABROO_TTS_MODEL?:string;
 GABROO_TTS_VOICE?:string;
};
type FetchLike=(input:string|URL|Request,init?:RequestInit)=>Promise<Response>;
const MAX_TEXT_CHARACTERS=4_000;
const MAX_AUDIO_BYTES=12*1024*1024;

function validateInput(input:GabrooSpeechSynthesisInput){
 const text=input.text.trim();
 if(!text||text.length>MAX_TEXT_CHARACTERS)throw new Error("Gabroo speech text must contain 1–4000 characters.");
 if(!Number.isFinite(input.speed)||input.speed<0.75||input.speed>1.5)throw new Error("Gabroo speech speed must be between 0.75× and 1.5×.");
 return text;
}

export function createGabrooSpeechSynthesisProvider(
 config:ProviderConfig,
 fetcher:FetchLike=fetch
):GabrooSpeechSynthesisProvider|undefined{
 const apiKey=config.GABROO_LLM_API_KEY?.trim();
 const model=config.GABROO_TTS_MODEL?.trim();
 const voice=config.GABROO_TTS_VOICE?.trim();
 // No provider default voice is ever selected: owner-approved voice ID is explicit.
 if(!apiKey||!model||!voice)return undefined;
 const base=config.GABROO_LLM_BASE_URL.replace(/\/+$/, "");
 async function requestAudio(input:GabrooSpeechSynthesisInput){
  const text=validateInput(input);
  const response=await fetcher(base+"/audio/speech",{
   method:"POST",
   headers:{authorization:"Bearer "+apiKey,"content-type":"application/json",accept:"audio/mpeg"},
   body:JSON.stringify({model,voice,input:text,response_format:"mp3",speed:input.speed}),
   signal:input.signal
  });
  if(!response.ok)throw new Error("Gabroo speech synthesis request failed with status "+response.status);
  const contentType=response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if(contentType!=="audio/mpeg")throw new Error("Gabroo speech provider returned an unsupported audio format.");
  const lengthHeader=response.headers.get("content-length");
  let contentLength:number|undefined;
  if(lengthHeader!==null){
   contentLength=Number(lengthHeader);
   if(!Number.isSafeInteger(contentLength)||contentLength<0)throw new Error("Gabroo speech provider returned an invalid audio length.");
   if(contentLength>MAX_AUDIO_BYTES)throw new Error("Gabroo speech synthesis response exceeded the audio size limit.");
  }
  if(!response.body)throw new Error("Gabroo speech synthesis returned an empty audio stream.");
  return {body:response.body,contentLength};
 }
 return {
  async synthesizeStream(input){
   const {body,contentLength}=await requestAudio(input);
   const source=Readable.fromWeb(body as import("node:stream/web").ReadableStream<Uint8Array>);
   let total=0;
   const limiter=new Transform({
    transform(chunk:Buffer|Uint8Array,_encoding,callback){
     total+=chunk.byteLength;
     if(total>MAX_AUDIO_BYTES){callback(new Error("Gabroo speech synthesis response exceeded the audio size limit."));return;}
     callback(null,chunk);
    },
    flush(callback){
     if(total===0)callback(new Error("Gabroo speech synthesis returned empty audio."));
     else if(contentLength!==undefined&&total!==contentLength)callback(new Error("Gabroo speech provider audio length did not match its content-length header."));
     else callback();
    }
   });
   const cancelOnAbort=()=>source.destroy(new Error("Gabroo speech synthesis was cancelled."));
   if(input.signal.aborted)source.destroy(new Error("Gabroo speech synthesis was cancelled."));
   else input.signal.addEventListener("abort",cancelOnAbort,{once:true});
   source.once("close",()=>input.signal.removeEventListener("abort",cancelOnAbort));
   source.once("end",()=>input.signal.removeEventListener("abort",cancelOnAbort));
   source.on("error",()=>input.signal.removeEventListener("abort",cancelOnAbort));
   source.on("error",(error)=>limiter.destroy(error));
   limiter.once("close",()=>{if(!source.destroyed)source.destroy();});
   source.pipe(limiter);
   return {audio:limiter,contentType:"audio/mpeg",contentLength};
  },
  async synthesize(input){
   const {body,contentLength}=await requestAudio(input);
   const reader=body.getReader();
   const chunks:Uint8Array[]=[];
   let total=0;
   const cancelOnAbort=()=>{void reader.cancel().catch(()=>undefined);};
   if(input.signal.aborted){
    await reader.cancel().catch(()=>undefined);
    throw new Error("Gabroo speech synthesis was cancelled.");
   }
   input.signal.addEventListener("abort",cancelOnAbort,{once:true});
   try{
    while(true){
     const part=await reader.read();
     if(input.signal.aborted)throw new Error("Gabroo speech synthesis was cancelled.");
     if(part.done)break;
     total+=part.value.byteLength;
     if(total>MAX_AUDIO_BYTES)throw new Error("Gabroo speech synthesis response exceeded the audio size limit.");
     chunks.push(part.value);
    }
   }catch(error){
    await reader.cancel().catch(()=>undefined);
    throw error;
   }finally{
    input.signal.removeEventListener("abort",cancelOnAbort);
   }
   if(total===0)throw new Error("Gabroo speech synthesis returned empty audio.");
   if(contentLength!==undefined&&total!==contentLength)throw new Error("Gabroo speech provider audio length did not match its content-length header.");
   const audio=new Uint8Array(total);
   let offset=0;
   for(const chunk of chunks){audio.set(chunk,offset);offset+=chunk.byteLength;}
   return {audio,contentType:"audio/mpeg"};
  }
 };
}
