import {
  GabrooNativePlaybackClock,
} from "./native-playback-clock";
import type { GabrooAvatarRendererGate } from "./avatar-renderer-gate";

import { isGabrooPlayableAudioUri, toGabrooNativePlayerSnapshot } from "./expo-av-playback-status";
import { prepareGabrooPlaybackAsset } from "./playback-asset-validation";
import { cacheGabrooSpeechAudioWithExpo, type GabrooCachedAudio } from "./secure-audio-cache";

export interface GabrooExpoAvSoundLike {
  playAsync(): Promise<unknown>;
  pauseAsync(): Promise<unknown>;
  stopAsync(): Promise<unknown>;
  unloadAsync(): Promise<unknown>;
}

export interface GabrooExpoAvPlaybackHandle {
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  unload(): Promise<void>;
}

/**
 * Connects Expo AV's native playback-status callback to the host-neutral
 * avatar clock. The adapter accepts one complete server-issued asset envelope
 * and derives its URI, audio identity and timeline from that same validated
 * object, preventing callers from mixing unrelated audio and alignment data.
 *
 * createSound is injectable for deterministic boundary tests; production
 * callers use Expo AV's native implementation by default.
 */
export async function createGabrooExpoAvPlayback(input: {
  asset: unknown;
  gate: GabrooAvatarRendererGate;
  onError?: (error: Error) => void;
  nowMs?: number;
  cacheAudio?: (input: { remoteUri: string; audioSha256: string; expiresAt: string; signal?: AbortSignal }) => Promise<GabrooCachedAudio>;
  signal?: AbortSignal;
  createSound?: (
    source: { uri: string },
    initialStatus: { shouldPlay: boolean; progressUpdateIntervalMillis: number },
    onPlaybackStatusUpdate: (status: import("expo-av").AVPlaybackStatus) => void,
  ) => Promise<{ sound: GabrooExpoAvSoundLike }>;
}): Promise<GabrooExpoAvPlaybackHandle> {
  if (input.signal?.aborted) throw new Error("Gabroo playback was cancelled.");
  const prepared = prepareGabrooPlaybackAsset(input.asset, input.nowMs);
  if (!isGabrooPlayableAudioUri(prepared.uri)) {
    throw new Error("A playable Gabroo audio URI is required.");
  }
  const identity = prepared.identity;
  const validatedTimeline = prepared.timeline;
  const cachedAudio = await (input.cacheAudio ?? cacheGabrooSpeechAudioWithExpo)({
    remoteUri: prepared.uri,
    audioSha256: identity.audioSha256,
    expiresAt: prepared.expiresAt,
    signal: input.signal,
  });
  if (input.signal?.aborted) throw new Error("Gabroo playback was cancelled.");
  if (cachedAudio.audioSha256.toLowerCase() !== identity.audioSha256.toLowerCase()
    || !isGabrooPlayableAudioUri(cachedAudio.uri)) {
    throw new Error("Gabroo cached audio failed its playback integrity check.");
  }
  const reportError = (error: Error) => {
    try { input.onError?.(error); } catch { /* Consumer callbacks must not escape native status dispatch. */ }
  };

  const clock = new GabrooNativePlaybackClock(input.gate);
  let sound: GabrooExpoAvSoundLike | null = null;
  let started = false;
  let closed = false;
  const createSound = input.createSound ?? (async (source, initialStatus, onPlaybackStatusUpdate) => {
    // Load the native module only when the production adapter is actually used.
    const { Audio } = await import("expo-av");
    return Audio.Sound.createAsync(source, initialStatus, onPlaybackStatusUpdate);
  });

  const stopClock = () => {
    if (closed) return;
    closed = true;
    clock.stop();
  };

  const abortPlayback = () => {
    stopClock();
    if (sound) {
      const current = sound;
      sound = null;
      void current.unloadAsync().catch(() => undefined);
    }
  };
  input.signal?.addEventListener("abort", abortPlayback, { once: true });

  try {
    const created = await createSound(
      { uri: cachedAudio.uri },
      { shouldPlay: false, progressUpdateIntervalMillis: 40 },
      status => {
        if (closed) return;
        if (!status.isLoaded) {
          if (started) stopClock();
          if ("error" in status && status.error) reportError(new Error(status.error));
          return;
        }
        if (status.didJustFinish) { stopClock(); return; }
        // Android may report buffering while playback is nominally active
        // (network stalls, decoder starvation, route changes). Never animate
        // from a stale playhead during that interval; resume on a fresh native tick.
        if (status.isBuffering) {
          if (started) { clock.stop(); started = false; }
          return;
        }
        if (!status.isPlaying) {
          if (started) { clock.stop(); started = false; }
          return;
        }
        if (!started) clock.begin(identity);
        started = true;
        const snapshot = toGabrooNativePlayerSnapshot(status, identity);
        if (!snapshot || !clock.tick(snapshot, validatedTimeline)) stopClock();
      },
    );
    sound = created.sound;
    if (closed || input.signal?.aborted) {
      await sound.unloadAsync().catch(() => undefined);
      sound = null;
    }
  } catch (reason) {
    stopClock();
    input.signal?.removeEventListener("abort", abortPlayback);
    throw reason instanceof Error ? reason : new Error("Could not load Gabroo audio.");
  }

  const requireSound = () => {
    if (!sound || closed) throw new Error("Gabroo audio playback is no longer active.");
    return sound;
  };

  return {
    async play() {
      try { await requireSound().playAsync(); }
      catch (reason) {
        if (started) { clock.stop(); started = false; }
        const error = reason instanceof Error ? reason : new Error("Gabroo audio playback failed.");
        reportError(error);
        throw error;
      }
    },
    async pause() {
      if (!sound || closed) return;
      await sound.pauseAsync();
      if (started) { clock.stop(); started = false; }
    },
    async stop() {
      if (!sound || closed) return;
      stopClock();
      input.signal?.removeEventListener("abort", abortPlayback);
      await sound.stopAsync();
    },
    async unload() {
      if (!sound) return;
      stopClock();
      input.signal?.removeEventListener("abort", abortPlayback);
      const current = sound;
      sound = null;
      await current.unloadAsync();
    },
  };
}
