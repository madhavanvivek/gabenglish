import { describe, expect, it, vi } from 'vitest';
import { GabrooAvatarRendererGate, type AvatarRigAdapter } from './avatar-renderer-gate';

describe('GabrooAvatarRendererGate native adapter failures', () => {
  it('fails initialization safely when the initial neutral reset fails', async () => {
    const rig: AvatarRigAdapter = {
      load: vi.fn(async () => ({ characterId: 'gabroo-approved', rigVersion: 'v1', approved: true as const })),
      applyFrame: vi.fn(),
      resetToNeutral: vi.fn(() => { throw new Error('native reset failed'); }),
      dispose: vi.fn(),
    };
    const gate = new GabrooAvatarRendererGate(rig, 'gabroo-approved', 'v1');
    await expect(gate.initialize()).resolves.toBe(false);
    expect(rig.load).not.toHaveBeenCalled();
  });
});
