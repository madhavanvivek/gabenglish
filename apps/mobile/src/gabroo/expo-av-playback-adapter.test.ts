import { describe, expect, it, vi } from "vitest";
import { createGabrooExpoAvPlayback } from "./expo-av-playback-adapter";

const cacheAudio = vi.fn(async () => ({ uri: "file:///private/cache/gabroo-a.audio", audioSha256: "a".repeat(64), bytes: 1024 }));

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
      cacheAudio,
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
    const createSound = vi.fn(async (_source: { uri: string }, _initial: { shouldPlay: boolean; progressUpdateIntervalMillis: number }, _status: (status: never) => void) => ({ sound }));
    const playback = await createGabrooExpoAvPlayback({
      asset: validAsset(),
      gate: {} as never,
      nowMs: Date.parse("2029-12-31T23:59:00.000Z"),
      cacheAudio,
      createSound: createSound as never,
    });
    expect(createSound).toHaveBeenCalledOnce();
    expect(createSound.mock.calls[0]?.[0]).toEqual({ uri: "file:///private/cache/gabroo-a.audio" });
    await playback.unload();
    expect(sound.unloadAsync).toHaveBeenCalledOnce();
  });
});

import { GabrooAvatarRendererGate, type AvatarRigAdapter, type AvatarRigFrame } from "./avatar-renderer-gate";

async function createGate() {
  const frames: AvatarRigFrame[] = [];
  const rig: AvatarRigAdapter = {
    load: vi.fn(async () => ({ characterId: "gabroo-approved", rigVersion: "v1", approved: true as const })),
    applyFrame: vi.fn(frame => frames.push({ ...frame })),
    resetToNeutral: vi.fn(),
    dispose: vi.fn(),
  };
  const gate = new GabrooAvatarRendererGate(rig, "gabroo-approved", "v1");
  await gate.initialize();
  return { gate, rig, frames };
}

describe("Gabroo Expo AV playback lifecycle", () => {
  it("starts a fresh clock on resume and neutralizes on pause", async () => {
    const { gate, rig, frames } = await createGate();
    let statusListener: ((status: never) => void) | undefined;
    const sound = {
      playAsync: vi.fn(async () => undefined),
      pauseAsync: vi.fn(async () => undefined),
      stopAsync: vi.fn(async () => undefined),
      unloadAsync: vi.fn(async () => undefined),
    };
    const createSound = vi.fn(async (_source, _initial, listener) => {
      statusListener = listener as (status: never) => void;
      return { sound };
    });
    const playback = await createGabrooExpoAvPlayback({
      asset: validAsset(),
      gate,
      nowMs: Date.parse("2029-12-31T23:59:00.000Z"),
      cacheAudio,
      createSound: createSound as never,
    });
    await playback.play();
    statusListener?.({ isLoaded: true, isPlaying: true, positionMillis: 120, durationMillis: 1_000 } as never);
    expect(frames.length).toBeGreaterThan(0);
    const resetBeforePause = vi.mocked(rig.resetToNeutral).mock.calls.length;

    await playback.pause();
    expect(vi.mocked(rig.resetToNeutral).mock.calls.length).toBeGreaterThan(resetBeforePause);

    await playback.play();
    statusListener?.({ isLoaded: true, isPlaying: true, positionMillis: 180, durationMillis: 1_000 } as never);
    expect(frames.at(-1)?.positionMs).toBe(180);
    expect(sound.playAsync).toHaveBeenCalledTimes(2);
    await playback.unload();
  });

  it("closes the playback clock on completion and reports native load errors", async () => {
    const { gate, rig, frames } = await createGate();
    let statusListener: ((status: never) => void) | undefined;
    const onError = vi.fn();
    const sound = {
      playAsync: vi.fn(async () => undefined),
      pauseAsync: vi.fn(async () => undefined),
      stopAsync: vi.fn(async () => undefined),
      unloadAsync: vi.fn(async () => undefined),
    };
    const createSound = vi.fn(async (_source, _initial, listener) => {
      statusListener = listener as (status: never) => void;
      return { sound };
    });
    const playback = await createGabrooExpoAvPlayback({
      asset: validAsset(),
      gate,
      onError,
      cacheAudio,
      nowMs: Date.parse("2029-12-31T23:59:00.000Z"),
      createSound: createSound as never,
    });
    await playback.play();
    statusListener?.({ isLoaded: true, isPlaying: true, positionMillis: 100, durationMillis: 1_000 } as never);
    const resetBeforeFinish = vi.mocked(rig.resetToNeutral).mock.calls.length;
    statusListener?.({ isLoaded: true, isPlaying: false, didJustFinish: true } as never);
    expect(vi.mocked(rig.resetToNeutral).mock.calls.length).toBeGreaterThan(resetBeforeFinish);
    expect(frames.at(-1)?.viseme).toBe("neutral");
    await expect(playback.play()).rejects.toThrow(/no longer active/i);

    const secondGate = await createGate();
    let secondListener: ((status: never) => void) | undefined;
    const secondSound = { ...sound, unloadAsync: vi.fn(async () => undefined) };
    const secondPlayback = await createGabrooExpoAvPlayback({
      asset: validAsset(),
      gate: secondGate.gate,
      cacheAudio,
      onError,
      nowMs: Date.parse("2029-12-31T23:59:00.000Z"),
      createSound: vi.fn(async (_source, _initial, listener) => {
        secondListener = listener as (status: never) => void;
        return { sound: secondSound };
      }) as never,
    });
    await secondPlayback.play();
    secondListener?.({ isLoaded: false, error: "decoder failed" } as never);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "decoder failed" }));
    await secondPlayback.unload();
  });
});


