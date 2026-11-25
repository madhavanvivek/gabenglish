import { describe, expect, it } from "vitest";
import { prepareGabrooPlaybackAsset, validateGabrooPlaybackAsset } from "./playback-asset-validation";

const identity = {
  playbackTicketId: "ticket-1",
  audioId: "audio-1",
  audioSha256: "a".repeat(64),
  measuredDurationMs: 1_000,
  alignmentAudioSha256: "a".repeat(64),
  alignmentDurationMs: 1_000,
};
const timeline = {
  audio_id: "audio-1",
  duration_ms: 1_000,
  visemes: [{ start_ms: 100, end_ms: 300, shape: "open_wide", weight: 0.8 }],
  expressions: [],
  gestures: [],
};

describe("validateGabrooPlaybackAsset", () => {
  it("returns a parsed, normalized timeline bound to the exact audio identity", () => {
    const parsed = validateGabrooPlaybackAsset(identity, timeline);
    expect(parsed).toMatchObject({ audio_id: "audio-1", duration_ms: 1_000 });
    expect(parsed).not.toBe(timeline);
  });

  it("rejects malformed, mismatched and out-of-range alignment before playback", () => {
    expect(() => validateGabrooPlaybackAsset(identity, null)).toThrow(/alignment is invalid/i);
    expect(() => validateGabrooPlaybackAsset(identity, { ...timeline, audio_id: "other" })).toThrow(/does not match/i);
    expect(() => validateGabrooPlaybackAsset(identity, { ...timeline, duration_ms: 999 })).toThrow(/does not match/i);
    expect(() => validateGabrooPlaybackAsset(identity, {
      ...timeline,
      visemes: [{ start_ms: 900, end_ms: 1_200, shape: "open_wide" }],
    })).toThrow(/alignment is invalid/i);
    expect(() => validateGabrooPlaybackAsset({ ...identity, audioSha256: "bad" }, timeline)).toThrow(/metadata are required/i);
  });

  it("does not allow caller mutation after validation to alter the accepted timeline", () => {
    const source: any = structuredClone(timeline);
    const parsed = validateGabrooPlaybackAsset(identity, source);
    source.visemes[0].shape = "closed_lips";
    expect(parsed.visemes[0].shape).toBe("open_wide");
  });
});


const speechAsset = {
  playbackTicketId: "ticket-1",
  audioId: "audio-1",
  audioSha256: "a".repeat(64),
  measuredDurationMs: 1_000,
  alignmentAudioSha256: "a".repeat(64),
  alignmentDurationMs: 1_000,
  uri: "https://cdn.example.test/audio.mp3?signature=opaque",
  expiresAt: "2030-01-01T00:00:00.000Z",
  timeline,
};

describe("prepareGabrooPlaybackAsset", () => {
  it("derives URI, playback identity and timeline from the same validated envelope", () => {
    const prepared = prepareGabrooPlaybackAsset(speechAsset, Date.parse("2029-12-31T00:00:00.000Z"));
    expect(prepared.uri).toBe(speechAsset.uri);
    expect(prepared.identity).toEqual({
      playbackTicketId: "ticket-1",
      audioId: "audio-1",
      audioSha256: "a".repeat(64),
      measuredDurationMs: 1_000,
      alignmentAudioSha256: "a".repeat(64),
      alignmentDurationMs: 1_000,
    });
    expect(prepared.timeline).toMatchObject({ audio_id: "audio-1", duration_ms: 1_000 });
  });

  it("rejects expired assets and any cross-bound audio or alignment substitution", () => {
    expect(() => prepareGabrooPlaybackAsset(speechAsset, Date.parse("2030-01-01T00:00:00.000Z")))
      .toThrow(/expired/i);
    expect(() => prepareGabrooPlaybackAsset({
      ...speechAsset,
      timeline: { ...timeline, audio_id: "different-audio" },
    }, Date.parse("2029-12-31T00:00:00.000Z"))).toThrow();
    expect(() => prepareGabrooPlaybackAsset({
      ...speechAsset,
      alignmentAudioSha256: "b".repeat(64),
    }, Date.parse("2029-12-31T00:00:00.000Z"))).toThrow();
  });
});
