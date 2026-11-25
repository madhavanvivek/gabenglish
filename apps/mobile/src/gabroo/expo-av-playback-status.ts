import type { GabrooNativePlayerSnapshot, GabrooPlaybackIdentity } from "./native-playback-clock";

export interface ExpoPlaybackStatusLike {
  isLoaded: boolean;
  isPlaying?: boolean;
  positionMillis?: number;
  durationMillis?: number;
  didJustFinish?: boolean;
}

export function toGabrooNativePlayerSnapshot(
  status: ExpoPlaybackStatusLike,
  identity: Pick<GabrooPlaybackIdentity, "playbackTicketId" | "audioId" | "audioSha256">,
): GabrooNativePlayerSnapshot | null {
  if (status.isLoaded !== true || status.isPlaying !== true
    || !Number.isFinite(status.positionMillis) || !Number.isFinite(status.durationMillis)) return null;
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
