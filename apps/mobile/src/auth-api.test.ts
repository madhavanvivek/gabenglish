import {describe,expect,it} from "vitest";
import {parseGabrooSpeechStatus} from "./gabroo-speech-status";

describe("Gabroo speech readiness contract",()=>{
 it("accepts a configured MP3 provider and supported playback range",()=>{
  expect(parseGabrooSpeechStatus({available:true,formats:["audio/mpeg"],speed:{minimum:0.75,maximum:1.5},capabilities:{speech_synthesis:true,character_alignment:false,phoneme_alignment:false,live_avatar_renderer:false}})).toEqual({available:true,formats:["audio/mpeg"],speed:{minimum:0.75,maximum:1.5},capabilities:{speech_synthesis:true,character_alignment:false,phoneme_alignment:false,live_avatar_renderer:false}});
 });
 it("accepts an unavailable provider with no formats",()=>{
  expect(parseGabrooSpeechStatus({available:false,formats:[],speed:{minimum:0.75,maximum:1.5},capabilities:{speech_synthesis:false,character_alignment:false,phoneme_alignment:false,live_avatar_renderer:false}}).available).toBe(false);
 });
 it.each([
  null,
  {},
  {available:"yes",formats:[],speed:{minimum:0.75,maximum:1.5},capabilities:{speech_synthesis:false,character_alignment:false,phoneme_alignment:false,live_avatar_renderer:false}},
  {available:true,formats:[""],speed:{minimum:0.75,maximum:1.5},capabilities:{speech_synthesis:true,character_alignment:false,phoneme_alignment:false,live_avatar_renderer:false}},
  {available:true,formats:[1],speed:{minimum:0.75,maximum:1.5},capabilities:{speech_synthesis:true,character_alignment:false,phoneme_alignment:false,live_avatar_renderer:false}},
  {available:true,formats:[],speed:{minimum:0.75,maximum:1.5},capabilities:{speech_synthesis:true,character_alignment:false,phoneme_alignment:false,live_avatar_renderer:false}},
  {available:false,formats:["audio/mpeg"],speed:{minimum:0.75,maximum:1.5},capabilities:{speech_synthesis:false,character_alignment:false,phoneme_alignment:false,live_avatar_renderer:false}},
  {available:true,formats:[],speed:{minimum:1.5,maximum:0.75},capabilities:{speech_synthesis:true,character_alignment:false,phoneme_alignment:false,live_avatar_renderer:false}},
  {available:true,formats:[],speed:{minimum:0.5,maximum:1.5},capabilities:{speech_synthesis:true,character_alignment:false,phoneme_alignment:false,live_avatar_renderer:false}},
  {available:true,formats:[],speed:{minimum:0.75,maximum:2},capabilities:{speech_synthesis:true,character_alignment:false,phoneme_alignment:false,live_avatar_renderer:false}},
  {available:true,formats:[],speed:{minimum:Number.NaN,maximum:1.5},capabilities:{speech_synthesis:true,character_alignment:false,phoneme_alignment:false,live_avatar_renderer:false}},
 ])("rejects malformed or unsafe provider metadata: %j",(payload)=>{
  expect(()=>parseGabrooSpeechStatus(payload)).toThrow("Gabroo speech availability returned an invalid response.");
 });
});
