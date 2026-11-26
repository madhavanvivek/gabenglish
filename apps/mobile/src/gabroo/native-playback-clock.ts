import type { PlaybackProof } from "./avatar-renderer-gate";
import { GabrooAvatarRendererGate } from "./avatar-renderer-gate";
import { renderGabrooTimelineFrame } from "./avatar-timeline-renderer";

export interface GabrooPlaybackIdentity {
  playbackTicketId: string;
  audioId: string;
  audioSha256: string;
  measuredDurationMs: number;
  alignmentAudioSha256: string;
  alignmentDurationMs: number;
}

export interface GabrooNativePlayerSnapshot {
  playbackTicketId: string;
  audioId: string;
  audioSha256: string;
  durationMs: number;
  loaded: boolean;
  playing: boolean;
  positionMs: number;
}

export function isGabrooPlaybackIdentityValid(value: unknown): value is GabrooPlaybackIdentity {
  if (!value || typeof value !== "object") return false;
  const identity = value as Partial<GabrooPlaybackIdentity>;
  return typeof identity.playbackTicketId === "string"
    && identity.playbackTicketId.trim().length > 0
    && identity.playbackTicketId.length <= 160
    && typeof identity.audioId === "string"
    && identity.audioId.trim().length > 0
    && identity.audioId.length <= 160
    && typeof identity.audioSha256 === "string"
    && /^[a-f0-9]{64}$/i.test(identity.audioSha256)
    && Number.isSafeInteger(identity.measuredDurationMs)
    && Number(identity.measuredDurationMs) > 0
    && typeof identity.alignmentAudioSha256 === "string"
    && identity.alignmentAudioSha256.toLowerCase() === identity.audioSha256.toLowerCase()
    && identity.alignmentDurationMs === identity.measuredDurationMs;
}

/**
 * Host-neutral clock bridge. A native player adapter supplies a fresh snapshot
 * on each native playback tick; the bridge never estimates time from timers.
 */
export class GabrooNativePlaybackClock {
  private generation: number | null = null;
  private identity: GabrooPlaybackIdentity | null = null;
  private stopped = true;

  constructor(private readonly gate: GabrooAvatarRendererGate) {}

  begin(identity: GabrooPlaybackIdentity): number {
    this.identity = null;
    this.generation = null;
    this.stopped = true;

    if (!isGabrooPlaybackIdentityValid(identity)) {
      return this.gate.beginPlayback();
    }

    this.generation = this.gate.beginPlayback();
    this.identity = { ...identity };
    this.stopped = false;
    return this.generation;
  }

  /** Feed this only from the native player's onPlaybackStatusUpdate callback. */
  tick(snapshot: GabrooNativePlayerSnapshot, timeline: unknown): boolean {
    if (this.stopped || this.generation === null || this.identity === null) return false;
    const identity = this.identity;
    if (!snapshot || snapshot.playbackTicketId !== identity.playbackTicketId
      || snapshot.audioId !== identity.audioId
      || typeof snapshot.audioSha256 !== "string"
      || snapshot.audioSha256.toLowerCase() !== identity.audioSha256.toLowerCase()
      || snapshot.durationMs !== identity.measuredDurationMs
      || snapshot.loaded !== true || snapshot.playing !== true
      || !Number.isFinite(snapshot.positionMs) || snapshot.positionMs < 0
      || snapshot.positionMs >= identity.measuredDurationMs) {
      this.stop();
      return false;
    }

    const proof: PlaybackProof = {
      generation: this.generation,
      playbackTicketId: snapshot.playbackTicketId,
      expectedPlaybackTicketId: identity.playbackTicketId,
      audioId: snapshot.audioId,
      expectedAudioId: identity.audioId,
      audioSha256: snapshot.audioSha256,
      expectedAudioSha256: identity.audioSha256,
      measuredDurationMs: identity.measuredDurationMs,
      alignmentAudioSha256: identity.alignmentAudioSha256,
      alignmentDurationMs: identity.alignmentDurationMs,
      playerLoaded: snapshot.loaded,
      playerPlaying: snapshot.playing,
      positionMs: snapshot.positionMs,
    };
    const rendered = renderGabrooTimelineFrame(this.gate, proof, timeline);
    if (!rendered) this.stop();
    return rendered;
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    const generation = this.generation;
    this.identity = null;
    this.generation = null;
    if (generation !== null) this.gate.stopPlayback(generation);
  }

  get activeGeneration(): number | null {
    return this.generation;
  }
}
