import {
  GabrooRecognitionError,
  parseActiveGabrooSpeechAsset,
  type GabrooSpeechAsset,
} from "@gabenglish/contracts";

export type GabrooSpeechLanguage = "ml" | "en";

export interface GabrooSpeechAssetProvider {
  generate(input: {
    text: string;
    language: GabrooSpeechLanguage;
    speechRate: number;
    signal: AbortSignal;
  }): Promise<unknown>;
}

const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_TIMEOUT_MS = 45_000;

/**
 * Consent-gated, provider-neutral speech generation boundary.
 * Provider output is untrusted until the shared asset envelope validates.
 * This service never stores learner text or audio and never logs provider data.
 */
export async function generateGabrooSpeechAsset(input: {
  text: string;
  language: GabrooSpeechLanguage;
  speechRate: number;
  consentGranted: boolean;
  provider?: GabrooSpeechAssetProvider;
  signal?: AbortSignal;
  timeoutMs?: number;
  nowMs?: number;
}): Promise<GabrooSpeechAsset> {
  if (input.consentGranted !== true) {
    throw new GabrooRecognitionError("CONSENT_REQUIRED", "Explicit learner consent is required before speech generation.");
  }
  const text = typeof input.text === "string" ? input.text.trim() : "";
  if (!text || text.length > 5_000) {
    throw new GabrooRecognitionError("INVALID_AUDIO", "Gabroo speech text must contain between 1 and 5,000 characters.");
  }
  if (input.language !== "ml" && input.language !== "en") {
    throw new GabrooRecognitionError("INVALID_AUDIO", "Unsupported Gabroo speech language.");
  }
  if (!Number.isFinite(input.speechRate) || input.speechRate < 0.75 || input.speechRate > 1.5) {
    throw new GabrooRecognitionError("INVALID_AUDIO", "Gabroo speech rate is outside the supported range.");
  }
  if (!input.provider) {
    throw new GabrooRecognitionError("PROVIDER_UNAVAILABLE", "Gabroo speech generation is not configured.");
  }
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_TIMEOUT_MS) {
    throw new GabrooRecognitionError("INVALID_AUDIO", "Gabroo speech generation timeout is invalid.");
  }
  if (input.signal?.aborted) {
    throw new GabrooRecognitionError("PROVIDER_UNAVAILABLE", "Gabroo speech generation was cancelled.");
  }

  const controller = new AbortController();
  let rejectCallerCancellation: ((reason: Error) => void) | undefined;
  const callerCancelled = new Promise<never>((_, reject) => { rejectCallerCancellation = reject; });
  const abortFromCaller = () => {
    controller.abort();
    rejectCallerCancellation?.(new GabrooRecognitionError("PROVIDER_UNAVAILABLE", "Gabroo speech generation was cancelled."));
  };
  input.signal?.addEventListener("abort", abortFromCaller, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
        reject(new Error("Gabroo speech generation timed out."));
      }, timeoutMs);
    });
    const generated = await Promise.race([
      input.provider.generate({
        text,
        language: input.language,
        speechRate: input.speechRate,
        signal: controller.signal,
      }),
      timeout,
    ]);
    if (input.signal?.aborted) {
      throw new GabrooRecognitionError("PROVIDER_UNAVAILABLE", "Gabroo speech generation was cancelled.");
    }
    try {
      return parseActiveGabrooSpeechAsset(generated, input.nowMs);
    } catch {
      throw new GabrooRecognitionError("PROVIDER_UNAVAILABLE", "Gabroo speech provider returned an invalid or expired asset.");
    }
  } catch (error) {
    if (error instanceof GabrooRecognitionError) throw error;
    if (timedOut) {
      throw new GabrooRecognitionError("PROVIDER_TIMEOUT", "Gabroo speech generation timed out. Please try again.");
    }
    throw new GabrooRecognitionError("PROVIDER_UNAVAILABLE", "Gabroo speech generation is temporarily unavailable.");
  } finally {
    if (timer) clearTimeout(timer);
    input.signal?.removeEventListener("abort", abortFromCaller);
  }
}
