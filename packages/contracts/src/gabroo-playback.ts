/**
 * Provider-neutral lifecycle for Gabroo's actual speech playback.
 *
 * This is deliberately separate from GabrooConversationState: Expo Speech
 * exposes completion/stop callbacks but not a trustworthy audio clock or
 * viseme timeline. This contract therefore never fabricates avatar timing.
 */
export type GabrooPlaybackPhase = "idle" | "speaking" | "interrupted" | "failed";

export interface GabrooPlaybackState {
 phase: GabrooPlaybackPhase;
 playback_id: string | null;
 completed_segments: number;
 error: string | null;
}

export type GabrooPlaybackEvent =
 | { type: "started"; playback_id: string }
 | { type: "segment_completed"; playback_id: string }
 | { type: "finished"; playback_id: string }
 | { type: "interrupted"; playback_id: string }
 | { type: "failed"; playback_id: string; reason: string }
 | { type: "reset" };

export const initialGabrooPlaybackState: GabrooPlaybackState = {
 phase: "idle",
 playback_id: null,
 completed_segments: 0,
 error: null
};

/**
 * Stale callbacks from an older utterance are ignored. A new playback may
 * start from any terminal phase, but never over an active playback.
 */
export function reduceGabrooPlayback(
 state: GabrooPlaybackState,
 event: GabrooPlaybackEvent
): GabrooPlaybackState {
 if (event.type === "reset") return initialGabrooPlaybackState;
 if (event.type === "started") {
  if (!event.playback_id.trim()) throw new Error("A playback ID is required.");
  if (state.phase === "speaking") throw new Error("A Gabroo playback is already active.");
  return { phase: "speaking", playback_id: event.playback_id, completed_segments: 0, error: null };
 }
 if (event.playback_id !== state.playback_id || state.phase !== "speaking") return state;
 switch (event.type) {
  case "segment_completed":
   return { ...state, completed_segments: state.completed_segments + 1 };
  case "finished":
   return { phase: "idle", playback_id: null, completed_segments: state.completed_segments, error: null };
  case "interrupted":
   return { phase: "interrupted", playback_id: null, completed_segments: state.completed_segments, error: null };
  case "failed":
   return { phase: "failed", playback_id: null, completed_segments: state.completed_segments, error: event.reason.slice(0, 300) };
 }
}
