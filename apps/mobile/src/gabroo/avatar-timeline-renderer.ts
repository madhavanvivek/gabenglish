import {
  gabrooSpeechTimelineSchema,
  sampleGabrooAvatarFrame,
  type GabrooSpeechTimeline,
} from "@gabenglish/contracts";
import {
  type PlaybackProof,
  type SampledAvatarFrame,
  GabrooAvatarRendererGate,
} from "./avatar-renderer-gate";
import { mapGabrooAvatarFrame } from "./avatar-frame-mapper";

/**
 * Compose the shared, audio-bound Gabroo timeline sampler with the guarded
 * renderer. The input is parsed again at this boundary because it may have
 * crossed an API/cache boundary after its original validation.
 */
export function renderGabrooTimelineFrame(
  gate: GabrooAvatarRendererGate,
  proof: PlaybackProof,
  untrustedTimeline: unknown,
): boolean {
  const proofGeneration = typeof proof === "object" && proof !== null ? proof.generation : undefined;
  if (typeof proof !== "object" || proof === null || typeof proof.audioId !== "string") {
    if (Number.isSafeInteger(proofGeneration)) gate.stopPlayback(proofGeneration);
    return false;
  }
  const parsed = gabrooSpeechTimelineSchema.safeParse(untrustedTimeline);
  if (!parsed.success
    || parsed.data.audio_id !== proof.audioId
    || parsed.data.duration_ms !== proof.measuredDurationMs) {
    if (Number.isSafeInteger(proofGeneration)) gate.stopPlayback(proofGeneration);
    return false;
  }

  const timeline: GabrooSpeechTimeline = parsed.data;
  return gate.render(proof, (positionMs): SampledAvatarFrame =>
    mapGabrooAvatarFrame(sampleGabrooAvatarFrame(timeline, positionMs))
  );
}
