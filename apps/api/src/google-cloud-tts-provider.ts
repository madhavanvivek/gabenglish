import type {GabrooSpeechSynthesisInput,GabrooSpeechSynthesisProvider,GabrooSpeechSynthesisResult} from "./gabroo-speech-synthesis-provider.js";

type GoogleTtsConfig={
 GABROO_GOOGLE_TTS_API_KEY?:string;
 GABROO_GOOGLE_TTS_VOICE?:string;
 GABROO_GOOGLE_TTS_LANGUAGE_CODE?:string;
};
type FetchLike=(input:string|URL|Request,init?:RequestInit)=>Promise<Response>;
const MAX_TEXT_CHARACTERS=4_000;
const MAX_AUDIO_BYTES=12*1024*1024;
const REQUEST_TIMEOUT_MS=15_000;

/**
 * Native Google Cloud Text-to-Speech REST adapter.
 * The API key is server-only and should be restricted to the Cloud TTS API.
 * This adapter intentionally buffers Google's synchronous MP3 response; it
 * does not advertise streaming support.
 */
export function createGoogleCloudTtsProvider(
 config:GoogleTtsConfig,
 fetcher:FetchLike=fetch
):GabrooSpeechSynthesisProvider|undefined{
 const apiKey=config.GABROO_GOOGLE_TTS_API_KEY?.trim();
 const voice=config.GABROO_GOOGLE_TTS_VOICE?.trim();
 const languageCode=config.GABROO_GOOGLE_TTS_LANGUAGE_CODE?.trim()||"ml-IN";
 if(!apiKey||!voice)return undefined;
 if(!/^[a-z]{2,3}-[A-Z]{2,4}$/.test(languageCode))throw new Error("Google TTS language code is invalid.");
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
   const timeoutSignal=AbortSignal.timeout(REQUEST_TIMEOUT_MS);
   const signal=AbortSignal.any([input.signal,timeoutSignal]);
   const response=await fetcher(url,{
    method:"POST",
    headers:{"content-type":"application/json",accept:"application/json","x-goog-api-key":apiKey},
    body:JSON.stringify({
     input:{text},
     voice:{languageCode,name:voice},
     audioConfig:{audioEncoding:"MP3",speakingRate:input.speed}
    }),
    signal
   });
   if(!response.ok)throw new Error("Google Cloud Text-to-Speech request failed with status "+response.status);
   const payload=await response.json() as {audioContent?:unknown};
   if(typeof payload.audioContent!=="string"||!payload.audioContent)throw new Error("Google Cloud Text-to-Speech returned no audio content.");
   if(!/^[A-Za-z0-9+/]+={0,2}$/.test(payload.audioContent))throw new Error("Google Cloud Text-to-Speech returned malformed audio content.");
   const audio=Buffer.from(payload.audioContent,"base64");
   if(audio.byteLength===0)throw new Error("Google Cloud Text-to-Speech returned empty audio.");
   if(audio.byteLength>MAX_AUDIO_BYTES)throw new Error("Google Cloud Text-to-Speech response exceeded the audio size limit.");
   return {audio:new Uint8Array(audio),contentType:"audio/mpeg"};
  }
 };
}
