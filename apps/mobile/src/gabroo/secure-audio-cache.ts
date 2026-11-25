import { sha256Hex } from "./sha256";

export interface GabrooCacheFileInfo { exists: boolean; size?: number; isDirectory?: boolean }
export interface GabrooCacheDownloadResult { uri: string; status?: number }
export interface GabrooAudioCacheFileSystem {
  getInfoAsync(uri: string): Promise<GabrooCacheFileInfo>;
  downloadAsync(remoteUri: string, localUri: string): Promise<GabrooCacheDownloadResult>;
  readAsBase64Async(uri: string): Promise<string>;
  moveAsync(input: { from: string; to: string }): Promise<void>;
  deleteAsync(uri: string, options?: { idempotent?: boolean }): Promise<void>;
  readDirectoryAsync(uri: string): Promise<string[]>;
}
export interface GabrooCachedAudio {
  uri: string;
  audioSha256: string;
  bytes: number;
}

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
let tempSequence = 0;

function decodeBase64(value: string): Uint8Array {
  const clean = value.replace(/\s/g, "");
  if (!clean || clean.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) {
    throw new Error("Downloaded Gabroo audio is not valid base64 data.");
  }
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  const output = new Uint8Array((clean.length / 4) * 3 - padding);
  let offset = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = BASE64.indexOf(clean[i]), b = BASE64.indexOf(clean[i + 1]);
    const c = clean[i + 2] === "=" ? 0 : BASE64.indexOf(clean[i + 2]);
    const d = clean[i + 3] === "=" ? 0 : BASE64.indexOf(clean[i + 3]);
    const n = (a << 18) | (b << 12) | (c << 6) | d;
    if (offset < output.length) output[offset++] = (n >>> 16) & 255;
    if (offset < output.length) output[offset++] = (n >>> 8) & 255;
    if (offset < output.length) output[offset++] = n & 255;
  }
  return output;
}

/** Download to a private cache temp file, verify raw bytes, then atomically promote it. */
export async function cacheGabrooSpeechAudio(input: {
  remoteUri: string;
  cacheDirectory: string;
  audioSha256: string;
  expiresAt: string;
  fileSystem: GabrooAudioCacheFileSystem;
  maxBytes?: number;
  nonce?: string;
}): Promise<GabrooCachedAudio> {
  let remote: URL;
  try { remote = new URL(input.remoteUri); } catch { throw new Error("Gabroo audio cache input is invalid."); }
  if (remote.protocol !== "https:" || !remote.hostname || remote.username || remote.password
    || input.remoteUri.length > 4096
    || !/^[a-f0-9]{64}$/i.test(input.audioSha256) || !input.cacheDirectory.startsWith("file:///")) {
    throw new Error("Gabroo audio cache input is invalid.");
  }
  const expiryMs = Date.parse(input.expiresAt);
  if (!Number.isFinite(expiryMs) || expiryMs <= Date.now()) {
    throw new Error("Gabroo speech asset has expired.");
  }
  const limit = input.maxBytes ?? MAX_AUDIO_BYTES;
  const finalUri = `${input.cacheDirectory.replace(/\/$/, "")}/gabroo-${input.audioSha256.toLowerCase()}-${expiryMs}.audio`;
  const existing = await input.fileSystem.getInfoAsync(finalUri);
  if (existing.exists) {
    try {
      if (typeof existing.size === "number" && existing.size > 0 && existing.size <= limit) {
        const bytes = decodeBase64(await input.fileSystem.readAsBase64Async(finalUri));
        if (bytes.length === existing.size && sha256Hex(bytes) === input.audioSha256.toLowerCase()) {
          return { uri: finalUri, audioSha256: input.audioSha256.toLowerCase(), bytes: bytes.length };
        }
      }
    } catch {
      // A corrupt cache entry is disposable; fetch and verify a clean copy below.
    }
    await input.fileSystem.deleteAsync(finalUri, { idempotent: true });
  }

  const suffix = (input.nonce ?? `dl-${Date.now()}-${++tempSequence}`).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60) || `dl-${++tempSequence}`;
  const tempUri = `${input.cacheDirectory.replace(/\/$/, "")}/gabroo-${input.audioSha256.toLowerCase()}-${suffix}.part`;
  try {
    await input.fileSystem.deleteAsync(tempUri, { idempotent: true });
    const result = await input.fileSystem.downloadAsync(input.remoteUri, tempUri);
    if (typeof result.status === "number" && result.status !== 200) {
      throw new Error(`Gabroo audio download failed with HTTP ${result.status}.`);
    }
    const info = await input.fileSystem.getInfoAsync(tempUri);
    if (!info.exists || !Number.isSafeInteger(info.size) || !info.size || info.size > limit) {
      throw new Error("Downloaded Gabroo audio is missing, empty or exceeds the cache limit.");
    }
    const bytes = decodeBase64(await input.fileSystem.readAsBase64Async(tempUri));
    if (bytes.length !== info.size) throw new Error("Downloaded Gabroo audio size verification failed.");
    const actualHash = sha256Hex(bytes);
    if (actualHash !== input.audioSha256.toLowerCase()) {
      throw new Error("Downloaded Gabroo audio SHA-256 verification failed.");
    }
    await input.fileSystem.moveAsync({ from: tempUri, to: finalUri });
    return { uri: finalUri, audioSha256: actualHash, bytes: bytes.length };
  } catch (error) {
    await input.fileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => undefined);
    throw error;
  }
}

