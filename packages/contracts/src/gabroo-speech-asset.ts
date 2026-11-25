import { z } from "zod";
import { gabrooSpeechTimelineSchema } from "./gabroo-avatar.js";

/** Server-issued, content-bound audio asset envelope for Gabroo playback. */
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/i);
const safeHttpsUriSchema = z.string().url().max(4096).refine(value => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}, "Gabroo speech assets must use a credential-free HTTPS URL.");

export const gabrooSpeechAssetSchema = z.object({
  playbackTicketId: z.string().trim().min(1).max(160),
  audioId: z.string().trim().min(1).max(160),
  audioSha256: sha256Schema,
  measuredDurationMs: z.number().int().positive().safe(),
  alignmentAudioSha256: sha256Schema,
  alignmentDurationMs: z.number().int().positive().safe(),
  uri: safeHttpsUriSchema,
  expiresAt: z.string().datetime({ offset: true }),
  timeline: gabrooSpeechTimelineSchema,
}).strict().superRefine((asset, ctx) => {
  if (asset.alignmentAudioSha256.toLowerCase() !== asset.audioSha256.toLowerCase()) {
    ctx.addIssue({ code: "custom", path: ["alignmentAudioSha256"], message: "Alignment must reference the exact audio hash." });
  }
  if (asset.alignmentDurationMs !== asset.measuredDurationMs) {
    ctx.addIssue({ code: "custom", path: ["alignmentDurationMs"], message: "Alignment duration must match the measured audio duration." });
  }
  if (asset.timeline.audio_id !== asset.audioId) {
    ctx.addIssue({ code: "custom", path: ["timeline", "audio_id"], message: "Timeline must reference the exact audio ID." });
  }
  if (asset.timeline.duration_ms !== asset.measuredDurationMs) {
    ctx.addIssue({ code: "custom", path: ["timeline", "duration_ms"], message: "Timeline duration must match the measured audio duration." });
  }
});

export type GabrooSpeechAsset = z.infer<typeof gabrooSpeechAssetSchema>;

/** Reject expired server-issued URLs immediately before a playback request. */
export function parseActiveGabrooSpeechAsset(value: unknown, nowMs = Date.now()): GabrooSpeechAsset {
  const asset = gabrooSpeechAssetSchema.parse(value);
  if (!Number.isFinite(nowMs) || Date.parse(asset.expiresAt) <= nowMs) {
    throw new Error("Gabroo speech asset has expired.");
  }
  return asset;
}
