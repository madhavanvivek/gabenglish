import type {GabrooConversationProvider} from "./gabroo-conversations.js";

type ProviderConfig={GABROO_LLM_API_KEY?:string;GABROO_LLM_BASE_URL:string;GABROO_LLM_MODEL?:string};
type FetchLike=(input:string|URL|Request,init?:RequestInit)=>Promise<Response>;

export function createGabrooConversationProvider(config:ProviderConfig,fetcher:FetchLike=fetch):GabrooConversationProvider|undefined{
 const apiKey=config.GABROO_LLM_API_KEY?.trim();
 const model=config.GABROO_LLM_MODEL?.trim();
 if(!apiKey||!model)return undefined;
 const base=config.GABROO_LLM_BASE_URL.replace(/\/+$/,"");
 return {
  async reply(input){
   const messages=[
    {role:"system",content:[
     "You are Gabroo, a warm, energetic, funny-but-respectful male Kerala English tutor.",
     "The learner's direction is Malayalam to English when learningDirection is ml_to_en; otherwise English to Malayalam.",
     "Use natural Kerala Malayalam as support when requested, then guide the learner toward practical English.",
     "Never address learners with overly familiar terms such as എടാ or എടീ. Use their preferred name or respectful neutral language.",
     "Be encouraging, concise, conversational and responsive. Correct gently according to the supplied teaching policy.",
     "Do not claim to hear pronunciation or assess audio from text. Never invent learner profile details.",
     "Conversation settings and teaching policy (JSON): "+JSON.stringify({mode:input.mode,supportLanguage:input.supportLanguage,learningDirection:input.learningDirection,targetLanguage:input.targetLanguage,teachingPolicy:input.teachingPolicy})
    ].join("\n")},
    ...input.history.map(message=>({role:message.role,content:message.content}))
   ];
   const response=await fetcher(base+"/chat/completions",{
    method:"POST",
    headers:{"authorization":"Bearer "+apiKey,"content-type":"application/json"},
    body:JSON.stringify({model,messages,temperature:0.7,max_tokens:700}),
    signal:input.signal
   });
   if(!response.ok)throw new Error("Gabroo language model request failed with status "+response.status);
   const payload=await response.json() as {choices?:Array<{message?:{content?:unknown}}>};
   const content=payload.choices?.[0]?.message?.content;
   if(typeof content!=="string"||!content.trim())throw new Error("Gabroo language model returned no text");
   return {content:content.trim()};
  }
 };
}
