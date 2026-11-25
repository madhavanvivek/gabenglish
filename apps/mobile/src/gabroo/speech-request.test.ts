import { describe, expect, it } from "vitest";
import { buildGabrooSpeechRequest, parseGabrooSpeechResponse } from "./speech-request";

const validAsset = {
  playbackTicketId: "ticket-1",
  audioId: "audio-1",
  audioSha256: "a".repeat(64),
  measuredDurationMs: 1_000,
  alignmentAudioSha256: "a".repeat(64),
  alignmentDurationMs: 1_000,
  uri: "https://cdn.example.test/audio.mp3?signature=opaque",
  expiresAt: "2030-01-01T00:00:00.000Z",
  timeline: { audio_id: "audio-1", duration_ms: 1_000, visemes: [], expressions: [], gestures: [] },
};

describe("Gabroo speech request boundary", () => {
  it("trims text and sends the explicit consent header with supported settings", () => {
    expect(buildGabrooSpeechRequest({
      text: "  നമസ്കാരം!  ", language: "ml", speech_rate: 1.1, consentGranted: true,
    })).toEqual({
      body: { text: "നമസ്കാരം!", language: "ml", speech_rate: 1.1 },
      headers: { "x-gabroo-consent": "true" },
    });
  });

  it.each([
    { text: "  ", language: "ml" as const, speech_rate: 1 },
    { text: "x".repeat(5_001), language: "en" as const, speech_rate: 1 },
    { text: "hello", language: "en" as const, speech_rate: 0.5 },
    { text: "hello", language: "en" as const, speech_rate: 2 },
    { text: "hello", language: "ml" as const, speech_rate: Number.NaN },
  ])("rejects invalid text or speech settings before sending", value => {
    expect(() => buildGabrooSpeechRequest({ ...value, consentGranted: true })).toThrow();
  });

  it("accepts only a valid, unexpired server-issued asset envelope", () => {
    expect(parseGabrooSpeechResponse({ speech_asset: validAsset }, Date.parse("2029-12-31T00:00:00.000Z")).audioId)
      .toBe("audio-1");
    expect(() => parseGabrooSpeechResponse({ speech_asset: validAsset }, Date.parse("2030-01-01T00:00:00.000Z")))
      .toThrow(/expired/i);
    expect(() => parseGabrooSpeechResponse({ speech_asset: { ...validAsset, uri: "http://unsafe.test/a.mp3" } }))
      .toThrow();
    expect(() => parseGabrooSpeechResponse({ unexpected: true })).toThrow();
  });
});
