export function isGabrooPlayableAudioUri(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 4096 || value.trim() !== value) return false;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:") {
      return Boolean(parsed.hostname) && !parsed.username && !parsed.password;
    }
    // Expo AV commonly plays a downloaded, app-private cache file.
    return parsed.protocol === "file:" && value.startsWith("file:///");
  } catch {
    return false;
  }
}

import type { GabrooNativePlayerSnapshot, GabrooPlaybackIdentity } from "./native-playback-clock";

export interface ExpoPlaybackStatusLike {
  isLoaded: boolean;
  isPlaying?: boolean;
  isBuffering?: boolean;
  positionMillis?: number;
  durationMillis?: number;
  didJustFinish?: boolean;
}

export function toGabrooNativePlayerSnapshot(
  status: ExpoPlaybackStatusLike,
  identity: Pick<GabrooPlaybackIdentity, "playbackTicketId" | "audioId" | "audioSha256" | "measuredDurationMs">,
): GabrooNativePlayerSnapshot | null {
  if (status.isLoaded !== true || status.isPlaying !== true
    || !Number.isFinite(status.positionMillis) || !Number.isFinite(status.durationMillis)
    || status.durationMillis! <= 0 || !Number.isFinite(identity.measuredDurationMs)
    || identity.measuredDurationMs <= 0 || Math.abs(status.durationMillis! - identity.measuredDurationMs) > 50
    || status.positionMillis! < 0
    || status.positionMillis! >= status.durationMillis!
    || typeof identity.playbackTicketId !== "string" || !identity.playbackTicketId.trim()
    || typeof identity.audioId !== "string" || !identity.audioId.trim()
    || typeof identity.audioSha256 !== "string" || !/^[a-f0-9]{64}$/i.test(identity.audioSha256)) return null;
  return {
    playbackTicketId: identity.playbackTicketId,
    audioId: identity.audioId,
    audioSha256: identity.audioSha256,
    durationMs: status.durationMillis!,
    loaded: true,
    playing: true,
    positionMs: status.positionMillis!,
  };
}
