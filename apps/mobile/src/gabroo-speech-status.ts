export type GabrooSpeechFormat = "audio/mpeg";

export type GabrooSpeechStatus = {
  available: boolean;
  formats: GabrooSpeechFormat[];
  speed: { minimum: number; maximum: number };
  capabilities: {
    speech_synthesis: boolean;
    character_alignment: false;
    phoneme_alignment: false;
    live_avatar_renderer: false;
  };
};

const SUPPORTED_FORMATS: readonly GabrooSpeechFormat[] = ["audio/mpeg"];
const MIN_ALLOWED_SPEED = 0.75;
const MAX_ALLOWED_SPEED = 1.5;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Validate the provider contract before the mobile UI trusts readiness or playback limits. */
export function parseGabrooSpeechStatus(payload: unknown): GabrooSpeechStatus {
  if (!isRecord(payload)) {
    throw new Error("Gabroo speech availability returned an invalid response.");
  }

  const { available, formats, speed, capabilities } = payload;
  if (
    typeof available !== "boolean" ||
    !Array.isArray(formats) ||
    !formats.every(
      (format): format is GabrooSpeechFormat =>
        typeof format === "string" &&
        SUPPORTED_FORMATS.includes(format as GabrooSpeechFormat),
    ) ||
    new Set(formats).size !== formats.length ||
    !isRecord(speed) ||
    !isRecord(capabilities) ||
    typeof capabilities.speech_synthesis !== "boolean" ||
    capabilities.character_alignment !== false ||
    capabilities.phoneme_alignment !== false ||
    capabilities.live_avatar_renderer !== false
  ) {
    throw new Error("Gabroo speech availability returned an invalid response.");
  }

  const { minimum, maximum } = speed;
  if (
    typeof minimum !== "number" ||
    !Number.isFinite(minimum) ||
    typeof maximum !== "number" ||
    !Number.isFinite(maximum) ||
    minimum < MIN_ALLOWED_SPEED ||
    maximum > MAX_ALLOWED_SPEED ||
    minimum > maximum ||
    (available && (formats.length !== 1 || formats[0] !== "audio/mpeg")) ||
    (!available && formats.length !== 0) ||
    capabilities.speech_synthesis !== available
  ) {
    throw new Error("Gabroo speech availability returned an invalid response.");
  }

  return {
    available,
    formats: [...formats],
    speed: { minimum, maximum },
    capabilities: {
      speech_synthesis: capabilities.speech_synthesis,
      character_alignment: false,
      phoneme_alignment: false,
      live_avatar_renderer: false,
    },
  };
}
