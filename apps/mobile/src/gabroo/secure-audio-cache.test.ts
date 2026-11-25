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
    readDirectoryAsync: vi.fn(async () => Array.from(files.keys()).map(uri => uri.split("/").at(-1) ?? "")),
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
      expiresAt: "2030-01-01T00:00:00.000Z",
      fileSystem: fs,
      nonce: "test",
    });
    expect(result).toEqual({
      uri: `file:///private/cache/gabroo-${digest}-${Date.parse("2030-01-01T00:00:00.000Z")}.audio`,
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
      expiresAt: "2030-01-01T00:00:00.000Z",
      fileSystem: fs,
      nonce: "bad",
    })).rejects.toThrow(/SHA-256 verification failed/i);
    expect(fs.moveAsync).not.toHaveBeenCalled();
    expect(files.size).toBe(0);
  });

  it("rehashes an existing cache entry and replaces corrupt content", async () => {
    const path = `file:///private/cache/gabroo-${digest}-${Date.parse("2030-01-01T00:00:00.000Z")}.audio`;
    const { fs } = makeFs({ [path]: new TextEncoder().encode("corrupt") });
    const result = await cacheGabrooSpeechAudio({
      remoteUri: "https://cdn.example.test/speech",
      cacheDirectory: "file:///private/cache",
      audioSha256: digest,
      expiresAt: "2030-01-01T00:00:00.000Z",
      fileSystem: fs,
      nonce: "repair",
    });
    expect(result.audioSha256).toBe(digest);
    expect(fs.downloadAsync).toHaveBeenCalledOnce();
  });

  it("rejects non-HTTPS sources, invalid hashes and oversized content", async () => {
    const { fs } = makeFs();
    const input = { cacheDirectory: "file:///private/cache", audioSha256: digest, expiresAt: "2030-01-01T00:00:00.000Z", fileSystem: fs };
    await expect(cacheGabrooSpeechAudio({ ...input, remoteUri: "http://bad.test/a" })).rejects.toThrow();
    await expect(cacheGabrooSpeechAudio({ ...input, remoteUri: "https://ok.test/a", audioSha256: "bad" })).rejects.toThrow();
    await expect(cacheGabrooSpeechAudio({
      ...input, remoteUri: "https://ok.test/a", maxBytes: 2,
    })).rejects.toThrow(/exceeds the cache limit/i);
  });
});


describe("cleanupExpiredGabrooSpeechAudio", () => {
  it("removes only cache entries whose encoded signed expiry has elapsed", async () => {
    const { cleanupExpiredGabrooSpeechAudio } = await import("./secure-audio-cache");
    const expired = `gabroo-${digest}-1000.audio`;
    const active = `gabroo-${digest}-9000.audio`;
    const unrelated = "other.audio";
    const { fs, files } = makeFs({
      [`file:///private/cache/${expired}`]: bytes,
      [`file:///private/cache/${active}`]: bytes,
      [`file:///private/cache/${unrelated}`]: bytes,
    });
    const removed = await cleanupExpiredGabrooSpeechAudio({
      cacheDirectory: "file:///private/cache",
      fileSystem: fs,
      nowMs: 5000,
    });
    expect(removed).toBe(1);
    expect(files.has(`file:///private/cache/${expired}`)).toBe(false);
    expect(files.has(`file:///private/cache/${active}`)).toBe(true);
    expect(files.has(`file:///private/cache/${unrelated}`)).toBe(true);
  });
});


describe("Gabroo audio download cancellation", () => {
  it("does not start a download when already cancelled", async () => {
    const { fs } = makeFs();
    const controller = new AbortController();
    controller.abort();
    await expect(cacheGabrooSpeechAudio({
      remoteUri: "https://cdn.example.test/speech",
      cacheDirectory: "file:///private/cache",
      audioSha256: digest,
      expiresAt: "2030-01-01T00:00:00.000Z",
      fileSystem: fs,
      signal: controller.signal,
    })).rejects.toThrow(/cancelled/i);
    expect(fs.downloadAsync).not.toHaveBeenCalled();
  });

  it("removes a partially downloaded file when cancellation occurs during transfer", async () => {
    const { fs, files } = makeFs();
    const controller = new AbortController();
    vi.mocked(fs.downloadAsync).mockImplementationOnce(async (_remote, local) => {
      files.set(local, bytes.slice(0, 5));
      controller.abort();
      return { uri: local, status: 200 };
    });
    await expect(cacheGabrooSpeechAudio({
      remoteUri: "https://cdn.example.test/speech",
      cacheDirectory: "file:///private/cache",
      audioSha256: digest,
      expiresAt: "2030-01-01T00:00:00.000Z",
      fileSystem: fs,
      nonce: "cancelled",
      signal: controller.signal,
    })).rejects.toThrow(/cancelled/i);
    expect(files.size).toBe(0);
    expect(fs.moveAsync).not.toHaveBeenCalled();
  });
});
