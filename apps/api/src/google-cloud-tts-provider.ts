import type {GabrooSpeechSynthesisInput,GabrooSpeechSynthesisProvider,GabrooSpeechSynthesisResult} from "./gabroo-speech-synthesis-provider.js";
import {measureGabrooMp3DurationMs} from "./gabroo-mp3-metadata.js";

type GoogleTtsConfig={
 GABROO_GOOGLE_TTS_API_KEY?:string;
 GABROO_GOOGLE_TTS_VOICE?:string;
 GABROO_GOOGLE_TTS_LANGUAGE_CODE?:string;
 GABROO_GOOGLE_TTS_ENGLISH_LANGUAGE_CODE?:string;
 GABROO_GOOGLE_TTS_INPUT_MODE?:"ssml"|"text";
};
type FetchLike=(input:string|URL|Request,init?:RequestInit)=>Promise<Response>;
const MAX_TEXT_CHARACTERS=4_000;
const MAX_AUDIO_BYTES=12*1024*1024;
const MAX_BASE64_AUDIO_CHARACTERS=Math.ceil(MAX_AUDIO_BYTES/3)*4;
const REQUEST_TIMEOUT_MS=15_000;
const ENGLISH_RUN=/[A-Za-z][A-Za-z0-9]*(?:[’'][A-Za-z]+)*(?:[ ]+[A-Za-z][A-Za-z0-9]*(?:[’'][A-Za-z]+)*)*/g;
function escapeXmlText(value:string):string{return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/["]/g,"&quot;").replace(/\x27/g,"&apos;");}
function assertXml10Text(value:string):void{
 for(const character of value){
  const codePoint=character.codePointAt(0)!;
  const allowed=codePoint===0x9||codePoint===0xa||codePoint===0xd||(codePoint>=0x20&&codePoint<=0xd7ff)||(codePoint>=0xe000&&codePoint<=0xfffd)||(codePoint>=0x10000&&codePoint<=0x10ffff);
  if(!allowed)throw new Error("Google TTS text contains a character that is not valid in XML 1.0.");
 }
}
export function buildGabrooGoogleTtsSsml(text:string,englishLanguageCode="en-US"):string{
 if(!/^[a-z]{2,3}-[A-Z]{2,4}$/.test(englishLanguageCode))throw new Error("Google TTS English language code is invalid.");
 assertXml10Text(text);
 const parts:string[]=[];
 // User text can contain angle-bracket examples such as <test>. Treat those
 // spans as literal text rather than incorrectly marking their contents as English.
 const chunks=text.split(/(<[^>]*>)/g);
 for(const chunk of chunks){
  if(chunk.startsWith("<")&&chunk.endsWith(">")){parts.push(escapeXmlText(chunk));continue;}
  let cursor=0;
  for(const match of chunk.matchAll(ENGLISH_RUN)){
   const index=match.index??0;
   parts.push(escapeXmlText(chunk.slice(cursor,index)));
   parts.push("<lang xml:lang=\""+englishLanguageCode+"\">"+escapeXmlText(match[0])+"</lang>");
   cursor=index+match[0].length;
  }
  parts.push(escapeXmlText(chunk.slice(cursor)));
 }
 return "<speak>"+parts.join("")+"</speak>";
}
const MAX_PROVIDER_RESPONSE_BYTES=MAX_BASE64_AUDIO_CHARACTERS+4_096;
const CANONICAL_BASE64=/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

/** Bound the JSON envelope while streaming; response.json() would buffer an
 * untrusted provider response before the audio-size checks could run. */
async function readBoundedGoogleTtsPayload(response:Response):Promise<{audioContent?:unknown}>{
 const declared=Number(response.headers.get("content-length"));
 if(Number.isFinite(declared)&&declared>MAX_PROVIDER_RESPONSE_BYTES){
  await response.body?.cancel();
  throw new Error("Google Cloud Text-to-Speech response exceeded the audio size limit.");
 }
 if(!response.body)throw new Error("Google Cloud Text-to-Speech returned no audio content.");
 const reader=response.body.getReader();
 const chunks:Uint8Array[]=[];
 let total=0;
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   total+=value.byteLength;
   if(total>MAX_PROVIDER_RESPONSE_BYTES){
    await reader.cancel();
    throw new Error("Google Cloud Text-to-Speech response exceeded the audio size limit.");
   }
   chunks.push(value);
  }
 }finally{
  reader.releaseLock();
 }
 const bytes=new Uint8Array(total);
 let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 try{return JSON.parse(new TextDecoder().decode(bytes)) as {audioContent?:unknown};}
 catch{return Promise.reject(new Error("Google Cloud Text-to-Speech returned malformed JSON."));}
}

