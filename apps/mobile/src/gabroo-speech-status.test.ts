import {describe,expect,it} from "vitest";
import {parseGabrooSpeechStatus} from "./gabroo-speech-status";

const available={
 available:true,
 formats:["audio/mpeg"],
 speed:{minimum:0.75,maximum:1.5}
};
const unavailable={
 available:false,
 formats:[],
 speed:{minimum:0.75,maximum:1.5}
};

describe("Gabroo speech readiness contract",()=>{
 it("accepts the configured MP3 capability and playback limits",()=>{
  expect(parseGabrooSpeechStatus(available)).toEqual(available);
 });
 it("accepts an unavailable provider without advertising formats",()=>{
  expect(parseGabrooSpeechStatus(unavailable)).toEqual(unavailable);
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
 it("rejects missing or malformed readiness fields",()=>{
  expect(()=>parseGabrooSpeechStatus(null)).toThrow(/invalid response/i);
  expect(()=>parseGabrooSpeechStatus({available:"yes",formats:["audio/mpeg"],speed:{minimum:0.75,maximum:1.5}})).toThrow(/invalid response/i);
  expect(()=>parseGabrooSpeechStatus({...available,formats:"audio/mpeg"})).toThrow(/invalid response/i);
  expect(()=>parseGabrooSpeechStatus({...available,speed:null})).toThrow(/invalid response/i);
 });
});
