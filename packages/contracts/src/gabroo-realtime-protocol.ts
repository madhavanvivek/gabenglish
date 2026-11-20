import {z} from "zod";
import {gabrooSpeechTimelineSchema} from "./gabroo-avatar.js";

/**
 * Versioned, provider-neutral control protocol for a future Gabroo realtime
 * transport. These schemas validate messages; they do not open a socket,
 * authorize a learner, or permit microphone capture.
 */
export const GABROO_REALTIME_PROTOCOL_VERSION=1 as const;
export const GABROO_REALTIME_MAX_AUDIO_FRAME_BYTES=64*1024;
export const GABROO_REALTIME_MAX_AUDIO_SEQUENCE=1_000_000;

const id=z.string().trim().min(1).max(160);
const base=z.object({
 protocol_version:z.literal(GABROO_REALTIME_PROTOCOL_VERSION),
 session_id:id
});
const turnBase=base.extend({turn_id:id});
const audioFormat=z.object({
 codec:z.enum(["pcm_s16le","opus"]),
 sample_rate_hz:z.union([z.literal(16000),z.literal(24000),z.literal(48000)]),
 channels:z.union([z.literal(1),z.literal(2)])
}).strict();

export const gabrooRealtimeClientMessageSchema=z.discriminatedUnion("type",[
 base.extend({type:z.literal("session.ready")}).strict(),
 turnBase.extend({type:z.literal("turn.start"),audio:audioFormat}).strict(),
 turnBase.extend({type:z.literal("turn.end")}).strict(),
 turnBase.extend({type:z.literal("tutor.interrupt")}).strict(),
 base.extend({type:z.literal("session.stop")}).strict()
]);
export type GabrooRealtimeClientMessage=z.infer<typeof gabrooRealtimeClientMessageSchema>;

export const gabrooRealtimeAudioFrameMetadataSchema=turnBase.extend({
 type:z.literal("audio.frame"),
 sequence:z.number().int().min(0).max(GABROO_REALTIME_MAX_AUDIO_SEQUENCE),
 byte_length:z.number().int().positive().max(GABROO_REALTIME_MAX_AUDIO_FRAME_BYTES)
}).strict();
export type GabrooRealtimeAudioFrameMetadata=z.infer<typeof gabrooRealtimeAudioFrameMetadataSchema>;

export const gabrooRealtimeServerMessageSchema=z.discriminatedUnion("type",[
 base.extend({
  type:z.literal("session.accepted"),
  audio:audioFormat,
  max_frame_bytes:z.number().int().positive().max(GABROO_REALTIME_MAX_AUDIO_FRAME_BYTES),
  max_turn_ms:z.number().int().positive().max(120_000)
 }).strict(),
 turnBase.extend({type:z.literal("turn.accepted"),max_turn_ms:z.number().int().positive().max(120_000)}).strict(),
 turnBase.extend({type:z.literal("transcript.partial"),text:z.string().max(12_000)}).strict(),
 turnBase.extend({type:z.literal("transcript.final"),text:z.string().trim().min(1).max(12_000)}).strict(),
 turnBase.extend({type:z.literal("tutor.text.delta"),text:z.string().max(4_000)}).strict(),
 turnBase.extend({type:z.literal("tutor.text.final"),text:z.string().trim().min(1).max(12_000)}).strict(),
 turnBase.extend({
  type:z.literal("tutor.audio.start"),
  audio_id:id,
  codec:z.literal("mp3"),
  sample_rate_hz:z.number().int().positive().max(192_000).optional(),
  channels:z.number().int().positive().max(2).optional()
 }).strict(),
 turnBase.extend({type:z.literal("tutor.timeline"),timeline:gabrooSpeechTimelineSchema}).strict(),
 turnBase.extend({type:z.literal("turn.completed")}).strict(),
 turnBase.extend({
  type:z.literal("turn.failed"),
  code:z.enum(["TURN_LIMIT","RECOGNITION_FAILED","RESPONSE_FAILED","AUDIO_FAILED","RATE_LIMITED"]),
  message:z.string().trim().min(1).max(300)
 }).strict(),
 base.extend({type:z.literal("session.interrupted"),reason:z.enum(["network","audio_route","server_restart","entitlement","timeout"])}).strict(),
 base.extend({type:z.literal("session.closed"),reason:z.enum(["learner_stop","expired","server_shutdown","policy"])}).strict()
]);
export type GabrooRealtimeServerMessage=z.infer<typeof gabrooRealtimeServerMessageSchema>;

/** Binary payload length must exactly match its separately validated metadata. */
export function validateGabrooRealtimeAudioFrame(metadata:unknown,payload:Uint8Array){
 const parsed=gabrooRealtimeAudioFrameMetadataSchema.parse(metadata);
 if(!(payload instanceof Uint8Array)||payload.byteLength!==parsed.byte_length){
  throw new Error("Realtime audio frame payload length does not match its metadata.");
 }
 return parsed;
}
