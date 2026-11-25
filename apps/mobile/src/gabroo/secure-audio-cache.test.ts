import { describe, expect, it, vi } from "vitest";
import { cacheGabrooSpeechAudio, type GabrooAudioCacheFileSystem } from "./secure-audio-cache";
import { sha256Hex } from "./sha256";

const bytes = new TextEncoder().encode("Gabroo verified speech");
const base64 = btoa(String.fromCharCode(...bytes));
const digest = sha256Hex(bytes);

function makeFs(initial: Record<string, Uint8Array> = {}) {
  const files = new Map<string, Uint8Array>(Object.entries(initial));
  const fs: GabrooAudioCacheFileSystem = {
    getInfoAsync: vi.fn(async uri => ({ exists: files.has(uri), size: files.get(uri)?.length })),
    downloadAsync: vi.fn(async (_remote, local) => { files.set(local, bytes); return { uri: local, status: 200 }; }),
    readAsBase64Async: vi.fn(async uri => {
      const value = files.get(uri);
      if (!value) throw new Error("missing");
      return btoa(String.fromCharCode(...value));
    }),
    moveAsync: vi.fn(async ({ from, to }) => {
      const value = files.get(from);
      if (!value) throw new Error("missing temp");
      files.set(to, value); files.delete(from);
    }),
    deleteAsync: vi.fn(async (uri) => { files.delete(uri); }),
  };
  return { fs, files };
}

describe("Gabroo secure audio cache", () => {
  it("verifies downloaded raw bytes before promoting them into the cache", async () => {
    const { fs, files } = makeFs();
    const result = await cacheGabrooSpeechAudio({
      remoteUri: "https://cdn.example.test/speech?token=x",
      cacheDirectory: "file:///private/cache/",
      audioSha256: digest,
      fileSystem: fs,
      nonce: "test",
    });
    expect(result).toEqual({
      uri: `file:///private/cache/gabroo-${digest}.audio`,
      audioSha256: digest,
      bytes: bytes.length,
    });
    expect(files.has(result.uri)).toBe(true);
    expect(fs.moveAsync).toHaveBeenCalledOnce();
  });

  it("rejects tampered downloads and removes the temporary file", async () => {
    const { fs, files } = makeFs();
    vi.mocked(fs.downloadAsync).mockImplementationOnce(async (_remote, local) => {
      files.set(local, new TextEncoder().encode("tampered"));
      return { uri: local, status: 200 };
    });
    await expect(cacheGabrooSpeechAudio({
      remoteUri: "https://cdn.example.test/speech",
      cacheDirectory: "file:///private/cache",
      audioSha256: digest,
      fileSystem: fs,
      nonce: "bad",
    })).rejects.toThrow(/SHA-256 verification failed/i);
    expect(fs.moveAsync).not.toHaveBeenCalled();
    expect(files.size).toBe(0);
  });

  it("rehashes an existing cache entry and replaces corrupt content", async () => {
    const path = `file:///private/cache/gabroo-${digest}.audio`;
    const { fs } = makeFs({ [path]: new TextEncoder().encode("corrupt") });
    const result = await cacheGabrooSpeechAudio({
      remoteUri: "https://cdn.example.test/speech",
      cacheDirectory: "file:///private/cache",
      audioSha256: digest,
      fileSystem: fs,
      nonce: "repair",
    });
    expect(result.audioSha256).toBe(digest);
    expect(fs.downloadAsync).toHaveBeenCalledOnce();
  });

  it("rejects non-HTTPS sources, invalid hashes and oversized content", async () => {
    const { fs } = makeFs();
    const input = { cacheDirectory: "file:///private/cache", audioSha256: digest, fileSystem: fs };
    await expect(cacheGabrooSpeechAudio({ ...input, remoteUri: "http://bad.test/a" })).rejects.toThrow();
    await expect(cacheGabrooSpeechAudio({ ...input, remoteUri: "https://ok.test/a", audioSha256: "bad" })).rejects.toThrow();
    await expect(cacheGabrooSpeechAudio({
      ...input, remoteUri: "https://ok.test/a", maxBytes: 2,
    })).rejects.toThrow(/exceeds the cache limit/i);
  });
});