/**
 * Native Google Cloud Text-to-Speech REST adapter.
 * The API key is server-only and should be restricted to the Cloud TTS API.
 * This adapter intentionally buffers Google's synchronous MP3 response; it
 * does not advertise streaming support.
 */
export function createGoogleCloudTtsProvider(
 config:GoogleTtsConfig,
 fetcher:FetchLike=fetch,
 requestTimeoutMs=REQUEST_TIMEOUT_MS
):GabrooSpeechSynthesisProvider|undefined{
 const apiKey=config.GABROO_GOOGLE_TTS_API_KEY?.trim();
 const voice=config.GABROO_GOOGLE_TTS_VOICE?.trim();
 const languageCode=config.GABROO_GOOGLE_TTS_LANGUAGE_CODE?.trim()||"ml-IN";
 const englishLanguageCode=config.GABROO_GOOGLE_TTS_ENGLISH_LANGUAGE_CODE?.trim()||"en-US";
 const inputMode=config.GABROO_GOOGLE_TTS_INPUT_MODE||"ssml";
 if(inputMode!=="ssml"&&inputMode!=="text")throw new Error("Google TTS input mode must be ssml or text.");
 if(!Number.isSafeInteger(requestTimeoutMs)||requestTimeoutMs<1||requestTimeoutMs>60_000)throw new Error("Google TTS request timeout must be between 1 and 60000 milliseconds.");
 if(!apiKey||!voice)return undefined;
 if(!/^[a-z]{2,3}-[A-Z]{2,4}$/.test(languageCode))throw new Error("Google TTS language code is invalid.");
 if(!/^[a-z]{2,3}-[A-Z]{2,4}$/.test(englishLanguageCode))throw new Error("Google TTS English language code is invalid.");
 if(!voice.startsWith(languageCode+"-"))throw new Error("Google TTS voice must match the configured language code.");
 // This adapter sends speakingRate, which is supported by Standard/WaveNet but not Chirp 3 HD.
 if(!/^[a-z]{2,3}-[A-Z]{2,4}-(Standard|Wavenet)-[A-Z]$/.test(voice))throw new Error("Google TTS audition adapter currently supports Standard and WaveNet voice IDs only.");
 return {
  async synthesize(input:GabrooSpeechSynthesisInput):Promise<GabrooSpeechSynthesisResult>{
   const text=input.text.trim();
   if(!text||text.length>MAX_TEXT_CHARACTERS)throw new Error("Gabroo speech text must contain 1–4000 characters.");
   if(!Number.isFinite(input.speed)||input.speed<0.75||input.speed>1.5)throw new Error("Gabroo speech speed must be between 0.75× and 1.5×.");
   if(input.signal.aborted)throw new Error("Gabroo speech synthesis was cancelled.");
   const url=new URL("https://texttospeech.googleapis.com/v1/text:synthesize");
   // Bound provider latency while preserving caller cancellation (for example, learner interruption).
   const timeoutSignal=AbortSignal.timeout(requestTimeoutMs);
   const signal=AbortSignal.any([input.signal,timeoutSignal]);
   const response=await fetcher(url,{
    method:"POST",
    headers:{"content-type":"application/json",accept:"application/json","x-goog-api-key":apiKey},
    body:JSON.stringify({
     input:inputMode==="ssml"?{ssml:buildGabrooGoogleTtsSsml(text,englishLanguageCode)}:{text},
     voice:{languageCode,name:voice},
     audioConfig:{audioEncoding:"MP3",speakingRate:input.speed}
    }),
    signal
   });
   if(!response.ok)throw new Error("Google Cloud Text-to-Speech request failed with status "+response.status);
   const payload=await readBoundedGoogleTtsPayload(response);
   if(typeof payload.audioContent!=="string"||!payload.audioContent)throw new Error("Google Cloud Text-to-Speech returned no audio content.");
   // Reject an oversized encoded payload before allocating its decoded Buffer.
   if(payload.audioContent.length>MAX_BASE64_AUDIO_CHARACTERS)throw new Error("Google Cloud Text-to-Speech response exceeded the audio size limit.");
   if(!CANONICAL_BASE64.test(payload.audioContent))throw new Error("Google Cloud Text-to-Speech returned malformed audio content.");
   const audio=Buffer.from(payload.audioContent,"base64");
   if(audio.byteLength===0)throw new Error("Google Cloud Text-to-Speech returned empty audio.");
   if(audio.byteLength>MAX_AUDIO_BYTES)throw new Error("Google Cloud Text-to-Speech response exceeded the audio size limit.");
   if(audio.toString("base64")!==payload.audioContent)throw new Error("Google Cloud Text-to-Speech returned malformed audio content.");
   const bytes=new Uint8Array(audio);
   const durationMs=measureGabrooMp3DurationMs(bytes);
   return {audio:bytes,contentType:"audio/mpeg",durationMs};
  }
 };
}
