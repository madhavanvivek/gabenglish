import {afterEach,describe,expect,it,vi} from "vitest";
import {connectGabrooRealtimeSocket,createGabrooRealtimeFrame,openGabrooRealtimeSession,toGabrooRealtimeWebSocketUrl} from "./gabroo-realtime-transport";

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


 it("connects the bounded PCM sender to ordered WebSocket frames",async()=>{
  const sent:Array<string|ArrayBuffer>=[];
  class MockSocket{
   static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;
   readyState=1;bufferedAmount=0;
   onopen:(()=>void)|null=null;onmessage:((event:{data:string})=>void)|null=null;
   onerror:(()=>void)|null=null;onclose:((event:{code:number;reason:string})=>void)|null=null;
   constructor(readonly url:string,readonly protocols:string[]){}
   send(value:string|ArrayBuffer){sent.push(value);}
   close(){this.readyState=3;}
  }
  vi.stubGlobal("WebSocket",Object.assign(MockSocket,{CONNECTING:0,OPEN:1,CLOSING:2,CLOSED:3}));
  const connection=connectGabrooRealtimeSocket({
   apiBaseUrl:"https://api.example.com",sessionId:"session-test",connectionTicket:"b".repeat(64)
  });
  expect(()=>connection.startTurn("turn-test",{codec:"pcm_s16le",sample_rate_hz:16_000,channels:1})).toThrow("not been accepted");
  connection.socket.onopen?.();
  connection.socket.onmessage?.({data:JSON.stringify({protocol_version:1,session_id:"session-test",type:"session.accepted",audio:{codec:"pcm_s16le",sample_rate_hz:16000,channels:1},max_frame_bytes:65536,max_turn_ms:120000})} as MessageEvent);
  connection.startTurn("turn-test",{codec:"pcm_s16le",sample_rate_hz:16_000,channels:1});
  const sender=connection.createAudioSender("turn-test");
  const samples=new Float32Array(1_600);
  const data=samples.buffer.slice(samples.byteOffset,samples.byteOffset+samples.byteLength);
  await sender.enqueue({data,encoding:"float32",sampleRate:16_000,channels:1});
  const frameMessages=sent.filter(value=>typeof value==="string").map(value=>JSON.parse(value as string)).filter(value=>value.type==="audio.frame");
  expect(frameMessages.map(value=>value.sequence)).toEqual([0]);
  expect(sent.filter(value=>value instanceof ArrayBuffer)).toHaveLength(1);
  expect(sender.nextSequence).toBe(1);
  let drained=false;
  await connection.finishTurn("turn-test",{finish:async()=>{drained=true;}});
  const endMessage=sent.filter(value=>typeof value==="string").map(value=>JSON.parse(value as string)).find(value=>value.type==="turn.end");
  expect(drained).toBe(true);
  expect(endMessage).toMatchObject({turn_id:"turn-test",type:"turn.end"});
  connection.close();
 });

 it("revokes realtime send permission after the server closes or interrupts a session",()=>{
  const sent:string[]=[];
  class MockSocket{
   static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;
   readyState=1;bufferedAmount=0;
   onopen:(()=>void)|null=null;onmessage:((event:{data:string})=>void)|null=null;
   onerror:(()=>void)|null=null;onclose:((event:{code:number;reason:string})=>void)|null=null;
   constructor(readonly url:string,readonly protocols:string[]){}
   send(value:string|ArrayBuffer){if(typeof value==="string")sent.push(value);}
   close(){this.readyState=3;}
  }
  vi.stubGlobal("WebSocket",Object.assign(MockSocket,{CONNECTING:0,OPEN:1,CLOSING:2,CLOSED:3}));
  const connection=connectGabrooRealtimeSocket({apiBaseUrl:"https://api.example.com",sessionId:"session-test",connectionTicket:"d".repeat(64)});
  const accepted={protocol_version:1,session_id:"session-test",type:"session.accepted",audio:{codec:"pcm_s16le",sample_rate_hz:16000,channels:1},max_frame_bytes:65536,max_turn_ms:120000};
  connection.socket.onmessage?.({data:JSON.stringify(accepted)} as MessageEvent);
  connection.startTurn("turn-test",{codec:"pcm_s16le",sample_rate_hz:16000,channels:1});
  connection.socket.onmessage?.({data:JSON.stringify({protocol_version:1,session_id:"session-test",type:"session.closed",reason:"learner_stop"})} as MessageEvent);
  expect(()=>connection.startTurn("turn-next",{codec:"pcm_s16le",sample_rate_hz:16000,channels:1})).toThrow("not been accepted");
  expect(sent.map(value=>JSON.parse(value).type)).toEqual(["turn.start"]);
  connection.close();
 });

 it("allows only one active voice turn and releases it on a terminal turn event",()=>{
  const sent:string[]=[];
  class MockSocket{
   static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;
   readyState=1;bufferedAmount=0;
   onopen:(()=>void)|null=null;onmessage:((event:{data:string})=>void)|null=null;
   onerror:(()=>void)|null=null;onclose:((event:{code:number;reason:string})=>void)|null=null;
   constructor(readonly url:string,readonly protocols:string[]){}
   send(value:string|ArrayBuffer){if(typeof value==="string")sent.push(value);}
   close(){this.readyState=3;}
  }
  vi.stubGlobal("WebSocket",Object.assign(MockSocket,{CONNECTING:0,OPEN:1,CLOSING:2,CLOSED:3}));
  const connection=connectGabrooRealtimeSocket({apiBaseUrl:"https://api.example.com",sessionId:"session-test",connectionTicket:"e".repeat(64)});
  const accepted={protocol_version:1,session_id:"session-test",type:"session.accepted",audio:{codec:"pcm_s16le",sample_rate_hz:16000,channels:1},max_frame_bytes:65536,max_turn_ms:120000};
  connection.socket.onmessage?.({data:JSON.stringify(accepted)} as MessageEvent);
  const audio={codec:"pcm_s16le" as const,sample_rate_hz:16000 as const,channels:1 as const};
  connection.startTurn("turn-one",audio);
  expect(()=>connection.startTurn("turn-two",audio)).toThrow("already active");
  expect(()=>connection.sendAudioFrame("turn-two",0,new Uint8Array([1,2]))).toThrow("not active");
  connection.socket.onmessage?.({data:JSON.stringify({protocol_version:1,session_id:"session-test",turn_id:"turn-one",type:"turn.failed",code:"RECOGNITION_FAILED",message:"Try again"})} as MessageEvent);
  connection.startTurn("turn-two",audio);
  expect(sent.map(value=>JSON.parse(value).type)).toEqual(["turn.start","turn.start"]);
  connection.close();
 });

 it("does not send turn.end when audio draining fails",async()=>{
  const sent:string[]=[];
  class MockSocket{
   static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;
   readyState=1;bufferedAmount=0;
   onopen:(()=>void)|null=null;onmessage:((event:{data:string})=>void)|null=null;
   onerror:(()=>void)|null=null;onclose:((event:{code:number;reason:string})=>void)|null=null;
   constructor(readonly url:string,readonly protocols:string[]){}
   send(value:string|ArrayBuffer){if(typeof value==="string")sent.push(value);}
   close(){this.readyState=3;}
  }
  vi.stubGlobal("WebSocket",Object.assign(MockSocket,{CONNECTING:0,OPEN:1,CLOSING:2,CLOSED:3}));
  const connection=connectGabrooRealtimeSocket({apiBaseUrl:"https://api.example.com",sessionId:"session-test",connectionTicket:"c".repeat(64)});
  await expect(connection.finishTurn("turn-test",{finish:async()=>{throw new Error("audio drain failed");}})).rejects.toThrow(/audio drain failed/);
  expect(sent.map(value=>JSON.parse(value).type)).not.toContain("turn.end");
 });
 
 afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
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
   accept(){
    this.onmessage?.({data:JSON.stringify({protocol_version:1,session_id:"session-test",type:"session.accepted",audio:{codec:"pcm_s16le",sample_rate_hz:16000,channels:1},max_frame_bytes:65536,max_turn_ms:120000})});
   }
  }
  let instance:MockWebSocket|undefined;
  class CapturingWebSocket extends MockWebSocket{
   constructor(url:string,protocols:string[]){super(url,protocols);instance=this;}
  }
  vi.stubGlobal("WebSocket",Object.assign(CapturingWebSocket,{CONNECTING:0,OPEN:1,CLOSING:2,CLOSED:3}));
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL","https://api.example.com");
  const connected=openGabrooRealtimeSession({
   consentGranted:true,
   ticketProvider:async()=>({session_id:"session-test",connection_ticket:"a".repeat(64)})
  });
  await Promise.resolve();
  instance?.open();
  let resolved=false;
  void connected.then(()=>{resolved=true;});
  await Promise.resolve();
  expect(resolved).toBe(false);
  instance?.accept();
  const session=await connected;
  expect(resolved).toBe(true);
  expect(instance?.url).toBe("wss://api.example.com/api/v1/gabroo/realtime/connect");
  expect(instance?.protocols).toEqual(["gabroo.v1","ticket."+"a".repeat(64)]);
  expect(sent).toHaveLength(1);
  expect(JSON.parse(sent[0])).toMatchObject({session_id:"session-test",type:"session.ready"});
  session.close();
 });
});
