/**
 * Fail-closed gate between the validated native playback sampler and a 3D avatar rig.
 * This module is intentionally renderer/provider agnostic and has no UI or native dependencies.
 * A host must supply the validated frame sampler and the approved rig adapter.
 */

export type AvatarViseme =
  | 'neutral' | 'aa' | 'ee' | 'ih' | 'oh' | 'ou'
  | 'fv' | 'th' | 'mbp' | 'wide' | 'round';

export type AvatarExpression = 'neutral' | 'friendly' | 'curious' | 'thinking' | 'encouraging';
export type AvatarGesture = 'idle' | 'small_nod' | 'open_palm' | 'celebrate';

export interface ApprovedRigIdentity {
  characterId: string;
  rigVersion: string;
  approved: true;
}

export interface AvatarRigFrame {
  generation: number;
  positionMs: number;
  viseme: AvatarViseme;
  visemeWeight: number;
  expression: AvatarExpression;
  gesture: AvatarGesture;
}

export interface AvatarRigAdapter {
  load(): Promise<ApprovedRigIdentity>;
  applyFrame(frame: Readonly<AvatarRigFrame>): void;
  resetToNeutral(): void;
  dispose(): void;
}

export interface PlaybackProof {
  generation: number;
  playbackTicketId: string;
  expectedPlaybackTicketId: string;
  audioId: string;
  expectedAudioId: string;
  audioSha256: string;
  expectedAudioSha256: string;
  measuredDurationMs: number;
  alignmentAudioSha256: string;
  alignmentDurationMs: number;
  playerLoaded: boolean;
  playerPlaying: boolean;
  positionMs: number;
}

export interface SampledAvatarFrame {
  viseme: AvatarViseme;
  visemeWeight: number;
  expression: AvatarExpression;
  gesture: AvatarGesture;
}

const VISemes = new Set<AvatarViseme>([
  'neutral', 'aa', 'ee', 'ih', 'oh', 'ou', 'fv', 'th', 'mbp', 'wide', 'round',
]);
const EXPRESSIONS = new Set<AvatarExpression>([
  'neutral', 'friendly', 'curious', 'thinking', 'encouraging',
]);
const GESTURES = new Set<AvatarGesture>(['idle', 'small_nod', 'open_palm', 'celebrate']);

export function isPlaybackProofValid(proof: PlaybackProof, activeGeneration: number): boolean {
  if (typeof proof !== 'object' || proof === null) return false;
  if (!Number.isSafeInteger(activeGeneration) || !Number.isSafeInteger(proof.generation)
    || proof.generation !== activeGeneration) return false;

  const nonEmptyString = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0;
  const validHash = (value: unknown): value is string =>
    typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);

  if (!nonEmptyString(proof.playbackTicketId)
    || !nonEmptyString(proof.expectedPlaybackTicketId)
    || proof.playbackTicketId !== proof.expectedPlaybackTicketId
    || !nonEmptyString(proof.audioId)
    || !nonEmptyString(proof.expectedAudioId)
    || proof.audioId !== proof.expectedAudioId
    || !validHash(proof.audioSha256)
    || !validHash(proof.expectedAudioSha256)
    || !validHash(proof.alignmentAudioSha256)
    || proof.audioSha256.toLowerCase() !== proof.expectedAudioSha256.toLowerCase()
    || proof.alignmentAudioSha256.toLowerCase() !== proof.audioSha256.toLowerCase()
    || !Number.isSafeInteger(proof.measuredDurationMs)
    || proof.measuredDurationMs <= 0
    || proof.alignmentDurationMs !== proof.measuredDurationMs
    || proof.playerLoaded !== true
    || proof.playerPlaying !== true
    || !Number.isFinite(proof.positionMs)
    || proof.positionMs < 0
    || proof.positionMs >= proof.measuredDurationMs) return false;

  return true;
}

function neutralFrame(generation: number, positionMs = 0): AvatarRigFrame {
  return { generation, positionMs, viseme: 'neutral', visemeWeight: 0, expression: 'neutral', gesture: 'idle' };
}

export class GabrooAvatarRendererGate {
  private generation = 0;
  private ready = false;
  private disposed = false;
  private identity: ApprovedRigIdentity | null = null;

  private resetSafely(): boolean {
    try {
      this.rig.resetToNeutral();
      return true;
    } catch {
      this.ready = false;
      this.identity = null;
      this.generation += 1;
      return false;
    }
  }

  constructor(
    private readonly rig: AvatarRigAdapter,
    private readonly expectedCharacterId: string,
    private readonly expectedRigVersion: string,
  ) {}

  async initialize(): Promise<boolean> {
    if (this.disposed || !this.expectedCharacterId.trim() || !this.expectedRigVersion.trim()) return false;
    const initializationGeneration = ++this.generation;
    this.ready = false;
    this.identity = null;
    if (!this.resetSafely()) return false;
    try {
      const identity = await this.rig.load();
      if (this.disposed || initializationGeneration !== this.generation) return false;
      if (identity.approved !== true
        || identity.characterId !== this.expectedCharacterId
        || identity.rigVersion !== this.expectedRigVersion) {
        this.resetSafely();
        return false;
      }
      this.identity = { ...identity };
      this.ready = true;
      return true;
    } catch {
      if (!this.disposed && initializationGeneration === this.generation) {
        this.resetSafely();
      }
      return false;
    }
  }

  beginPlayback(): number {
    if (this.disposed) return this.generation;
    this.generation += 1;
    this.resetSafely();
    return this.generation;
  }

  /** Sample callback must return controls derived from the exact validated alignment. */
  render(proof: PlaybackProof, sample: (positionMs: number) => SampledAvatarFrame | null): boolean {
    if (this.disposed || !this.ready) return false;
    if (!isPlaybackProofValid(proof, this.generation)) {
      this.resetSafely();
      return false;
    }
    let sampled: SampledAvatarFrame | null = null;
    try { sampled = sample(proof.positionMs); } catch { sampled = null; }
    if (!sampled || !VISemes.has(sampled.viseme)
      || !EXPRESSIONS.has(sampled.expression) || !GESTURES.has(sampled.gesture)
      || !Number.isFinite(sampled.visemeWeight)
      || sampled.visemeWeight < 0 || sampled.visemeWeight > 1) {
      try {
        this.rig.applyFrame(neutralFrame(this.generation, proof.positionMs));
      } catch {
        this.resetSafely();
      }
      return false;
    }
    try {
      this.rig.applyFrame({
        generation: this.generation,
        positionMs: proof.positionMs,
        viseme: sampled.viseme,
        visemeWeight: sampled.viseme === 'neutral' ? 0 : sampled.visemeWeight,
        expression: sampled.expression,
        gesture: sampled.gesture,
      });
      return true;
    } catch {
      this.resetSafely();
      return false;
    }
  }

  /** Call synchronously on pause, interruption, blur, background, completion or cancellation. */
  stopPlayback(): void {
    if (this.disposed) return;
    this.generation += 1;
    this.resetSafely();
  }

  dispose(): void {
    if (this.disposed) return;
    this.generation += 1;
    this.ready = false;
    this.identity = null;
    this.resetSafely();
    try { this.rig.dispose(); } catch { /* Native resource cleanup must not crash navigation. */ }
    this.disposed = true;
  }

  getRigIdentity(): ApprovedRigIdentity | null {
    return this.identity ? { ...this.identity } : null;
  }
}