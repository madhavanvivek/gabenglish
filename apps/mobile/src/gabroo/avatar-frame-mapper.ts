import type { GabrooAvatarFrame } from "@gabenglish/contracts";
import type { SampledAvatarFrame } from "./avatar-renderer-gate";

/**
 * Explicit, deterministic bridge from the shared tutor timeline vocabulary to
 * the renderer gate's deliberately small control vocabulary. These are
 * semantic fallbacks, not phoneme inference or a claim about a particular rig.
 */
const visemeMap = {
  neutral: "neutral",
  closed_lips: "mbp",
  lip_teeth: "fv",
  tongue_teeth: "th",
  open_wide: "aa",
  open_mid: "ee",
  open_round: "oh",
  narrow_round: "ou",
  spread: "ih",
} as const satisfies Record<GabrooAvatarFrame["viseme"]["shape"], SampledAvatarFrame["viseme"]>;

const expressionMap = {
  neutral: "neutral",
  warm_smile: "friendly",
  encouraging: "encouraging",
  playful: "curious",
  thinking: "thinking",
  surprised: "curious",
  concerned: "thinking",
  laughing: "friendly",
} as const satisfies Record<GabrooAvatarFrame["expression"], SampledAvatarFrame["expression"]>;

const gestureMap = {
  small_wave: "open_palm",
  gentle_nod: "small_nod",
  head_tilt: "small_nod",
  open_palm: "open_palm",
  thumbs_up: "celebrate",
  subtle_shrug: "open_palm",
} as const satisfies Record<Exclude<GabrooAvatarFrame["gesture"], null>, SampledAvatarFrame["gesture"]>;

/** Map a validated shared-contract sample; no text or wall-clock input is accepted. */
export function mapGabrooAvatarFrame(frame: GabrooAvatarFrame): SampledAvatarFrame {
  return {
    viseme: visemeMap[frame.viseme.shape],
    visemeWeight: frame.viseme.shape === "neutral" ? 0 : frame.viseme.weight,
    expression: expressionMap[frame.expression],
    expressionWeight: frame.expression === "neutral" ? 0 : frame.expressionWeight,
    gesture: frame.gesture === null ? "idle" : gestureMap[frame.gesture],
    gestureWeight: frame.gesture === null ? 0 : frame.gestureWeight,
  };
}
