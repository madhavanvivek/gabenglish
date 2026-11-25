import { describe, expect, it } from "vitest";
import { gabrooSpeechAssetSchema, parseActiveGabrooSpeechAsset } from "./gabroo-speech-asset";

const validAsset = () => ({
  playbackTicketId: "ticket-1",
  audioId: "audio-1",
  audioSha256: "a".repeat(64),
  measuredDurationMs: 1_000,
  alignmentAudioSha256: "a".repeat(64),
  alignmentDurationMs: 1_000,
  uri: "https://cdn.example.test/gabroo/audio-1.mp3?signature=opaque",
  expiresAt: "2030-01-01T00:00:00.000Z",
  timeline: {
    audio_id: "audio-1",
    duration_ms: 1_000,
    visemes: [{ start_ms: 100, end_ms: 300, shape: "open_wide", weight: 0.8 }],
    expressions: [],
    gestures: [],
  },
});

describe("Gabroo speech asset contract", () => {
  it("accepts a content-bound, unexpired HTTPS speech asset", () => {
    const asset = parseActiveGabrooSpeechAsset(validAsset(), Date.parse("2029-12-31T23:59:00.000Z"));
    expect(asset.audioId).toBe("audio-1");
    expect(asset.timeline.visemes).toHaveLength(1);
  });

  it("rejects alignment hash, duration, audio ID and timeline mismatches", () => {
    expect(gabrooSpeechAssetSchema.safeParse({ ...validAsset(), alignmentAudioSha256: "b".repeat(64) }).success).toBe(false);
    expect(gabrooSpeechAssetSchema.safeParse({ ...validAsset(), alignmentDurationMs: 999 }).success).toBe(false);
    expect(gabrooSpeechAssetSchema.safeParse({ ...validAsset(), timeline: { ...validAsset().timeline, audio_id: "other" } }).success).toBe(false);
    expect(gabrooSpeechAssetSchema.safeParse({ ...validAsset(), timeline: { ...validAsset().timeline, duration_ms: 999 } }).success).toBe(false);
  });

  it.each([
    "http://cdn.example.test/audio.mp3",
    "javascript:alert(1)",
    "data:audio/mpeg;base64,AAAA",
    "https://user:pass@example.test/audio.mp3",
    "file:///private/audio.mp3",
  ])("rejects unsafe asset URL %s", uri => {
    expect(gabrooSpeechAssetSchema.safeParse({ ...validAsset(), uri }).success).toBe(false);
  });

  it("rejects expired assets at playback time", () => {
    expect(() => parseActiveGabrooSpeechAsset(validAsset(), Date.parse("2030-01-01T00:00:00.000Z"))).toThrow(/expired/i);
  });

  it("rejects unexpected envelope fields", () => {
    expect(gabrooSpeechAssetSchema.safeParse({ ...validAsset(), providerSecret: "do-not-leak" }).success).toBe(false);
  });
});
