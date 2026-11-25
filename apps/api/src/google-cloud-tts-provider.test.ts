import {describe,it,expect,vi} from "vitest";
import {buildGabrooGoogleTtsSsml,createGoogleCloudTtsProvider} from "./google-cloud-tts-provider.js";

function validMp3(){
 const frame=new Uint8Array(417);
 frame.set([0xff,0xfb,0x90,0x64]);
 const audio=new Uint8Array(frame.length*2);
 audio.set(frame);audio.set(frame,frame.length);
 return audio;
}

describe("Google Cloud TTS provider",()=>{
 it("builds safe bilingual SSML",()=>{ expect(buildGabrooGoogleTtsSsml("നമസ്കാരം! Hello world & <test>.")).toBe("<speak>നമസ്കാരം! <lang xml:lang=\"en-US\">Hello world</lang> &amp; &lt;test&gt;.</speak>"); });
 it("rejects invalid English locale",()=>{expect(()=>buildGabrooGoogleTtsSsml("hello","bad-locale")).toThrow(/English language code/i);});
 it("rejects XML 1.0 control characters before building SSML",()=>{ expect(()=>buildGabrooGoogleTtsSsml("hello\u0000world")).toThrow(/not valid in XML 1.0/i); });
 it("preserves XML-safe whitespace and supplementary Unicode characters",()=>{ expect(buildGabrooGoogleTtsSsml("നമസ്കാരം!\n😀\tHello.")).toBe("<speak>നമസ്കാരം!\n😀\t<lang xml:lang=\"en-US\">Hello</lang>.</speak>"); });
 it("escapes quotes and apostrophes in Malayalam and English text",()=>{ expect(buildGabrooGoogleTtsSsml('നീ "ശരി" ആണോ? It\'s okay.')).toBe('<speak>നീ &quot;ശരി&quot; ആണോ? <lang xml:lang="en-US">It&apos;s okay</lang>.</speak>'); });

 const config={GABROO_GOOGLE_TTS_API_KEY:"server-only-test-key",GABROO_GOOGLE_TTS_VOICE:"ml-IN-Standard-B",GABROO_GOOGLE_TTS_LANGUAGE_CODE:"ml-IN",GABROO_GOOGLE_TTS_ENGLISH_LANGUAGE_CODE:"en-GB"};
 it("remains disabled until both a server API key and explicit voice are configured",()=>{
  expect(createGoogleCloudTtsProvider({...config,GABROO_GOOGLE_TTS_API_KEY:undefined})).toBeUndefined();
  expect(createGoogleCloudTtsProvider({...config,GABROO_GOOGLE_TTS_VOICE:undefined})).toBeUndefined();
 });
 it("calls Google's native REST API with the configured Malayalam voice and speed",async()=>{
  let captured:{url:URL;init:RequestInit}|undefined;
  const fetcher=vi.fn(async(url:string|URL|Request,init?:RequestInit)=>{
   captured={url:new URL(String(url)),init:init!};
   return Response.json({audioContent:Buffer.from(validMp3()).toString("base64")});
  });
  const provider=createGoogleCloudTtsProvider(config,fetcher)!;
  const controller=new AbortController();
  await expect(provider.synthesize({text:"നമസ്കാരം! Let's practise.",speed:0.9,signal:controller.signal})).resolves.toEqual({
   audio:validMp3(),contentType:"audio/mpeg",durationMs:52
  });
  if(!captured)throw new Error("Google TTS request was not captured.");
  expect(captured.url.href.split("?")[0]).toBe("https://texttospeech.googleapis.com/v1/text:synthesize");
  expect(captured.url.search).toBe("");
  expect(new Headers(captured.init.headers).get("x-goog-api-key")).toBe("server-only-test-key");
  expect(captured.init.signal).not.toBe(controller.signal);
  controller.abort();
  expect(captured.init.signal?.aborted).toBe(true);
  expect(JSON.parse(String(captured?.init.body))).toEqual({
   input:{ssml:buildGabrooGoogleTtsSsml("നമസ്കാരം! Let's practise.","en-GB")},
   voice:{languageCode:"ml-IN",name:"ml-IN-Standard-B"},
   audioConfig:{audioEncoding:"MP3",speakingRate:0.9}
  });
 });
 it("propagates learner cancellation to an in-flight Google request",async()=>{
  let providerSignal:AbortSignal|undefined;
  const fetcher=vi.fn(async(_url:string|URL|Request,init?:RequestInit)=>{
   providerSignal=init?.signal as AbortSignal|undefined;
   return await new Promise<Response>((_resolve,reject)=>{
    if(providerSignal?.aborted){reject(new DOMException("Aborted","AbortError"));return;}
    providerSignal?.addEventListener("abort",()=>reject(new DOMException("Aborted","AbortError")),{once:true});
   });
  });
  const provider=createGoogleCloudTtsProvider(config,fetcher)!;
  const controller=new AbortController();
  const pending=provider.synthesize({text:"നമസ്കാരം",speed:1,signal:controller.signal});
  await Promise.resolve();
  expect(fetcher).toHaveBeenCalledOnce();
  expect(providerSignal?.aborted).toBe(false);
  controller.abort();
  await expect(pending).rejects.toThrow();
  expect(providerSignal?.aborted).toBe(true);
 });
 it("aborts a stalled Google request at the configured provider timeout",async()=>{
  let requestSignal:AbortSignal|undefined;
  const fetcher=vi.fn(async(_url:string|URL|Request,init?:RequestInit)=>{
   requestSignal=init?.signal as AbortSignal|undefined;
   return await new Promise<Response>((_resolve,reject)=>{
    requestSignal?.addEventListener("abort",()=>reject(new Error("provider request aborted")),{once:true});
   });
  });
  const provider=createGoogleCloudTtsProvider(config,fetcher,5)!;
  await expect(provider.synthesize({text:"നമസ്കാരം",speed:1,signal:new AbortController().signal})).rejects.toThrow(/provider request aborted/i);
  expect(fetcher).toHaveBeenCalledOnce();
  expect(requestSignal?.aborted).toBe(true);
 });
 it("rejects an invalid configured provider timeout",()=>{
  expect(()=>createGoogleCloudTtsProvider(config,fetch,0)).toThrow(/timeout/i);
  expect(()=>createGoogleCloudTtsProvider(config,fetch,60_001)).toThrow(/timeout/i);
 });
 it("does not make a provider request when the learner has already cancelled",async()=>{
  const fetcher=vi.fn();
  const provider=createGoogleCloudTtsProvider(config,fetcher)!;
  const controller=new AbortController();controller.abort();
  await expect(provider.synthesize({text:"നമസ്കാരം",speed:1,signal:controller.signal})).rejects.toThrow(/cancelled/i);
  expect(fetcher).not.toHaveBeenCalled();
 });
 it("can synthesize plain text for controlled SSML comparison",async()=>{
  let body:Record<string,unknown>|undefined;
  const fetcher=vi.fn(async(_url:string|URL|Request,init?:RequestInit)=>{body=JSON.parse(String(init?.body));return Response.json({audioContent:Buffer.from(validMp3()).toString("base64")});});
  const provider=createGoogleCloudTtsProvider({...config,GABROO_GOOGLE_TTS_INPUT_MODE:"text"},fetcher)!;
  await provider.synthesize({text:"നമസ്കാരം! Please practise.",speed:1,signal:new AbortController().signal});
  expect(body?.input).toEqual({text:"നമസ്കാരം! Please practise."});
 });
 it("bounds the provider JSON response while streaming before buffering it",async()=>{
  let cancelled=false;
  const body=new ReadableStream<Uint8Array>({
   start(controller){controller.enqueue(new Uint8Array(1024));controller.enqueue(new Uint8Array(1024));},
   cancel(){cancelled=true;}
  });
  const provider=createGoogleCloudTtsProvider(config,async()=>new Response(body,{headers:{"content-type":"application/json"}}))!;
  await expect(provider.synthesize({text:"hello",speed:1,signal:new AbortController().signal})).rejects.toThrow(/size limit/i);
  expect(cancelled).toBe(true);
 });
 it("rejects an invalid configured English SSML locale",()=>{ expect(()=>createGoogleCloudTtsProvider({...config,GABROO_GOOGLE_TTS_ENGLISH_LANGUAGE_CODE:"bad-locale"})).toThrow(/English language code/i); });
 it("rejects a voice that does not match the configured locale",()=>{
  expect(()=>createGoogleCloudTtsProvider({...config,GABROO_GOOGLE_TTS_VOICE:"en-US-Standard-C"})).toThrow(/match the configured language/i);
 });
 it("rejects Chirp 3 HD until its different control contract has a dedicated adapter",()=>{
  expect(()=>createGoogleCloudTtsProvider({...config,GABROO_GOOGLE_TTS_VOICE:"ml-IN-Chirp3-HD-Charon"})).toThrow(/Standard and WaveNet/i);
 });
 it("rejects invalid input before making a network request",async()=>{
  const fetcher=vi.fn();
  const provider=createGoogleCloudTtsProvider(config,fetcher)!;
  const signal=new AbortController().signal;
  await expect(provider.synthesize({text:" ",speed:1,signal})).rejects.toThrow(/1–4000/);
  await expect(provider.synthesize({text:"hello",speed:1.6,signal})).rejects.toThrow(/0.75/);
  expect(fetcher).not.toHaveBeenCalled();
 });
 it("normalizes provider failures and rejects missing, malformed or oversized audio",async()=>{
  const input={text:"hello",speed:1,signal:new AbortController().signal};
  const unavailable=createGoogleCloudTtsProvider(config,async()=>new Response("failure",{status:403}))!;
  await expect(unavailable.synthesize(input)).rejects.toThrow(/status 403/);
  const missing=createGoogleCloudTtsProvider(config,async()=>Response.json({}))!;
  await expect(missing.synthesize(input)).rejects.toThrow(/no audio content/);
  const invalidMp3=createGoogleCloudTtsProvider(config,async()=>Response.json({audioContent:Buffer.from([1,2,3]).toString("base64")}))!;
  await expect(invalidMp3.synthesize(input)).rejects.toThrow(/complete, valid MP3/i);
  for(const audioContent of ["not base64!","A===","abc","AAAA="]){
   const malformed=createGoogleCloudTtsProvider(config,async()=>Response.json({audioContent}))!;
   await expect(malformed.synthesize(input)).rejects.toThrow(/malformed audio/);
  }
  // This is rejected from its encoded length before Buffer allocates decoded audio.
  const oversized=createGoogleCloudTtsProvider(config,async()=>Response.json({audioContent:"A".repeat(16*1024*1024+4)}))!;
  await expect(oversized.synthesize(input)).rejects.toThrow(/size limit/);
 });
});
