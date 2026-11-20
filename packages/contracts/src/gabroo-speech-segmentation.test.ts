import {describe,expect,it} from "vitest";
import {chunkGabrooSpeechSegments,splitGabrooSpeechText} from "./gabroo-speech.js";

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
 it("chunks long mixed-language replies at sentence boundaries without losing text",()=>{
  const source="Hello there. This is a longer explanation! നമസ്കാരം. സുഖമാണോ?";
  const chunks=chunkGabrooSpeechSegments(splitGabrooSpeechText(source),18);
  expect(chunks.map(chunk=>chunk.text).join("")).toBe(source);
  expect(chunks.every(chunk=>chunk.text.length<=18)).toBe(true);
  expect(chunks.map(chunk=>chunk.language)).toEqual(["en","en","en","ml","ml"]);
 });
 it("hard-splits a long sentence at the configured safe request size",()=>{
  const source="a".repeat(41);
  const chunks=chunkGabrooSpeechSegments([{text:source,language:"en"}],16);
  expect(chunks.map(chunk=>chunk.text).join("")).toBe(source);
  expect(chunks.map(chunk=>chunk.text.length)).toEqual([16,16,9]);
 });
 it("rejects unsafe chunk limits",()=>{
  expect(()=>chunkGabrooSpeechSegments([],0)).toThrow(/between 1 and 4000/);
  expect(()=>chunkGabrooSpeechSegments([],4001)).toThrow(/between 1 and 4000/);
 });
});
