import { Audio } from "expo-av";
import {
  GabrooNativePlaybackClock,
} from "./native-playback-clock";
import type { GabrooAvatarRendererGate } from "./avatar-renderer-gate";

import { isGabrooPlayableAudioUri, toGabrooNativePlayerSnapshot } from "./expo-av-playback-status";
import { prepareGabrooPlaybackAsset } from "./playback-asset-validation";

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
  createSound?: typeof Audio.Sound.createAsync;
}): Promise<GabrooExpoAvPlaybackHandle> {
  const prepared = prepareGabrooPlaybackAsset(input.asset, input.nowMs);
  if (!isGabrooPlayableAudioUri(prepared.uri)) {
    throw new Error("A playable Gabroo audio URI is required.");
  }
  const identity = prepared.identity;
  const validatedTimeline = prepared.timeline;
  const reportError = (error: Error) => {
    try { input.onError?.(error); } catch { /* Consumer callbacks must not escape native status dispatch. */ }
  };

  const clock = new GabrooNativePlaybackClock(input.gate);
  let sound: Audio.Sound | null = null;
  let started = false;
  let closed = false;
  const createSound = input.createSound ?? Audio.Sound.createAsync;

  const stopClock = () => {
    if (closed) return;
    closed = true;
    clock.stop();
  };

  try {
    const created = await createSound(
      { uri: prepared.uri },
      { shouldPlay: false, progressUpdateIntervalMillis: 40 },
      status => {
        if (closed) return;
        if (!status.isLoaded) {
          if (started) stopClock();
          if ("error" in status && status.error) reportError(new Error(status.error));
          return;
        }
        if (status.didJustFinish) { stopClock(); return; }
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
    if (closed) await sound.unloadAsync().catch(() => undefined);
  } catch (reason) {
    stopClock();
    throw reason instanceof Error ? reason : new Error("Could not load Gabroo audio.");
  }

  const requireSound = () => {
    if (!sound || closed) throw new Error("Gabroo audio playback is no longer active.");
    return sound;
  };

  return {
    async play() { await requireSound().playAsync(); },
    async pause() {
      if (!sound || closed) return;
      await sound.pauseAsync();
      if (started) { clock.stop(); started = false; }
    },
    async stop() {
      if (!sound || closed) return;
      stopClock();
      await sound.stopAsync();
    },
    async unload() {
      if (!sound) return;
      stopClock();
      const current = sound;
      sound = null;
      await current.unloadAsync();
    },
  };
}
