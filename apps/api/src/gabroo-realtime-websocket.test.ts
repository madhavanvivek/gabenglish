import {describe,it,expect} from "vitest";
import {advanceGabrooRealtimeHandshake,parseGabrooRealtimeUpgrade,GABROO_REALTIME_PATH,GABROO_REALTIME_SUBPROTOCOL} from "./gabroo-realtime-websocket.js";

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
