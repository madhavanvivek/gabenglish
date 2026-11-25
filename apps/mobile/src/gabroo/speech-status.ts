export type GabrooSpeechStatus = {
  available: boolean;
  supported_languages: ("ml" | "en")[];
  speech_rate: { minimum: number; maximum: number };
  consent_required: true;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseGabrooSpeechStatus(value: unknown): GabrooSpeechStatus {
  if (!isRecord(value)) throw new Error("Invalid Gabroo speech status.");
  const keys = Object.keys(value).sort().join(",");
  if (keys !== "available,consent_required,speech_rate,supported_languages") {
    throw new Error("Invalid Gabroo speech status fields.");
  }
  const rate = value.speech_rate;
  if (!isRecord(rate) || Object.keys(rate).sort().join(",") !== "maximum,minimum") {
    throw new Error("Invalid Gabroo speech rate.");
  }
  const minimum = rate.minimum;
  const maximum = rate.maximum;
  const languages = value.supported_languages;
  if (typeof value.available !== "boolean" || value.consent_required !== true ||
      !Array.isArray(languages) || languages.length < 1 || languages.length > 2 ||
      !languages.every(language => language === "ml" || language === "en") ||
      new Set(languages).size !== languages.length ||
      typeof minimum !== "number" || !Number.isFinite(minimum) || minimum < 0.5 || minimum > 1.5 ||
      typeof maximum !== "number" || !Number.isFinite(maximum) || maximum < 0.5 || maximum > 2 ||
      minimum >= maximum) {
    throw new Error("Invalid Gabroo speech status values.");
  }
  return {
    available: value.available,
    supported_languages: languages as ("ml" | "en")[],
    speech_rate: { minimum, maximum },
    consent_required: true,
  };
}
