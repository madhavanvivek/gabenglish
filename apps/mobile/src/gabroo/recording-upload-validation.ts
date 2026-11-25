export const GABROO_MAX_TRANSCRIPTION_UPLOAD_BYTES = 15 * 1024 * 1024;

export function validateGabrooRecordingUpload(input: {
  uri: unknown;
  exists: unknown;
  size: unknown;
  maxBytes?: number;
}): { uri: string; size: number } {
  const maxBytes = input.maxBytes ?? GABROO_MAX_TRANSCRIPTION_UPLOAD_BYTES;
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new Error("Gabroo recording upload limit is invalid.");
  }
  if (typeof input.uri !== "string" || !input.uri.startsWith("file:///")) {
    throw new Error("A private local Gabroo recording is required.");
  }
  if (input.exists !== true) {
    throw new Error("The Gabroo recording file is no longer available.");
  }
  if (!Number.isSafeInteger(input.size) || (input.size as number) <= 0) {
    throw new Error("The Gabroo recording file size could not be verified.");
  }
  if ((input.size as number) > maxBytes) {
    throw new Error("The Gabroo recording is too large to transcribe. Please make a shorter recording.");
  }
  return { uri: input.uri, size: input.size as number };
}
