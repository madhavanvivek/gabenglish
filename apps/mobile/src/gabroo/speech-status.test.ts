import { describe, expect, it } from "vitest";
import { parseGabrooSpeechStatus } from "./speech-status";

const valid = {
  available: false,
  supported_languages: ["ml", "en"],
  speech_rate: { minimum: 0.75, maximum: 1.5 },
  consent_required: true,
};

describe("Gabroo speech readiness contract", () => {
  it("accepts the unavailable state while preserving the supported capability contract", () => {
    expect(parseGabrooSpeechStatus(valid)).toEqual(valid);
  });

  it("accepts configured speech readiness", () => {
    expect(parseGabrooSpeechStatus({ ...valid, available: true }).available).toBe(true);
  });

  it.each([
    { ...valid, available: "false" },
    { ...valid, supported_languages: [] },
    { ...valid, supported_languages: ["ml", "ml"] },
    { ...valid, speech_rate: { minimum: 1.5, maximum: 0.75 } },
    { ...valid, speech_rate: { minimum: 0.75, maximum: Number.POSITIVE_INFINITY } },
    { ...valid, consent_required: false },
    { ...valid, unexpected: true },
  ])("rejects malformed readiness payloads", payload => {
    expect(() => parseGabrooSpeechStatus(payload)).toThrow();
  });
});
