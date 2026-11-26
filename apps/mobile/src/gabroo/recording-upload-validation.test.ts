import { describe, expect, it } from "vitest";
import {
  GABROO_MAX_TRANSCRIPTION_UPLOAD_BYTES,
  validateGabrooRecordingUpload,
} from "./recording-upload-validation";

describe("Gabroo recording upload validation", () => {
  it("accepts an existing private local recording within the byte limit", () => {
    expect(validateGabrooRecordingUpload({
      uri: "file:///private/var/mobile/recording.m4a",
      exists: true,
      size: 1024,
    })).toEqual({ uri: "file:///private/var/mobile/recording.m4a", size: 1024 });
  });

  it("rejects remote and non-file URIs", () => {
    expect(() => validateGabrooRecordingUpload({
      uri: "https://example.test/audio",
      exists: true,
      size: 1024,
    })).toThrow(/private local/i);
  });

  it("rejects missing, empty and unverifiable files", () => {
    for (const input of [
      { uri: "file:///private/audio.m4a", exists: false, size: 1024 },
      { uri: "file:///private/audio.m4a", exists: true, size: 0 },
      { uri: "file:///private/audio.m4a", exists: true, size: undefined },
    ]) expect(() => validateGabrooRecordingUpload(input)).toThrow();
  });

  it("rejects recordings larger than 10 MiB", () => {
    expect(() => validateGabrooRecordingUpload({
      uri: "file:///private/audio.m4a",
      exists: true,
      size: GABROO_MAX_TRANSCRIPTION_UPLOAD_BYTES + 1,
    })).toThrow(/too large/i);
  });

  it("rejects invalid configured limits", () => {
    expect(() => validateGabrooRecordingUpload({
      uri: "file:///private/audio.m4a",
      exists: true,
      size: 1,
      maxBytes: 0,
    })).toThrow(/limit is invalid/i);
  });
});