describe("Gabroo playback cancellation", () => {
  it("unloads a native sound if cancellation races native player creation", async () => {
    const controller = new AbortController();
    const sound = {
      playAsync: vi.fn(async () => undefined),
      pauseAsync: vi.fn(async () => undefined),
      stopAsync: vi.fn(async () => undefined),
      unloadAsync: vi.fn(async () => undefined),
    };
    let resolveCreate!: (value: { sound: typeof sound }) => void;
    const createSound = vi.fn(() => new Promise<{ sound: typeof sound }>(resolve => {
      resolveCreate = resolve;
    }));
    const pending = createGabrooExpoAvPlayback({
      asset: validAsset(),
      gate: {} as never,
      nowMs: Date.parse("2029-12-31T23:59:00.000Z"),
      cacheAudio,
      signal: controller.signal,
      createSound: createSound as never,
    });
    await Promise.resolve();
    controller.abort();
    resolveCreate({ sound });
    const playback = await pending;
    expect(sound.unloadAsync).toHaveBeenCalledOnce();
    await expect(playback.play()).rejects.toThrow(/no longer active/i);
  });

  it("does not create a native player when cancellation happens during cache preparation", async () => {
    const controller = new AbortController();
    let finishCache!: (value: { uri: string; audioSha256: string; bytes: number }) => void;
    const cacheAudio = vi.fn(() => new Promise<{ uri: string; audioSha256: string; bytes: number }>(resolve => {
      finishCache = resolve;
    }));
    const createSound = vi.fn();
    const pending = createGabrooExpoAvPlayback({
      asset: validAsset(),
      gate: {} as never,
      nowMs: Date.parse("2029-12-31T23:59:00.000Z"),
      cacheAudio,
      signal: controller.signal,
      createSound: createSound as never,
    });
    await Promise.resolve();
    controller.abort();
    finishCache({ uri: "file:///private/cache/gabroo-a.audio", audioSha256: "a".repeat(64), bytes: 1024 });
    await expect(pending).rejects.toThrow(/cancelled/i);
    expect(createSound).not.toHaveBeenCalled();
  });
});


describe("Gabroo native interruption and buffering handling", () => {
  it("neutralizes while buffering and resumes from a fresh native playback snapshot", async () => {
    const { gate, rig, frames } = await createGate();
    let listener: ((status: never) => void) | undefined;
    const sound = {
      playAsync: vi.fn(async () => undefined),
      pauseAsync: vi.fn(async () => undefined),
      stopAsync: vi.fn(async () => undefined),
      unloadAsync: vi.fn(async () => undefined),
    };
    const playback = await createGabrooExpoAvPlayback({
      asset: validAsset(),
      gate,
      nowMs: Date.parse("2029-12-31T23:59:00.000Z"),
      cacheAudio,
      createSound: vi.fn(async (_source, _initial, callback) => {
        listener = callback as (status: never) => void;
        return { sound };
      }) as never,
    });
    await playback.play();
    listener?.({ isLoaded: true, isPlaying: true, isBuffering: false, positionMillis: 120, durationMillis: 1_000 } as never);
    expect(frames.length).toBeGreaterThan(0);
    const beforeBuffering = vi.mocked(rig.resetToNeutral).mock.calls.length;

    // Expo can keep isPlaying true while the native decoder is buffering.
    listener?.({ isLoaded: true, isPlaying: true, isBuffering: true, positionMillis: 120, durationMillis: 1_000 } as never);
    expect(vi.mocked(rig.resetToNeutral).mock.calls.length).toBeGreaterThan(beforeBuffering);
    const framesAtBuffering = frames.length;

    // A fresh native status tick is required before animation resumes.
    listener?.({ isLoaded: true, isPlaying: true, isBuffering: false, positionMillis: 260, durationMillis: 1_000 } as never);
    expect(frames.length).toBeGreaterThan(framesAtBuffering);
    expect(frames.at(-1)?.positionMs).toBe(260);
    await playback.unload();
  });

  it("reports native play failures and invalidates any active animation generation", async () => {
    const { gate, rig } = await createGate();
    const onError = vi.fn();
    const sound = {
      playAsync: vi.fn(async () => { throw new Error("audio route unavailable"); }),
      pauseAsync: vi.fn(async () => undefined),
      stopAsync: vi.fn(async () => undefined),
      unloadAsync: vi.fn(async () => undefined),
    };
    let listener: ((status: never) => void) | undefined;
    const playback = await createGabrooExpoAvPlayback({
      asset: validAsset(),
      gate,
      onError,
      nowMs: Date.parse("2029-12-31T23:59:00.000Z"),
      cacheAudio,
      createSound: vi.fn(async (_source, _initial, callback) => {
        listener = callback as (status: never) => void;
        return { sound };
      }) as never,
    });
    listener?.({ isLoaded: true, isPlaying: true, positionMillis: 120, durationMillis: 1_000 } as never);
    const resetsBeforeFailure = vi.mocked(rig.resetToNeutral).mock.calls.length;
    await expect(playback.play()).rejects.toThrow("audio route unavailable");
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "audio route unavailable" }));
    expect(vi.mocked(rig.resetToNeutral).mock.calls.length).toBeGreaterThan(resetsBeforeFailure);
    await playback.unload();
  });
});
