import {describe,expect,it} from "vitest";
import {createGabrooRealtimeFrame,toGabrooRealtimeWebSocketUrl} from "./gabroo-realtime-transport";

describe("Gabroo realtime mobile transport helpers",()=>{
 it("converts HTTPS API origins to secure WebSocket URLs",()=>{
  expect(toGabrooRealtimeWebSocketUrl("https://api.example.com/")).toBe("wss://api.example.com/api/v1/gabroo/realtime/connect");
 });
 it("preserves a configured API path prefix and converts local HTTP for development",()=>{
  expect(toGabrooRealtimeWebSocketUrl("http://10.0.2.2:4000/gabenglish")).toBe("ws://10.0.2.2:4000/gabenglish/api/v1/gabroo/realtime/connect");
 });
 it("rejects non-HTTP API URLs",()=>{
  expect(()=>toGabrooRealtimeWebSocketUrl("file:///tmp/api")).toThrow("HTTP(S)");
 });
 it("creates exact-length frame metadata and an isolated binary payload",()=>{
  const source=new Uint8Array([1,2,3,4]);
  const frame=createGabrooRealtimeFrame("turn-1","session-1",3,source);
  source[0]=99;
  expect(frame.metadata).toMatchObject({protocol_version:1,session_id:"session-1",turn_id:"turn-1",type:"audio.frame",sequence:3,byte_length:4});
  expect(Array.from(new Uint8Array(frame.binary))).toEqual([1,2,3,4]);
 });
 it("rejects empty, oversized and invalid-sequence frames",()=>{
  expect(()=>createGabrooRealtimeFrame("turn-1","session-1",0,new Uint8Array())).toThrow("empty or exceeds");
  expect(()=>createGabrooRealtimeFrame("turn-1","session-1",-1,new Uint8Array([1]))).toThrow("sequence");
  expect(()=>createGabrooRealtimeFrame("turn-1","session-1",0,new Uint8Array(64*1024+1))).toThrow("empty or exceeds");
 });
});
