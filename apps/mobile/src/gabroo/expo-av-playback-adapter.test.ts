import { describe, expect, it, vi } from "vitest";
import { createGabrooExpoAvPlayback } from "./expo-av-playback-adapter";

const validAsset = () => ({
  playbackTicketId: "ticket-1",
  audioId: "audio-1",
  audioSha256: "a".repeat(64),
  measuredDurationMs: 1_000,
  alignmentAudioSha256: "a".repeat(64),
  alignmentDurationMs: 1_000,
  uri: "https://cdn.example.test/audio.mp3?signature=opaque",
  expiresAt: "2030-01-01T00:00:00.000Z",
  timeline: { audio_id: "audio-1", duration_ms: 1_000, visemes: [], expressions: [], gestures: [] },
});

describe("Gabroo Expo AV playback adapter boundary", () => {
  it.each([
    ["expired", { ...validAsset(), expiresAt: "2029-12-31T23:59:59.000Z" }],
    ["cross-audio alignment", { ...validAsset(), timeline: { ...validAsset().timeline, audio_id: "other-audio" } }],
    ["unsafe URL", { ...validAsset(), uri: "http://cdn.example.test/audio.mp3" }],
  ])("does not open native audio for %s assets", async (_label, asset) => {
    const createSound = vi.fn();
    await expect(createGabrooExpoAvPlayback({
      asset,
      gate: {} as never,
      nowMs: Date.parse("2030-01-01T00:00:00.000Z"),
      createSound: createSound as never,
    })).rejects.toThrow();
    expect(createSound).not.toHaveBeenCalled();
  });

  it("loads only the validated URI and unloads the native sound", async () => {
    const sound = {
      playAsync: vi.fn(async () => undefined),
      pauseAsync: vi.fn(async () => undefined),
      stopAsync: vi.fn(async () => undefined),
      unloadAsync: vi.fn(async () => undefined),
    };
    const createSound = vi.fn(async () => ({ sound }));
    const playback = await createGabrooExpoAvPlayback({
      asset: validAsset(),
      gate: {} as never,
      nowMs: Date.parse("2029-12-31T23:59:00.000Z"),
      createSound: createSound as never,
    });
    expect(createSound).toHaveBeenCalledOnce();
    expect(createSound.mock.calls[0]?.[0]).toEqual({ uri: validAsset().uri });
    await playback.unload();
    expect(sound.unloadAsync).toHaveBeenCalledOnce();
  });
});
