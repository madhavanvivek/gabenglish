import {
 type GabrooSpeechRecognitionProvider,
 type GabrooTranscript,
} from "@gabenglish/contracts";

type RecognitionConfig={GABROO_LLM_API_KEY?:string;GABROO_LLM_BASE_URL:string;GABROO_STT_MODEL?:string};
type FetchLike=(input:string|URL|Request,init?:RequestInit)=>Promise<Response>;

function detectedLanguage(value:unknown,fallback:GabrooTranscript["languageDetected"]):GabrooTranscript["languageDetected"]{
 if(typeof value!=="string")return fallback;
 const normalized=value.trim().toLowerCase();
 if(["ml","malayalam","mal"].includes(normalized))return "ml";
 if(["en","english","eng"].includes(normalized))return "en";
 return "unknown";
}

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
 let base=config.GABROO_LLM_BASE_URL;
 while(base.endsWith("/"))base=base.slice(0,-1);
 const model=config.GABROO_STT_MODEL?.trim()||"whisper-1";
 return {
  async transcribe(input):Promise<GabrooTranscript>{
   const form=new FormData();
   const blob=new Blob([Buffer.from(input.audio)],{type:input.mimeType});
   form.append("file",blob,fileNames[input.mimeType]);
   form.append("model",model);
   // verbose_json includes the provider language metadata used by the learner review UI.
   form.append("response_format","verbose_json");
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
   const fallback:GabrooTranscript["languageDetected"]=input.language==="ml-IN"?"ml":input.language==="en-IN"?"en":"unknown";
   const languageDetected=detectedLanguage(payload.language,fallback);
   return {text:payload.text.trim(),languageDetected};
  }
 };
}
