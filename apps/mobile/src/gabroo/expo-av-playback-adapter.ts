import { Audio } from "expo-av";
import {
  GabrooNativePlaybackClock,
  type GabrooNativePlayerSnapshot,
  type GabrooPlaybackIdentity,
  isGabrooPlaybackIdentityValid,
} from "./native-playback-clock";
import type { GabrooAvatarRendererGate } from "./avatar-renderer-gate";

import { toGabrooNativePlayerSnapshot } from "./expo-av-playback-status";

export interface GabrooExpoAvPlaybackHandle {
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  unload(): Promise<void>;
}

/**
 * Connects Expo AV's native playback-status callback to the host-neutral
 * avatar clock. Audio/alignment hashes and IDs must come from trusted,
 * server-validated metadata; this adapter does not calculate or assert them.
 *
 * The caller must only pass a timeline returned by the trusted alignment
 * service for this exact audio asset.
 */
export async function createGabrooExpoAvPlayback(input: {
  uri: string;
  identity: GabrooPlaybackIdentity;
  timeline: unknown;
  gate: GabrooAvatarRendererGate;
  onError?: (error: Error) => void;
}): Promise<GabrooExpoAvPlaybackHandle> {
  if (typeof input.uri !== "string" || !input.uri.trim()) {
    throw new Error("A playable Gabroo audio URI is required.");
  }
  if (!isGabrooPlaybackIdentityValid(input.identity)) {
    throw new Error("Trusted Gabroo audio and alignment metadata are required.");
  }
  const reportError = (error: Error) => {
    try { input.onError?.(error); } catch { /* Consumer callbacks must not escape native status dispatch. */ }
  };

  const clock = new GabrooNativePlaybackClock(input.gate);
  let sound: Audio.Sound | null = null;
  let started = false;
  let closed = false;

  const stopClock = () => {
    if (closed) return;
    closed = true;
    clock.stop();
  };

  try {
    const created = await Audio.Sound.createAsync(
      { uri: input.uri },
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
        if (!started) clock.begin(input.identity);
        started = true;
        const snapshot = toGabrooNativePlayerSnapshot(status, input.identity);
        if (!snapshot || !clock.tick(snapshot, input.timeline)) stopClock();
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
