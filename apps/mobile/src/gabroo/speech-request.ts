import { parseActiveGabrooSpeechAsset, type GabrooSpeechAsset } from "@gabenglish/contracts";

export type GabrooSpeechRequestInput = {
  text: string;
  language: "ml" | "en";
  speech_rate: number;
  consentGranted: true;
};

export function buildGabrooSpeechRequest(input: GabrooSpeechRequestInput) {
  if (input.consentGranted !== true) throw new Error("Explicit consent is required before generating Gabroo speech.");
  const text = input.text.trim();
  if (!text || text.length > 5_000) throw new Error("Gabroo speech text must contain 1 to 5,000 characters.");
  if (input.language !== "ml" && input.language !== "en") throw new Error("Unsupported Gabroo speech language.");
  if (!Number.isFinite(input.speech_rate) || input.speech_rate < 0.75 || input.speech_rate > 1.5) {
    throw new Error("Gabroo speech rate must be between 0.75 and 1.5.");
  }
  return {
    body: { text, language: input.language, speech_rate: input.speech_rate },
    headers: { "x-gabroo-consent": "true" as const },
  };
}

export function parseGabrooSpeechResponse(value: unknown, nowMs = Date.now()): GabrooSpeechAsset {
  if (typeof value !== "object" || value === null || !("speech_asset" in value)) {
    throw new Error("Gabroo speech generation returned an invalid response.");
  }
  return parseActiveGabrooSpeechAsset(value.speech_asset, nowMs);
}
