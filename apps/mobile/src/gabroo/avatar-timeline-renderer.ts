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
  const parsed = gabrooSpeechTimelineSchema.safeParse(untrustedTimeline);
  if (!parsed.success
    || parsed.data.audio_id !== proof.audioId
    || parsed.data.duration_ms !== proof.measuredDurationMs) {
    gate.stopPlayback();
    return false;
  }

  const timeline: GabrooSpeechTimeline = parsed.data;
  return gate.render(proof, (positionMs): SampledAvatarFrame =>
    mapGabrooAvatarFrame(sampleGabrooAvatarFrame(timeline, positionMs))
  );
}
