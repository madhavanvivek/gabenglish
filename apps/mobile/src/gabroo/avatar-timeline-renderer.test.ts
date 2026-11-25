import { describe, expect, it, vi } from "vitest";
import {
  GabrooAvatarRendererGate,
  type AvatarRigAdapter,
  type AvatarRigFrame,
  type PlaybackProof,
} from "./avatar-renderer-gate";
import { renderGabrooTimelineFrame } from "./avatar-timeline-renderer";

const hash = "d".repeat(64);
const proof = (generation: number, overrides: Partial<PlaybackProof> = {}): PlaybackProof => ({
  generation,
  playbackTicketId: "ticket-1",
  expectedPlaybackTicketId: "ticket-1",
  audioId: "audio-1",
  expectedAudioId: "audio-1",
  audioSha256: hash,
  expectedAudioSha256: hash,
  measuredDurationMs: 1_000,
  alignmentAudioSha256: hash,
  alignmentDurationMs: 1_000,
  playerLoaded: true,
  playerPlaying: true,
  positionMs: 150,
  ...overrides,
});

function setup() {
  const frames: AvatarRigFrame[] = [];
  const rig: AvatarRigAdapter = {
    load: vi.fn(async () => ({ characterId: "gabroo-approved", rigVersion: "v1", approved: true as const })),
    applyFrame: vi.fn((frame) => frames.push({ ...frame })),
    resetToNeutral: vi.fn(),
    dispose: vi.fn(),
  };
  const gate = new GabrooAvatarRendererGate(rig, "gabroo-approved", "v1");
  return { gate, rig, frames };
}

const timeline = {
  audio_id: "audio-1",
  duration_ms: 1_000,
  visemes: [{ start_ms: 100, end_ms: 300, shape: "closed_lips", weight: 0.8 }],
  expressions: [{ start_ms: 100, end_ms: 300, expression: "warm_smile", weight: 0.7 }],
  gestures: [{ start_ms: 100, end_ms: 300, gesture: "gentle_nod", weight: 0.6 }],
};

describe("renderGabrooTimelineFrame", () => {
  it("samples the canonical timeline at the native playhead and preserves cue weights", async () => {
    const { gate, frames } = setup();
    expect(await gate.initialize()).toBe(true);
    const generation = gate.beginPlayback();

    expect(renderGabrooTimelineFrame(gate, proof(generation), timeline)).toBe(true);
    expect(frames.at(-1)).toMatchObject({
      positionMs: 150,
      viseme: "mbp",
      visemeWeight: 0.8,
      expression: "friendly",
      expressionWeight: 0.7,
      gesture: "small_nod",
      gestureWeight: 0.6,
    });
  });

  it("keeps the renderer neutral and invalidates playback for an audio-id mismatch", async () => {
    const { gate, rig } = setup();
    await gate.initialize();
    const generation = gate.beginPlayback();

    expect(renderGabrooTimelineFrame(gate, proof(generation), { ...timeline, audio_id: "other-audio" })).toBe(false);
    expect(rig.resetToNeutral).toHaveBeenCalled();
    expect(renderGabrooTimelineFrame(gate, proof(generation), timeline)).toBe(false);
  });

  it("rejects duration mismatch and malformed timelines before sampling", async () => {
    const { gate, rig } = setup();
    await gate.initialize();
    const generation = gate.beginPlayback();

    expect(renderGabrooTimelineFrame(gate, proof(generation), { ...timeline, duration_ms: 999 })).toBe(false);
    expect(renderGabrooTimelineFrame(gate, proof(generation + 1), {
      ...timeline,
      visemes: [{ start_ms: 800, end_ms: 1_200, shape: "open_wide" }],
    })).toBe(false);
    expect(rig.applyFrame).not.toHaveBeenCalled();
  });


  it("does not let a stale timeline callback neutralize a newer playback", async () => {
    const { gate, rig } = setup();
    await gate.initialize();
    const staleGeneration = gate.beginPlayback();
    const activeGeneration = gate.beginPlayback();
    const resetCount = vi.mocked(rig.resetToNeutral).mock.calls.length;

    expect(renderGabrooTimelineFrame(gate, proof(staleGeneration), {
      ...timeline,
      audio_id: "stale-audio",
    })).toBe(false);
    expect(gate.render(proof(activeGeneration), () => ({
      viseme: "aa", visemeWeight: 0.8, expression: "friendly", gesture: "idle",
    }))).toBe(true);
    expect(vi.mocked(rig.resetToNeutral).mock.calls.length).toBe(resetCount);
  });


  it("rejects a null or malformed proof without throwing", async () => {
    const { gate, rig } = setup();
    await gate.initialize();
    const generation = gate.beginPlayback();

    expect(renderGabrooTimelineFrame(gate, null as unknown as PlaybackProof, timeline)).toBe(false);
    expect(gate.render(proof(generation), () => ({
      viseme: "aa", visemeWeight: 0.8, expression: "friendly", gesture: "idle",
    }))).toBe(true);
    expect(rig.applyFrame).toHaveBeenCalledOnce();
  });

  it("does not animate when the exact playback proof is invalid", async () => {
    const { gate, rig } = setup();
    await gate.initialize();
    const generation = gate.beginPlayback();

    expect(renderGabrooTimelineFrame(gate, proof(generation, { playerPlaying: false }), timeline)).toBe(false);
    expect(rig.applyFrame).not.toHaveBeenCalled();
  });
});
