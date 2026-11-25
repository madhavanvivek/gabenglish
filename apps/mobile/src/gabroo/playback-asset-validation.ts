import {
  gabrooSpeechTimelineSchema,
  type GabrooSpeechTimeline,
} from "@gabenglish/contracts";
import {
  isGabrooPlaybackIdentityValid,
  type GabrooPlaybackIdentity,
} from "./native-playback-clock";

/**
 * Validate the complete speech asset before opening a native player.
 * The returned timeline is a fresh Zod-parsed copy, not the caller's mutable object.
 */
export function validateGabrooPlaybackAsset(
  identity: unknown,
  untrustedTimeline: unknown,
): GabrooSpeechTimeline {
  if (!isGabrooPlaybackIdentityValid(identity)) {
    throw new Error("Trusted Gabroo audio and alignment metadata are required.");
  }
  const parsed = gabrooSpeechTimelineSchema.safeParse(untrustedTimeline);
  if (!parsed.success) {
    throw new Error("Gabroo speech alignment is invalid.");
  }
  if (parsed.data.audio_id !== identity.audioId
    || parsed.data.duration_ms !== identity.measuredDurationMs) {
    throw new Error("Gabroo speech alignment does not match the exact audio asset.");
  }
  return parsed.data;
}
