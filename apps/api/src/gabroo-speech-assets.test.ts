import { describe, expect, it, vi } from "vitest";
import { GabrooRecognitionError } from "@gabenglish/contracts";
import { generateGabrooSpeechAsset, type GabrooSpeechAssetProvider } from "./gabroo-speech-assets.js";

const asset = () => ({
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

const input = (provider?: GabrooSpeechAssetProvider) => ({
  text: "  നമസ്കാരം!  ",
  language: "ml" as const,
  speechRate: 1,
  consentGranted: true,
  provider,
  nowMs: Date.parse("2029-12-31T23:59:00.000Z"),
});

describe("generateGabrooSpeechAsset", () => {
  it("requires explicit consent and a configured provider before generation", async () => {
    const generate = vi.fn();
    await expect(generateGabrooSpeechAsset({ ...input({ generate }), consentGranted: false }))
      .rejects.toMatchObject({ code: "CONSENT_REQUIRED" });
    await expect(generateGabrooSpeechAsset(input()))
      .rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(generate).not.toHaveBeenCalled();
  });

  it("sends only normalized learner text and validated preferences to the provider", async () => {
    const generate = vi.fn(async () => asset());
    const result = await generateGabrooSpeechAsset(input({ generate }));
    expect(result.audioId).toBe("audio-1");
    expect(generate).toHaveBeenCalledOnce();
    expect(generate.mock.calls[0][0]).toMatchObject({
      text: "നമസ്കാരം!", language: "ml", speechRate: 1,
    });
    expect(generate.mock.calls[0][0].signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    { text: "  ", language: "ml" as const, speechRate: 1 },
    { text: "a".repeat(5_001), language: "ml" as const, speechRate: 1 },
    { text: "hello", language: "en" as const, speechRate: 1.6 },
    { text: "hello", language: "xx" as "en", speechRate: 1 },
  ])("rejects invalid generation input", async value => {
    const generate = vi.fn(async () => asset());
    await expect(generateGabrooSpeechAsset({ ...input({ generate }), ...value }))
      .rejects.toBeInstanceOf(GabrooRecognitionError);
    expect(generate).not.toHaveBeenCalled();
  });

  it("rejects provider output that is not a valid content-bound asset", async () => {
    const generate = vi.fn(async () => ({ ...asset(), alignmentAudioSha256: "b".repeat(64) }));
    await expect(generateGabrooSpeechAsset(input({ generate })))
      .rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  });

  it("rejects already-aborted requests without calling the provider", async () => {
    const controller = new AbortController();
    controller.abort();
    const generate = vi.fn(async () => asset());
    await expect(generateGabrooSpeechAsset({ ...input({ generate }), signal: controller.signal }))
      .rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(generate).not.toHaveBeenCalled();
  });

  it("aborts the provider when the caller cancels", async () => {
    const controller = new AbortController();
    let providerSignal: AbortSignal | undefined;
    const generate = vi.fn(({ signal }: { signal: AbortSignal }) => new Promise<unknown>((_resolve, reject) => {
      providerSignal = signal;
      signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }));
    const pending = generateGabrooSpeechAsset({ ...input({ generate }), signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(providerSignal?.aborted).toBe(true);
  });

  it("times out and aborts the provider", async () => {
    let providerSignal: AbortSignal | undefined;
    const generate = vi.fn(({ signal }: { signal: AbortSignal }) => {
      providerSignal = signal;
      return new Promise<unknown>(() => undefined);
    });
    await expect(generateGabrooSpeechAsset({ ...input({ generate }), timeoutMs: 5 }))
      .rejects.toMatchObject({ code: "PROVIDER_TIMEOUT" });
    expect(providerSignal?.aborted).toBe(true);
  });
});
