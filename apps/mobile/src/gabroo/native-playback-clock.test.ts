import { describe, expect, it, vi } from "vitest";
import { GabrooAvatarRendererGate, type AvatarRigAdapter, type AvatarRigFrame } from "./avatar-renderer-gate";
import { GabrooNativePlaybackClock, type GabrooNativePlayerSnapshot } from "./native-playback-clock";

const hash = "e".repeat(64);
const identity = { playbackTicketId: "ticket-a", audioId: "audio-a", audioSha256: hash, measuredDurationMs: 1_000 };
const timeline = {
  audio_id: "audio-a",
  duration_ms: 1_000,
  visemes: [{ start_ms: 100, end_ms: 400, shape: "open_wide", weight: 0.9 }],
};
const snapshot = (overrides: Partial<GabrooNativePlayerSnapshot> = {}): GabrooNativePlayerSnapshot => ({
  playbackTicketId: "ticket-a",
  audioId: "audio-a",
  audioSha256: hash,
  durationMs: 1_000,
  loaded: true,
  playing: true,
  positionMs: 200,
  ...overrides,
});

async function setup() {
  const frames: AvatarRigFrame[] = [];
  const rig: AvatarRigAdapter = {
    load: vi.fn(async () => ({ characterId: "gabroo-approved", rigVersion: "v1", approved: true as const })),
    applyFrame: vi.fn(frame => frames.push({ ...frame })),
    resetToNeutral: vi.fn(),
    dispose: vi.fn(),
  };
  const gate = new GabrooAvatarRendererGate(rig, "gabroo-approved", "v1");
  await gate.initialize();
  return { clock: new GabrooNativePlaybackClock(gate), gate, rig, frames };
}

describe("GabrooNativePlaybackClock", () => {
  it("uses native snapshots to sample exact audio-bound timeline frames", async () => {
    const { clock, frames } = await setup();
    clock.begin(identity);
    expect(clock.tick(snapshot(), timeline)).toBe(true);
    expect(frames.at(-1)).toMatchObject({ positionMs: 200, viseme: "aa", visemeWeight: 0.9 });
  });

  it("stops and neutralizes on ticket, audio, hash, duration or player-state mismatch", async () => {
    for (const invalid of [
      { playbackTicketId: "stale-ticket" },
      { audioId: "other-audio" },
      { audioSha256: "f".repeat(64) },
      { durationMs: 999 },
      { loaded: false },
      { playing: false },
      { positionMs: 1_000 },
    ]) {
      const { clock, rig } = await setup();
      clock.begin(identity);
      expect(clock.tick(snapshot(invalid), timeline)).toBe(false);
      expect(clock.activeGeneration).toBeNull();
      expect(rig.resetToNeutral).toHaveBeenCalled();
    }
  });

  it("rejects invalid playback identity before accepting ticks", async () => {
    const { clock } = await setup();
    clock.begin({ ...identity, audioSha256: "bad-hash" });
    expect(clock.activeGeneration).toBeNull();
    expect(clock.tick(snapshot(), timeline)).toBe(false);
  });

  it("ignores ticks after explicit stop and is safe to stop repeatedly", async () => {
    const { clock, rig } = await setup();
    clock.begin(identity);
    clock.stop();
    clock.stop();
    expect(clock.tick(snapshot(), timeline)).toBe(false);
    expect(clock.activeGeneration).toBeNull();
    expect(rig.applyFrame).not.toHaveBeenCalled();
  });

  it("invalidates the current generation when timeline identity is wrong", async () => {
    const { clock } = await setup();
    clock.begin(identity);
    expect(clock.tick(snapshot(), { ...timeline, audio_id: "wrong" })).toBe(false);
    expect(clock.activeGeneration).toBeNull();
  });
});
