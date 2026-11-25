import { describe, expect, it, vi } from 'vitest';
import {
  GabrooAvatarRendererGate,
  isPlaybackProofValid,
  type AvatarRigAdapter,
  type AvatarRigFrame,
  type PlaybackProof,
} from './avatar-renderer-gate';

const hash = 'a'.repeat(64);
const validProof = (generation: number): PlaybackProof => ({
  generation,
  playbackTicketId: 'ticket-1',
  expectedPlaybackTicketId: 'ticket-1',
  audioId: 'audio-1',
  expectedAudioId: 'audio-1',
  audioSha256: hash,
  expectedAudioSha256: hash,
  measuredDurationMs: 2_000,
  alignmentAudioSha256: hash,
  alignmentDurationMs: 2_000,
  playerLoaded: true,
  playerPlaying: true,
  positionMs: 250,
});

function makeRig(identity = { characterId: 'gabroo-approved', rigVersion: 'v1', approved: true as const }) {
  const frames: AvatarRigFrame[] = [];
  const rig: AvatarRigAdapter = {
    load: vi.fn(async () => identity),
    applyFrame: vi.fn((frame) => frames.push({ ...frame })),
    resetToNeutral: vi.fn(),
    dispose: vi.fn(),
  };
  return { rig, frames };
}

describe('isPlaybackProofValid', () => {
  it('requires exact audio, alignment, playback and generation identity', () => {
    expect(isPlaybackProofValid(validProof(3), 3)).toBe(true);
    expect(isPlaybackProofValid({ ...validProof(3), alignmentAudioSha256: 'b'.repeat(64) }, 3)).toBe(false);
    expect(isPlaybackProofValid({ ...validProof(3), playbackTicketId: 'stale-ticket' }, 3)).toBe(false);
    expect(isPlaybackProofValid({ ...validProof(3), playerPlaying: false }, 3)).toBe(false);
    expect(isPlaybackProofValid(validProof(2), 3)).toBe(false);
  });

  it('rejects malformed hashes, invalid duration and out-of-range positions', () => {
    expect(isPlaybackProofValid({ ...validProof(1), audioSha256: 'not-a-hash' }, 1)).toBe(false);
    expect(isPlaybackProofValid({ ...validProof(1), measuredDurationMs: 0 }, 1)).toBe(false);
    expect(isPlaybackProofValid({ ...validProof(1), positionMs: 2_000 }, 1)).toBe(false);
  });
});

describe('GabrooAvatarRendererGate', () => {
  it('only renders a valid frame after the expected approved rig loads', async () => {
    const { rig, frames } = makeRig();
    const gate = new GabrooAvatarRendererGate(rig, 'gabroo-approved', 'v1');
    expect(await gate.initialize()).toBe(true);
    const generation = gate.beginPlayback();
    expect(gate.render(validProof(generation), () => ({
      viseme: 'aa', visemeWeight: 0.8, expression: 'friendly', gesture: 'small_nod',
    }))).toBe(true);
    expect(frames.at(-1)).toMatchObject({ viseme: 'aa', visemeWeight: 0.8, expression: 'friendly' });
  });

  it('fails closed when the loaded rig identity is not approved for this release', async () => {
    const { rig } = makeRig({ characterId: 'unapproved', rigVersion: 'v1', approved: true });
    const gate = new GabrooAvatarRendererGate(rig, 'gabroo-approved', 'v1');
    expect(await gate.initialize()).toBe(false);
    const generation = gate.beginPlayback();
    expect(gate.render(validProof(generation), () => ({
      viseme: 'aa', visemeWeight: 1, expression: 'friendly', gesture: 'idle',
    }))).toBe(false);
    expect(rig.resetToNeutral).toHaveBeenCalled();
  });

  it('neutralizes invalid sampled controls and catches sampler failures', async () => {
    const { rig, frames } = makeRig();
    const gate = new GabrooAvatarRendererGate(rig, 'gabroo-approved', 'v1');
    await gate.initialize();
    const generation = gate.beginPlayback();
    expect(gate.render(validProof(generation), () => ({
      viseme: 'aa', visemeWeight: 1.5, expression: 'friendly', gesture: 'idle',
    }))).toBe(false);
    expect(frames.at(-1)).toMatchObject({ viseme: 'neutral', visemeWeight: 0, gesture: 'idle' });
    expect(gate.render(validProof(generation), () => { throw new Error('stale timeline'); })).toBe(false);
  });

  it('invalidates a pending rig load when playback lifecycle disposes the gate', async () => {
    let resolveLoad!: (value: { characterId: string; rigVersion: string; approved: true }) => void;
    const { rig } = makeRig();
    rig.load = vi.fn(() => new Promise((resolve) => { resolveLoad = resolve; }));
    const gate = new GabrooAvatarRendererGate(rig, 'gabroo-approved', 'v1');
    const pending = gate.initialize();
    gate.dispose();
    resolveLoad({ characterId: 'gabroo-approved', rigVersion: 'v1', approved: true });
    expect(await pending).toBe(false);
    expect(gate.getRigIdentity()).toBeNull();
    expect(rig.dispose).toHaveBeenCalledOnce();
  });

  it('invalidates prior playback frames on stop and dispose', async () => {
    const { rig } = makeRig();
    const gate = new GabrooAvatarRendererGate(rig, 'gabroo-approved', 'v1');
    await gate.initialize();
    const generation = gate.beginPlayback();
    gate.stopPlayback();
    expect(gate.render(validProof(generation), () => ({
      viseme: 'aa', visemeWeight: 1, expression: 'friendly', gesture: 'idle',
    }))).toBe(false);
    gate.dispose();
    gate.dispose();
    expect(rig.dispose).toHaveBeenCalledOnce();
  });
});
