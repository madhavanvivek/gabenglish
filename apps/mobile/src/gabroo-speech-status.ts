export type GabrooSpeechFormat = "audio/mpeg";

export type GabrooSpeechStatus = {
  available: boolean;
  formats: GabrooSpeechFormat[];
  speed: { minimum: number; maximum: number };
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

  const { available, formats, speed } = payload;
  if (
    typeof available !== "boolean" ||
    !Array.isArray(formats) ||
    !formats.every(
      (format): format is GabrooSpeechFormat =>
        typeof format === "string" &&
        SUPPORTED_FORMATS.includes(format as GabrooSpeechFormat),
    ) ||
    new Set(formats).size !== formats.length ||
    !isRecord(speed)
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
    (!available && formats.length !== 0)
  ) {
    throw new Error("Gabroo speech availability returned an invalid response.");
  }

  return {
    available,
    formats: [...formats],
    speed: { minimum, maximum },
  };
}
