export type GabrooSpeechSynthesisInput={
 text:string;
 speed:number;
 signal:AbortSignal;
};
export type GabrooSpeechSynthesisResult={
 audio:Uint8Array;
 contentType:"audio/mpeg";
};
export type GabrooSpeechSynthesisProvider={
 synthesize(input:GabrooSpeechSynthesisInput):Promise<GabrooSpeechSynthesisResult>;
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

export function createGabrooSpeechSynthesisProvider(
 config:ProviderConfig,
 fetcher:FetchLike=fetch
):GabrooSpeechSynthesisProvider|undefined{
 const apiKey=config.GABROO_LLM_API_KEY?.trim();
 const model=config.GABROO_TTS_MODEL?.trim();
 const voice=config.GABROO_TTS_VOICE?.trim();
 // No provider default voice is ever selected: owner-approved voice ID is explicit.
 if(!apiKey||!model||!voice)return undefined;
 const base=config.GABROO_LLM_BASE_URL.replace(/\/+$/,"");
 return {
  async synthesize(input){
   const text=input.text.trim();
   if(!text||text.length>MAX_TEXT_CHARACTERS)throw new Error("Gabroo speech text must contain 1–4000 characters.");
   if(!Number.isFinite(input.speed)||input.speed<0.75||input.speed>1.5)throw new Error("Gabroo speech speed must be between 0.75× and 1.5×.");
   const response=await fetcher(base+"/audio/speech",{
    method:"POST",
    headers:{authorization:"Bearer "+apiKey,"content-type":"application/json",accept:"audio/mpeg"},
    body:JSON.stringify({model,voice,input:text,response_format:"mp3",speed:input.speed}),
    signal:input.signal
   });
   if(!response.ok)throw new Error("Gabroo speech synthesis request failed with status "+response.status);
   const contentType=response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
   if(contentType&&contentType!=="audio/mpeg")throw new Error("Gabroo speech provider returned an unsupported audio format.");
   const declaredLength=Number(response.headers.get("content-length"));
   if(Number.isFinite(declaredLength)&&declaredLength>MAX_AUDIO_BYTES)throw new Error("Gabroo speech synthesis response exceeded the audio size limit.");
   const audio=new Uint8Array(await response.arrayBuffer());
   if(audio.byteLength===0)throw new Error("Gabroo speech synthesis returned empty audio.");
   if(audio.byteLength>MAX_AUDIO_BYTES)throw new Error("Gabroo speech synthesis response exceeded the audio size limit.");
   return {audio,contentType:"audio/mpeg"};
  }
 };
}
