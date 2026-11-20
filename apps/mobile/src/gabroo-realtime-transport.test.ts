import {afterEach,describe,expect,it,vi} from "vitest";
import {createGabrooRealtimeFrame,openGabrooRealtimeSession,toGabrooRealtimeWebSocketUrl} from "./gabroo-realtime-transport";

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

 afterEach(()=>vi.unstubAllGlobals());
 it("uses the one-use ticket and waits for server session confirmation",async()=>{
  const sent:string[]=[];
  class MockWebSocket{
   static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;
   readyState=0;
   onopen:(()=>void)|null=null;
   onmessage:((event:{data:string})=>void)|null=null;
   onerror:(()=>void)|null=null;
   onclose:((event:{code:number;reason:string})=>void)|null=null;
   constructor(readonly url:string,readonly protocols:string[]){}
   send(value:string|ArrayBuffer){sent.push(typeof value==="string"?value:"binary");}
   close(code=1000,reason=""){this.readyState=3;this.onclose?.({code,reason});}
   open(){
    this.readyState=1;this.onopen?.();
    this.onmessage?.({data:JSON.stringify({protocol_version:1,session_id:"session-test",type:"session.connected"})});
   }
  }
  let instance:MockWebSocket|undefined;
  class CapturingWebSocket extends MockWebSocket{
   constructor(url:string,protocols:string[]){super(url,protocols);instance=this;}
  }
  vi.stubGlobal("WebSocket",Object.assign(CapturingWebSocket,{CONNECTING:0,OPEN:1,CLOSING:2,CLOSED:3}));
  const connected=openGabrooRealtimeSession({
   consentGranted:true,
   ticketProvider:async()=>({session_id:"session-test",connection_ticket:"a".repeat(64)})
  });
  await Promise.resolve();
  instance?.open();
  const session=await connected;
  expect(instance?.url).toBe("wss://api.example.com/api/v1/gabroo/realtime/connect");
  expect(instance?.protocols).toEqual(["gabroo.v1","ticket."+"a".repeat(64)]);
  expect(sent).toHaveLength(1);
  expect(JSON.parse(sent[0])).toMatchObject({session_id:"session-test",type:"session.ready"});
  session.close();
 });
});
