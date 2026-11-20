export const GABROO_PCM_SAMPLE_RATE = 16_000;
export const GABROO_PCM_FRAME_DURATION_MS = 100;
export const GABROO_PCM_FRAME_BYTES =
  (GABROO_PCM_SAMPLE_RATE * GABROO_PCM_FRAME_DURATION_MS) / 1_000 * 2;

export type GabrooNativeAudioBuffer = {
  data: ArrayBuffer;
  encoding: "float32" | "int16";
  sampleRate: number;
  channels: number;
};

/**
 * Convert a native interleaved PCM buffer into the server's required
 * 16 kHz, mono, signed 16-bit little-endian PCM format.
 *
 * Resampling is linear and intentionally isolated here so the eventual
 * native capture adapter can be tested without a microphone or device.
 */
export function normalizeGabrooPcm16Mono(input: GabrooNativeAudioBuffer): Uint8Array {
  if (!(input.data instanceof ArrayBuffer) || input.data.byteLength === 0) {
    throw new Error("Gabroo audio buffer is empty.");
  }
  if (input.encoding !== "float32" && input.encoding !== "int16") {
    throw new Error("Gabroo audio encoding is unsupported.");
  }
  if (!Number.isSafeInteger(input.sampleRate) || input.sampleRate < 8_000 || input.sampleRate > 192_000) {
    throw new Error("Gabroo audio sample rate is unsupported.");
  }
  if (!Number.isSafeInteger(input.channels) || input.channels < 1 || input.channels > 2) {
    throw new Error("Gabroo audio must contain one or two channels.");
  }

  const bytesPerSample = input.encoding === "float32" ? 4 : 2;
  const frameBytes = bytesPerSample * input.channels;
  if (input.data.byteLength % frameBytes !== 0) {
    throw new Error("Gabroo audio buffer ends in an incomplete sample frame.");
  }

  const sourceFrames = input.data.byteLength / frameBytes;
  const source = new Float32Array(sourceFrames);
  const view = new DataView(input.data);

  for (let frame = 0; frame < sourceFrames; frame += 1) {
    let mono = 0;
    for (let channel = 0; channel < input.channels; channel += 1) {
      const offset = (frame * input.channels + channel) * bytesPerSample;
      const sample = input.encoding === "float32"
        ? view.getFloat32(offset, true)
        : (() => { const value = view.getInt16(offset, true); return value < 0 ? value / 32_768 : value / 32_767; })();
      if (!Number.isFinite(sample)) {
        throw new Error("Gabroo audio contains a non-finite sample.");
      }
      mono += Math.max(-1, Math.min(1, sample));
    }
    source[frame] = mono / input.channels;
  }

  if (sourceFrames === 0) return new Uint8Array();
  const targetFrames = Math.max(1, Math.round(sourceFrames * GABROO_PCM_SAMPLE_RATE / input.sampleRate));
  const output = new Uint8Array(targetFrames * 2);
  const outputView = new DataView(output.buffer);

  for (let index = 0; index < targetFrames; index += 1) {
    const sourcePosition = index * input.sampleRate / GABROO_PCM_SAMPLE_RATE;
    const left = Math.min(Math.floor(sourcePosition), sourceFrames - 1);
    const right = Math.min(left + 1, sourceFrames - 1);
    const fraction = Math.min(1, sourcePosition - left);
    const sample = source[left] + (source[right] - source[left]) * fraction;
    const pcm = sample < 0
      ? Math.round(sample * 32_768)
      : Math.round(sample * 32_767);
    outputView.setInt16(index * 2, pcm, true);
  }

  return output;
}

/** Split normalized PCM into transport-sized frames without copying beyond each frame. */
export function chunkGabrooPcm16(
  pcm: Uint8Array,
  frameBytes = GABROO_PCM_FRAME_BYTES,
): Uint8Array[] {
  if (pcm.byteLength === 0) return [];
  if (!Number.isSafeInteger(frameBytes) || frameBytes < 2 || frameBytes % 2 !== 0) {
    throw new Error("Gabroo PCM frame size must be a positive even number.");
  }
  const chunks: Uint8Array[] = [];
  for (let offset = 0; offset < pcm.byteLength; offset += frameBytes) {
    chunks.push(pcm.slice(offset, Math.min(offset + frameBytes, pcm.byteLength)));
  }
  return chunks;
}
