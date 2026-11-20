import {describe,it,expect} from "vitest";
import {advanceGabrooRealtimeHandshake,parseGabrooRealtimeUpgrade,pcm16MonoToWav,GABROO_REALTIME_PATH,GABROO_REALTIME_SUBPROTOCOL} from "./gabroo-realtime-websocket.js";

function request(input:{url?:string;origin?:string;protocols?:string}={}){
 return {
  url:input.url??GABROO_REALTIME_PATH,
  headers:{
   ...(input.origin?{origin:input.origin}:{}),
   ...(input.protocols?{"sec-websocket-protocol":input.protocols}:{})
  }
 } as any;
}
const ticket="a".repeat(64);
const protocols=GABROO_REALTIME_SUBPROTOCOL+", ticket."+ticket;
const origins=["https://gabenglish.example","http://localhost:8081"];


describe("Gabroo realtime PCM conversion",()=>{
 it("wraps complete mono PCM16 samples in a valid WAV header",()=>{
  const pcm=new Uint8Array([0x01,0x00,0xff,0x7f]);
  const wav=pcm16MonoToWav(pcm,16000);
  expect(wav.subarray(0,4).toString("ascii")).toBe("RIFF");
  expect(wav.readUInt32LE(4)).toBe(40);
  expect(wav.subarray(8,12).toString("ascii")).toBe("WAVE");
  expect(wav.subarray(12,16).toString("ascii")).toBe("fmt ");
  expect(wav.readUInt16LE(20)).toBe(1);
  expect(wav.readUInt16LE(22)).toBe(1);
  expect(wav.readUInt32LE(24)).toBe(16000);
  expect(wav.readUInt32LE(28)).toBe(32000);
  expect(wav.readUInt16LE(32)).toBe(2);
  expect(wav.readUInt16LE(34)).toBe(16);
  expect(wav.readUInt32LE(40)).toBe(4);
  expect(wav.subarray(44)).toEqual(Buffer.from(pcm));
 });
 it("rejects empty and incomplete PCM16 samples",()=>{
  expect(()=>pcm16MonoToWav(new Uint8Array())).toThrow("complete 16-bit");
  expect(()=>pcm16MonoToWav(new Uint8Array([0x01]))).toThrow("complete 16-bit");
 });
});

describe("Gabroo realtime WebSocket upgrade validation",()=>{
 it("accepts a valid one-time ticket in the subprotocol header without a query string",()=>{
  expect(parseGabrooRealtimeUpgrade(request({protocols}),origins)).toEqual({ok:true,ticket});
 });
 it("accepts native clients that omit Origin when they present the capability ticket",()=>{
  expect(parseGabrooRealtimeUpgrade(request({protocols}),origins).ok).toBe(true);
 });
 it("rejects a browser origin that is not explicitly allowed",()=>{
  expect(parseGabrooRealtimeUpgrade(request({origin:"https://attacker.example",protocols}),origins)).toMatchObject({ok:false,status:403,reason:"origin_denied"});
 });
 it("allows only configured origins, compared by normalized origin",()=>{
  expect(parseGabrooRealtimeUpgrade(request({origin:"https://gabenglish.example/",protocols}),origins).ok).toBe(true);
 });
 it("rejects credentials in the URL query string",()=>{
  expect(parseGabrooRealtimeUpgrade(request({url:GABROO_REALTIME_PATH+"?ticket="+ticket,protocols}),origins)).toMatchObject({ok:false,status:400,reason:"query_not_allowed"});
 });
 it("rejects missing protocol version or ticket",()=>{
  expect(parseGabrooRealtimeUpgrade(request({protocols:GABROO_REALTIME_SUBPROTOCOL}),origins)).toMatchObject({ok:false,status:401,reason:"ticket_required"});
 });
 it("rejects duplicate or ambiguous ticket subprotocols",()=>{
  expect(parseGabrooRealtimeUpgrade(request({protocols:protocols+", ticket."+"b".repeat(64)}),origins)).toMatchObject({ok:false,status:401,reason:"ticket_required"});
  expect(parseGabrooRealtimeUpgrade(request({protocols:protocols+", unexpected"}),origins)).toMatchObject({ok:false,status:401,reason:"ticket_required"});
 });
 it("rejects malformed ticket values",()=>{
  expect(parseGabrooRealtimeUpgrade(request({protocols:GABROO_REALTIME_SUBPROTOCOL+", ticket.not-a-ticket"}),origins)).toMatchObject({ok:false,status:401,reason:"ticket_required"});
 });
 it("rejects an unexpected upgrade path",()=>{
  expect(parseGabrooRealtimeUpgrade(request({url:"/other",protocols}),origins)).toMatchObject({ok:false,status:404,reason:"not_found"});
 });
});


describe("Gabroo realtime session-ready handshake",()=>{
 it("accepts session.ready exactly once",()=>{
  const result=advanceGabrooRealtimeHandshake("awaiting_ready","session.ready");
  expect(result).toEqual({state:"ready",accepted:true,close:false});
 });
 it("rejects audio/control messages before session.ready",()=>{
  for(const type of ["turn.start","audio.frame","turn.end","session.stop"]){
   expect(advanceGabrooRealtimeHandshake("awaiting_ready",type).close).toBe(true);
  }
 });
 it("rejects a duplicate session.ready message",()=>{
  expect(advanceGabrooRealtimeHandshake("ready","session.ready")).toEqual({state:"ready",accepted:false,close:true});
 });
 it("allows normal messages after the handshake",()=>{
  expect(advanceGabrooRealtimeHandshake("ready","turn.start")).toEqual({state:"ready",accepted:false,close:false});
 });
});
