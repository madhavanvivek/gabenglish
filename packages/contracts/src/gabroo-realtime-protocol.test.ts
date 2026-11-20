import {describe,expect,it} from "vitest";
import {
 GABROO_REALTIME_MAX_AUDIO_FRAME_BYTES,
 gabrooRealtimeAudioFrameMetadataSchema,
 gabrooRealtimeClientMessageSchema,
 gabrooRealtimeServerMessageSchema,
 validateGabrooRealtimeAudioFrame
} from "./gabroo-realtime-protocol.js";

const session_id="session-1";
const turn_id="turn-1";
const base={protocol_version:1,session_id};

describe("Gabroo realtime protocol contracts",()=>{
 it("accepts versioned session and turn control messages",()=>{
  expect(gabrooRealtimeClientMessageSchema.parse({...base,type:"session.ready"}).type).toBe("session.ready");
  expect(gabrooRealtimeClientMessageSchema.parse({...base,turn_id,type:"turn.start",audio:{codec:"pcm_s16le",sample_rate_hz:24000,channels:1}}).type).toBe("turn.start");
  expect(gabrooRealtimeClientMessageSchema.parse({...base,turn_id,type:"turn.end"}).type).toBe("turn.end");
 });
 it("rejects unsupported versions, malformed audio formats and unknown fields",()=>{
  expect(gabrooRealtimeClientMessageSchema.safeParse({...base,protocol_version:2,type:"session.ready"}).success).toBe(false);
  expect(gabrooRealtimeClientMessageSchema.safeParse({...base,turn_id,type:"turn.start",audio:{codec:"wav",sample_rate_hz:44100,channels:1}}).success).toBe(false);
  expect(gabrooRealtimeClientMessageSchema.safeParse({...base,type:"session.ready",access_token:"secret"}).success).toBe(false);
 });
 it("bounds audio frame size and sequence numbers",()=>{
  expect(gabrooRealtimeAudioFrameMetadataSchema.safeParse({...base,turn_id,type:"audio.frame",sequence:0,byte_length:1}).success).toBe(true);
  expect(gabrooRealtimeAudioFrameMetadataSchema.safeParse({...base,turn_id,type:"audio.frame",sequence:0,byte_length:GABROO_REALTIME_MAX_AUDIO_FRAME_BYTES+1}).success).toBe(false);
  expect(gabrooRealtimeAudioFrameMetadataSchema.safeParse({...base,turn_id,type:"audio.frame",sequence:-1,byte_length:1}).success).toBe(false);
 });
 it("requires the binary payload to match validated frame metadata",()=>{
  const metadata={...base,turn_id,type:"audio.frame" as const,sequence:2,byte_length:3};
  expect(validateGabrooRealtimeAudioFrame(metadata,new Uint8Array([1,2,3])).sequence).toBe(2);
  expect(()=>validateGabrooRealtimeAudioFrame(metadata,new Uint8Array([1,2]))).toThrow(/length/i);
 });
 it("validates connection readiness separately from audio capability",()=>{
  expect(gabrooRealtimeServerMessageSchema.safeParse({...base,type:"session.connected"}).success).toBe(true);
  expect(gabrooRealtimeServerMessageSchema.safeParse({...base,type:"session.accepted",audio:{codec:"pcm_s16le",sample_rate_hz:16000,channels:1},max_frame_bytes:GABROO_REALTIME_MAX_AUDIO_FRAME_BYTES,max_turn_ms:120000}).success).toBe(true);
 });
 it("validates server transcript and terminal event shapes",()=>{
  expect(gabrooRealtimeServerMessageSchema.safeParse({...base,turn_id,type:"transcript.partial",text:"hello"}).success).toBe(true);
  expect(gabrooRealtimeServerMessageSchema.safeParse({...base,turn_id,type:"turn.failed",code:"TRANSPORT_NOT_READY",message:"Audio is not configured."}).success).toBe(true);
  expect(gabrooRealtimeServerMessageSchema.safeParse({...base,turn_id,type:"transcript.final",text:"  "}).success).toBe(false);
  expect(gabrooRealtimeServerMessageSchema.safeParse({...base,type:"session.closed",reason:"learner_stop"}).success).toBe(true);
 });
});