/** Production Expo SDK 53 legacy filesystem bridge; loaded only on native playback. */
export async function cacheGabrooSpeechAudioWithExpo(input: {
  remoteUri: string;
  audioSha256: string;
  expiresAt: string;
  nonce?: string;
}): Promise<GabrooCachedAudio> {
  const fs = await import("expo-file-system");
  if (!fs.cacheDirectory) throw new Error("Private app cache is unavailable.");
  return cacheGabrooSpeechAudio({
    ...input,
    cacheDirectory: fs.cacheDirectory,
    fileSystem: {
      getInfoAsync: fs.getInfoAsync,
      downloadAsync: async (url, destination) => {
        const result = await fs.downloadAsync(url, destination);
        return { uri: result.uri, status: result.status };
      },
      readAsBase64Async: uri => fs.readAsStringAsync(uri, { encoding: fs.EncodingType.Base64 }),
      moveAsync: fs.moveAsync,
      deleteAsync: fs.deleteAsync,
      readDirectoryAsync: fs.readDirectoryAsync,
    },
  });
}


/** Remove cached Gabroo audio whose server-issued asset expiry has elapsed. */
export async function cleanupExpiredGabrooSpeechAudio(input: {
  cacheDirectory: string;
  fileSystem: Pick<GabrooAudioCacheFileSystem, "readDirectoryAsync" | "deleteAsync">;
  nowMs?: number;
}): Promise<number> {
  if (!input.cacheDirectory.startsWith("file:///")) {
    throw new Error("Gabroo private cache directory is invalid.");
  }
  const nowMs = input.nowMs ?? Date.now();
  const names = await input.fileSystem.readDirectoryAsync(input.cacheDirectory);
  let removed = 0;
  for (const name of names) {
    const match = /^gabroo-[a-f0-9]{64}-(\d+)\.audio$/i.exec(name);
    if (!match) continue;
    const expiryMs = Number(match[1]);
    if (Number.isSafeInteger(expiryMs) && expiryMs <= nowMs) {
      await input.fileSystem.deleteAsync(`${input.cacheDirectory.replace(/\/$/, "")}/${name}`, { idempotent: true });
      removed += 1;
    }
  }
  return removed;
}

/** Expo SDK 53 bridge for opportunistic expired-audio cleanup. */
export async function cleanupExpiredGabrooSpeechAudioWithExpo(nowMs = Date.now()): Promise<number> {
  const fs = await import("expo-file-system");
  if (!fs.cacheDirectory) return 0;
  return cleanupExpiredGabrooSpeechAudio({
    cacheDirectory: fs.cacheDirectory,
    nowMs,
    fileSystem: { readDirectoryAsync: fs.readDirectoryAsync, deleteAsync: fs.deleteAsync },
  });
}
