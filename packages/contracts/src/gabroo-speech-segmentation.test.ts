import {describe,expect,it} from "vitest";
import {splitGabrooSpeechText} from "./gabroo-speech.js";

describe("Gabroo Malayalam-English speech segmentation",()=>{
 it("keeps a Malayalam-only reply in one Malayalam run",()=>{
  expect(splitGabrooSpeechText("നമസ്കാരം")).toEqual([{text:"നമസ്കാരം",language:"ml"}]);
 });
 it("splits code-switched speech in order and preserves separators",()=>{
  expect(splitGabrooSpeechText("Hello, സുഖമാണോ? How are you!")).toEqual([
   {text:"Hello, ",language:"en"},
   {text:"സുഖമാണോ? ",language:"ml"},
   {text:"How are you!",language:"en"}
  ]);
 });
 it("attaches leading punctuation to the first spoken run",()=>{
  expect(splitGabrooSpeechText("“ഹായ്”")).toEqual([{text:"“ഹായ്”",language:"ml"}]);
 });
 it("returns no speech runs for whitespace or punctuation alone",()=>{
  expect(splitGabrooSpeechText("   … — ")).toEqual([]);
 });
 it("preserves digits and punctuation alongside English text",()=>{
  expect(splitGabrooSpeechText("Room 204, please.")).toEqual([{text:"Room 204, please.",language:"en"}]);
 });
});
