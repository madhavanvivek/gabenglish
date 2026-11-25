import {describe,it,expect,vi} from "vitest";
import {buildGabrooGoogleTtsSsml,createGoogleCloudTtsProvider} from "./google-cloud-tts-provider.js";

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
   return Response.json({audioContent:Buffer.from([1,2,3]).toString("base64")});
  });
  const provider=createGoogleCloudTtsProvider(config,fetcher)!;
  const controller=new AbortController();
  await expect(provider.synthesize({text:"നമസ്കാരം! Let's practise.",speed:0.9,signal:controller.signal})).resolves.toEqual({
   audio:new Uint8Array([1,2,3]),contentType:"audio/mpeg"
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
 it("can synthesize plain text for controlled SSML comparison",async()=>{
  let body:Record<string,unknown>|undefined;
  const fetcher=vi.fn(async(_url:string|URL|Request,init?:RequestInit)=>{body=JSON.parse(String(init?.body));return Response.json({audioContent:Buffer.from([1,2,3]).toString("base64")});});
  const provider=createGoogleCloudTtsProvider({...config,GABROO_GOOGLE_TTS_INPUT_MODE:"text"},fetcher)!;
  await provider.synthesize({text:"നമസ്കാരം! Please practise.",speed:1,signal:new AbortController().signal});
  expect(body?.input).toEqual({text:"നമസ്കാരം! Please practise."});
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
  for(const audioContent of ["not base64!","A===","abc","AAAA="]){
   const malformed=createGoogleCloudTtsProvider(config,async()=>Response.json({audioContent}))!;
   await expect(malformed.synthesize(input)).rejects.toThrow(/malformed audio/);
  }
  // This is rejected from its encoded length before Buffer allocates decoded audio.
  const oversized=createGoogleCloudTtsProvider(config,async()=>Response.json({audioContent:"A".repeat(16*1024*1024+4)}))!;
  await expect(oversized.synthesize(input)).rejects.toThrow(/size limit/);
 });
});
