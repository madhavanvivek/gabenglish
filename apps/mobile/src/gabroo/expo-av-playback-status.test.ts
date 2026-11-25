import { describe, expect, it } from "vitest";
import { toGabrooNativePlayerSnapshot } from "./expo-av-playback-status";

const identity = {
  playbackTicketId: "ticket-1",
  audioId: "audio-1",
  audioSha256: "a".repeat(64),
  measuredDurationMs: 1_000,
};

describe("toGabrooNativePlayerSnapshot duration binding", () => {
  it("accepts native duration within the 50 ms media-container tolerance", () => {
    expect(toGabrooNativePlayerSnapshot({
      isLoaded: true, isPlaying: true, positionMillis: 100, durationMillis: 1_045,
    }, identity)).toMatchObject({ durationMs: 1_045, audioId: "audio-1" });
  });

  it("rejects native duration that does not match the signed asset metadata", () => {
    expect(toGabrooNativePlayerSnapshot({
      isLoaded: true, isPlaying: true, positionMillis: 100, durationMillis: 1_051,
    }, identity)).toBeNull();
  });

  it("rejects missing or invalid measured duration metadata", () => {
    expect(toGabrooNativePlayerSnapshot({
      isLoaded: true, isPlaying: true, positionMillis: 100, durationMillis: 1_000,
    }, { ...identity, measuredDurationMs: Number.NaN })).toBeNull();
  });
});
