import {describe,expect,it} from "vitest";
import {scoreSpeechTranscript} from "./gabroo-speech-metrics.js";

describe("Gabroo offline speech transcript metrics",()=>{
 it("returns zero errors for equivalent NFC Malayalam text",()=>{
  expect(scoreSpeechTranscript("നമസ്കാരം","നമസ്കാരം")).toMatchObject({wordErrorRate:0,characterErrorRate:0});
 });
 it("normalises whitespace and ignores punctuation for WER",()=>{
  const score=scoreSpeechTranscript("Hello,   Gabroo!","hello gabroo");
  expect(score.wordErrorRate).toBe(0);
  expect(score.characterErrorRate).toBeGreaterThan(0);
 });
 it("counts substitutions, deletions and insertions in WER",()=>{
  expect(scoreSpeechTranscript("i want learn english","i want to learn")).toMatchObject({wordErrorRate:0.5,referenceWords:4,substitutions:0,deletions:1,insertions:1});
 });
 it("keeps empty reference insertions visible instead of hiding them",()=>{
  expect(scoreSpeechTranscript("","hello")).toMatchObject({wordErrorRate:1,characterErrorRate:5});
 });
 it("rejects non-string inputs",()=>{
  expect(()=>scoreSpeechTranscript(null as never,"hello")).toThrow(TypeError);
 });
 it("normalises Unicode composition before character scoring",()=>{
  expect(scoreSpeechTranscript("café","cafe\u0301").characterErrorRate).toBe(0);
 });
});
