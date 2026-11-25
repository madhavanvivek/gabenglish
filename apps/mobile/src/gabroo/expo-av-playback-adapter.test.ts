import { describe, expect, it } from "vitest";
import { toGabrooNativePlayerSnapshot, type ExpoPlaybackStatusLike } from "./expo-av-playback-status";

describe("Expo AV playback status mapping", () => {
  it("maps only loaded native playback state into the clock snapshot", () => {
    const status: ExpoPlaybackStatusLike = {
      isLoaded: true, isPlaying: true, positionMillis: 420, durationMillis: 2_000, didJustFinish: false,
    };
    expect(toGabrooNativePlayerSnapshot(status, {
      playbackTicketId: "ticket", audioId: "audio", audioSha256: "a".repeat(64),
    })).toEqual({
      playbackTicketId: "ticket", audioId: "audio", audioSha256: "a".repeat(64),
      durationMs: 2_000, loaded: true, playing: true, positionMs: 420,
    });
  });


  it("rejects impossible playheads, invalid durations and malformed audio identity", () => {
    const identity = { playbackTicketId: "ticket", audioId: "audio", audioSha256: "a".repeat(64) };
    const valid = { isLoaded: true, isPlaying: true, positionMillis: 20, durationMillis: 100 };
    expect(toGabrooNativePlayerSnapshot({ ...valid, positionMillis: -1 }, identity)).toBeNull();
    expect(toGabrooNativePlayerSnapshot({ ...valid, positionMillis: 100 }, identity)).toBeNull();
    expect(toGabrooNativePlayerSnapshot({ ...valid, durationMillis: 0 }, identity)).toBeNull();
    expect(toGabrooNativePlayerSnapshot({ ...valid, durationMillis: Number.NaN }, identity)).toBeNull();
    expect(toGabrooNativePlayerSnapshot(valid, { ...identity, audioSha256: "bad" })).toBeNull();
    expect(toGabrooNativePlayerSnapshot(valid, { ...identity, playbackTicketId: " " })).toBeNull();
  });

  it("rejects unloaded, paused or incomplete status instead of fabricating a playhead", () => {
    const identity = { playbackTicketId: "ticket", audioId: "audio", audioSha256: "a".repeat(64) };
    expect(toGabrooNativePlayerSnapshot({ isLoaded: false }, identity)).toBeNull();
    expect(toGabrooNativePlayerSnapshot({ isLoaded: true, isPlaying: false }, identity)).toBeNull();
    expect(toGabrooNativePlayerSnapshot({ isLoaded: true, isPlaying: true, positionMillis: 1 }, identity)).toBeNull();
  });
});
