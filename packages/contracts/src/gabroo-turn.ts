/**
 * Text-turn lifecycle for the learner-to-Gabroo request/response boundary.
 *
 * This is intentionally independent from playback and avatar timelines:
 * receiving assistant text does not imply that audio has started.
 */
export type GabrooTurnPhase = "idle" | "thinking" | "response_ready" | "failed";

export interface GabrooTurnState {
  phase: GabrooTurnPhase;
  turn_id: string | null;
  error: string | null;
}

export type GabrooTurnEvent =
  | { type: "submitted"; turn_id: string }
  | { type: "response_received"; turn_id: string }
  | { type: "failed"; turn_id: string; reason: string }
  | { type: "dismissed"; turn_id: string }
  | { type: "reset" };

export const initialGabrooTurnState: GabrooTurnState = {
  phase: "idle",
  turn_id: null,
  error: null
};

/**
 * A late network response cannot overwrite a newer learner turn.
 * A submitted turn may only complete or fail while it is still current.
 */
export function reduceGabrooTurn(
  state: GabrooTurnState,
  event: GabrooTurnEvent
): GabrooTurnState {
  if (event.type === "reset") return initialGabrooTurnState;

  if (event.type === "dismissed") {
    return state.turn_id === event.turn_id ? initialGabrooTurnState : state;
  }

  if (event.type === "submitted") {
    if (!event.turn_id.trim()) throw new Error("A turn ID is required.");
    return { phase: "thinking", turn_id: event.turn_id, error: null };
  }

  if (state.phase !== "thinking" || state.turn_id !== event.turn_id) {
    return state;
  }

  if (event.type === "response_received") {
    return { phase: "response_ready", turn_id: event.turn_id, error: null };
  }

  return {
    phase: "failed",
    turn_id: event.turn_id,
    error: event.reason.slice(0, 300)
  };
}
