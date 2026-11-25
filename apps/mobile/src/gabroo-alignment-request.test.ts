import {describe,expect,it} from "vitest";
import {assertGabrooAlignmentAudioSize,validateGabrooAlignmentRequest} from "./gabroo-alignment-request";

const metadata={audioId:"a".repeat(64),audioSha256:"a".repeat(64),textSha256:"b".repeat(64),durationMs:1250};

describe("Gabroo alignment request guard",()=>{
 it("does not read or upload audio when no phoneme provider is advertised",()=>{
  expect(validateGabrooAlignmentRequest({text:"Hello",metadata,phonemeAlignmentAvailable:false})).toEqual({ok:false,reason:"unavailable"});
 });
 it("skips requests without metadata or source text",()=>{
  expect(validateGabrooAlignmentRequest({text:"Hello",metadata:null,phonemeAlignmentAvailable:true})).toEqual({ok:false,reason:"missing_input"});
  expect(validateGabrooAlignmentRequest({text:"  ",metadata,phonemeAlignmentAvailable:true})).toEqual({ok:false,reason:"missing_input"});
 });
 it("returns normalized text for a valid exact-audio identity",()=>{
  expect(validateGabrooAlignmentRequest({text:"  Hello there!  ",metadata,phonemeAlignmentAvailable:true})).toEqual({ok:true,text:"Hello there!"});
 });
 it("rejects oversized transcripts and invalid identity fingerprints",()=>{
  expect(()=>validateGabrooAlignmentRequest({text:"x".repeat(4001),metadata,phonemeAlignmentAvailable:true})).toThrow("permitted length");
  expect(()=>validateGabrooAlignmentRequest({text:"Hello",metadata:{...metadata,audioSha256:"c".repeat(64)},phonemeAlignmentAvailable:true})).toThrow("identity is invalid");
  expect(()=>validateGabrooAlignmentRequest({text:"Hello",metadata:{...metadata,durationMs:0},phonemeAlignmentAvailable:true})).toThrow("identity is invalid");
 });
 it("rejects missing, zero, fractional, unsafe and oversized cached audio lengths",()=>{
  for(const size of [undefined,0,-1,1.5,Number.MAX_SAFE_INTEGER,12*1024*1024+1]){
   expect(()=>assertGabrooAlignmentAudioSize(size)).toThrow("size limit");
  }
 });
 it("accepts positive bounded integer cached audio sizes",()=>{
  expect(()=>assertGabrooAlignmentAudioSize(1)).not.toThrow();
  expect(()=>assertGabrooAlignmentAudioSize(12*1024*1024)).not.toThrow();
 });
});
