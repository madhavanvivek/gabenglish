import { describe, expect, it, vi } from 'vitest';
import {
  GabrooAvatarRendererGate,
  type AvatarRigAdapter,
  type AvatarRigFrame,
  type PlaybackProof,
} from './avatar-renderer-gate';

const hash = 'c'.repeat(64);
const proof = (generation: number): PlaybackProof => ({
  generation,
  playbackTicketId: 'ticket-current',
  expectedPlaybackTicketId: 'ticket-current',
  audioId: 'audio-current',
  expectedAudioId: 'audio-current',
  audioSha256: hash,
  expectedAudioSha256: hash,
  measuredDurationMs: 1_500,
  alignmentAudioSha256: hash,
  alignmentDurationMs: 1_500,
  playerLoaded: true,
  playerPlaying: true,
  positionMs: 300,
});

describe('GabrooAvatarRendererGate reset failure recovery', () => {
  it('invalidates the active generation when a native neutral reset throws', async () => {
    const frames: AvatarRigFrame[] = [];
    let resetShouldFail = false;
    const rig: AvatarRigAdapter = {
      load: vi.fn(async () => ({ characterId: 'gabroo-approved', rigVersion: 'v1', approved: true as const })),
      applyFrame: vi.fn((frame) => frames.push({ ...frame })),
      resetToNeutral: vi.fn(() => {
        if (resetShouldFail) throw new Error('native reset failed');
      }),
      dispose: vi.fn(),
    };
    const gate = new GabrooAvatarRendererGate(rig, 'gabroo-approved', 'v1');
    expect(await gate.initialize()).toBe(true);
    const generation = gate.beginPlayback();

    resetShouldFail = true;
    gate.stopPlayback();

    expect(gate.getRigIdentity()).toBeNull();
    expect(gate.render(proof(generation), () => ({
      viseme: 'aa',
      visemeWeight: 1,
      expression: 'friendly',
      gesture: 'idle',
    }))).toBe(false);
    expect(rig.applyFrame).not.toHaveBeenCalled();
  });

  it('keeps disposal idempotent when both native reset and dispose throw', async () => {
    const rig: AvatarRigAdapter = {
      load: vi.fn(async () => ({ characterId: 'gabroo-approved', rigVersion: 'v1', approved: true as const })),
      applyFrame: vi.fn(),
      resetToNeutral: vi.fn(() => { throw new Error('native reset failed'); }),
      dispose: vi.fn(() => { throw new Error('native dispose failed'); }),
    };
    const gate = new GabrooAvatarRendererGate(rig, 'gabroo-approved', 'v1');

    await expect(gate.initialize()).resolves.toBe(false);
    expect(() => gate.dispose()).not.toThrow();
    expect(() => gate.dispose()).not.toThrow();
    expect(rig.dispose).toHaveBeenCalledOnce();
    expect(gate.getRigIdentity()).toBeNull();
  });
});
