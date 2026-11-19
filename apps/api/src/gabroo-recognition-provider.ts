import {
 type GabrooSpeechRecognitionProvider,
 type GabrooTranscript,
} from "@gabenglish/contracts";

type RecognitionConfig={GABROO_LLM_API_KEY?:string;GABROO_LLM_BASE_URL:string;GABROO_STT_MODEL?:string};
type FetchLike=(input:string|URL|Request,init?:RequestInit)=>Promise<Response>;

const fileNames:Record<string,string>={
 "audio/mp4":"gabroo-recording.m4a",
 "audio/m4a":"gabroo-recording.m4a",
 "audio/wav":"gabroo-recording.wav",
 "audio/x-wav":"gabroo-recording.wav",
 "audio/webm":"gabroo-recording.webm",
 "audio/ogg":"gabroo-recording.ogg"
};

export function createGabrooSpeechRecognitionProvider(config:RecognitionConfig,fetcher:FetchLike=fetch):GabrooSpeechRecognitionProvider|undefined{
 const apiKey=config.GABROO_LLM_API_KEY?.trim();
 if(!apiKey)return undefined;
 const base=config.GABROO_LLM_BASE_URL.replace(/\\/+$/,"");
 const model=config.GABROO_STT_MODEL?.trim()||"whisper-1";
 return {
  async transcribe(input):Promise<GabrooTranscript>{
   const form=new FormData();
   const blob=new Blob([Buffer.from(input.audio)],{type:input.mimeType});
   form.append("file",blob,fileNames[input.mimeType]);
   form.append("model",model);
   if(input.language==="ml-IN")form.append("language","ml");
   if(input.language==="en-IN")form.append("language","en");
   const response=await fetcher(base+"/audio/transcriptions",{
    method:"POST",
    headers:{authorization:"Bearer "+apiKey},
    body:form,
    signal:input.signal
   });
   if(!response.ok)throw new Error("Gabroo speech recognition request failed with status "+response.status);
   const payload=await response.json() as {text?:unknown;language?:unknown};
   if(typeof payload.text!=="string"||!payload.text.trim())throw new Error("Gabroo speech recognition returned no transcript");
   const languageDetected:GabrooTranscript["languageDetected"]=input.language==="ml-IN"?"ml":input.language==="en-IN"?"en":"unknown";
   return {text:payload.text.trim(),languageDetected};
  }
 };
}
