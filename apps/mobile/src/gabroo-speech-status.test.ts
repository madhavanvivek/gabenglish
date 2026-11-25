import {describe,expect,it} from "vitest";
import {parseGabrooSpeechStatus} from "./gabroo-speech-status";

const available={
 available:true,
 formats:["audio/mpeg"],
 speed:{minimum:0.75,maximum:1.5},
 capabilities:{speech_synthesis:true,character_alignment:false,phoneme_alignment:false,live_avatar_renderer:false}
};
const unavailable={
 available:false,
 formats:[],
 speed:{minimum:0.75,maximum:1.5},
 capabilities:{speech_synthesis:false,character_alignment:false,phoneme_alignment:false,live_avatar_renderer:false}
};

describe("Gabroo speech readiness contract",()=>{
 it("accepts the configured MP3 capability and playback limits",()=>{
  expect(parseGabrooSpeechStatus(available)).toEqual(available);
 });
 it("accepts an unavailable provider without advertising formats",()=>{
  expect(parseGabrooSpeechStatus(unavailable)).toEqual(unavailable);
 });
 it("reports the current runtime honestly: speech only, no alignment or live avatar renderer",()=>{
  expect(parseGabrooSpeechStatus(available).capabilities).toEqual({speech_synthesis:true,character_alignment:false,phoneme_alignment:false,live_avatar_renderer:false});
  expect(parseGabrooSpeechStatus(unavailable).capabilities.speech_synthesis).toBe(false);
 });
 it("accepts alignment only when the API explicitly advertises an injected provider",()=>{
  const configured={...available,capabilities:{...available.capabilities,character_alignment:true,phoneme_alignment:true}};
  expect(parseGabrooSpeechStatus(configured)).toEqual(configured);
 });
 it("rejects non-boolean alignment capability flags",()=>{
  expect(()=>parseGabrooSpeechStatus({...available,capabilities:{...available.capabilities,phoneme_alignment:"yes"}})).toThrow(/invalid response/i);
 });
 it("rejects an advertised alignment or renderer until the server implements it",()=>{
  expect(()=>parseGabrooSpeechStatus({...available,capabilities:{...available.capabilities,phoneme_alignment:true}})).toThrow(/invalid response/i);
  expect(()=>parseGabrooSpeechStatus({...available,capabilities:{...available.capabilities,character_alignment:true}})).toThrow(/invalid response/i);
  expect(()=>parseGabrooSpeechStatus({...available,capabilities:{...available.capabilities,live_avatar_renderer:true}})).toThrow(/invalid response/i);
 });
 it("rejects unknown audio formats instead of treating them as playable",()=>{
  expect(()=>parseGabrooSpeechStatus({...available,formats:["application/json"]})).toThrow(/invalid response/i);
 });
 it("rejects duplicate advertised formats",()=>{
  expect(()=>parseGabrooSpeechStatus({...available,formats:["audio/mpeg","audio/mpeg"]})).toThrow(/invalid response/i);
 });
 it("rejects an available status without the required MP3 format",()=>{
  expect(()=>parseGabrooSpeechStatus({...available,formats:[]})).toThrow(/invalid response/i);
 });
 it("rejects formats when the provider is unavailable",()=>{
  expect(()=>parseGabrooSpeechStatus({...unavailable,formats:["audio/mpeg"]})).toThrow(/invalid response/i);
 });
 it("rejects unsupported speed bounds",()=>{
  expect(()=>parseGabrooSpeechStatus({...available,speed:{minimum:0.5,maximum:1.5}})).toThrow(/invalid response/i);
  expect(()=>parseGabrooSpeechStatus({...available,speed:{minimum:0.75,maximum:1.6}})).toThrow(/invalid response/i);
  expect(()=>parseGabrooSpeechStatus({...available,speed:{minimum:1.4,maximum:1.2}})).toThrow(/invalid response/i);
 });
 it("rejects non-finite speed values",()=>{
  expect(()=>parseGabrooSpeechStatus({...available,speed:{minimum:Number.NaN,maximum:1.5}})).toThrow(/invalid response/i);
  expect(()=>parseGabrooSpeechStatus({...available,speed:{minimum:0.75,maximum:Number.POSITIVE_INFINITY}})).toThrow(/invalid response/i);
 });
 it("rejects arrays masquerading as readiness objects or speed ranges",()=>{
  expect(()=>parseGabrooSpeechStatus([])).toThrow(/invalid response/i);
  expect(()=>parseGabrooSpeechStatus({...available,speed:[]})).toThrow(/invalid response/i);
 });
 it("accepts inclusive supported speed boundaries",()=>{
  expect(parseGabrooSpeechStatus({...available,speed:{minimum:0.75,maximum:0.75}}).speed).toEqual({minimum:0.75,maximum:0.75});
  expect(parseGabrooSpeechStatus({...available,speed:{minimum:1.5,maximum:1.5}}).speed).toEqual({minimum:1.5,maximum:1.5});
 });
 it("rejects missing or malformed readiness fields",()=>{
  expect(()=>parseGabrooSpeechStatus(null)).toThrow(/invalid response/i);
  expect(()=>parseGabrooSpeechStatus({available:"yes",formats:["audio/mpeg"],speed:{minimum:0.75,maximum:1.5}})).toThrow(/invalid response/i);
  expect(()=>parseGabrooSpeechStatus({...available,formats:"audio/mpeg"})).toThrow(/invalid response/i);
  expect(()=>parseGabrooSpeechStatus({...available,speed:null})).toThrow(/invalid response/i);
 });
});
