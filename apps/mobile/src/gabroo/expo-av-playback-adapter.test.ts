import { describe, expect, it } from "vitest";
import { isGabrooPlayableAudioUri, toGabrooNativePlayerSnapshot, type ExpoPlaybackStatusLike } from "./expo-av-playback-status";

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


describe("Gabroo playable audio URI validation", () => {
  it("accepts HTTPS assets and app-private file cache URIs", () => {
    expect(isGabrooPlayableAudioUri("https://cdn.example.test/audio/clip.mp3")).toBe(true);
    expect(isGabrooPlayableAudioUri("file:///data/user/0/app/cache/gabroo.mp3")).toBe(true);
  });

  it("rejects executable, credential-bearing, malformed and oversized URIs", () => {
    expect(isGabrooPlayableAudioUri("javascript:alert(1)")).toBe(false);
    expect(isGabrooPlayableAudioUri("data:audio/mpeg;base64,AAAA")).toBe(false);
    expect(isGabrooPlayableAudioUri("http://cdn.example.test/audio.mp3")).toBe(false);
    expect(isGabrooPlayableAudioUri("https://user:pass@example.test/audio.mp3")).toBe(false);
    expect(isGabrooPlayableAudioUri("file://relative/path.mp3")).toBe(false);
    expect(isGabrooPlayableAudioUri(" https://example.test/audio.mp3")).toBe(false);
    expect(isGabrooPlayableAudioUri("https://example.test/" + "a".repeat(4100))).toBe(false);
    expect(isGabrooPlayableAudioUri(null)).toBe(false);
  });
});
