import {describe,expect,it} from "vitest";
import {AuthApiError,parseGabrooSpeechStatus} from "./auth-api";

describe("Gabroo speech readiness contract",()=>{
 it("accepts a configured MP3 provider and supported playback range",()=>{
  expect(parseGabrooSpeechStatus({available:true,formats:["audio/mpeg"],speed:{minimum:0.75,maximum:1.5}})).toEqual({available:true,formats:["audio/mpeg"],speed:{minimum:0.75,maximum:1.5}});
 });
 it("accepts an unavailable provider with no formats",()=>{
  expect(parseGabrooSpeechStatus({available:false,formats:[],speed:{minimum:0.75,maximum:1.5}}).available).toBe(false);
 });
 it.each([
  null,
  {},
  {available:"yes",formats:[],speed:{minimum:0.75,maximum:1.5}},
  {available:true,formats:[""],speed:{minimum:0.75,maximum:1.5}},
  {available:true,formats:[1],speed:{minimum:0.75,maximum:1.5}},
  {available:true,formats:[],speed:{minimum:1.5,maximum:0.75}},
  {available:true,formats:[],speed:{minimum:0.5,maximum:1.5}},
  {available:true,formats:[],speed:{minimum:0.75,maximum:2}},
  {available:true,formats:[],speed:{minimum:Number.NaN,maximum:1.5}},
 ])("rejects malformed or unsafe provider metadata: %j",(payload)=>{
  expect(()=>parseGabrooSpeechStatus(payload)).toThrow(AuthApiError);
 });
});
