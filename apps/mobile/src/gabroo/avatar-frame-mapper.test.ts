import { describe, expect, it } from "vitest";
import type { GabrooAvatarFrame } from "@gabenglish/contracts";
import { mapGabrooAvatarFrame } from "./avatar-frame-mapper";

const frame = (overrides: Partial<GabrooAvatarFrame> = {}): GabrooAvatarFrame => ({
  viseme: { shape: "neutral", weight: 0 },
  expression: "neutral",
  expressionWeight: 0,
  gesture: null,
  gestureWeight: 0,
  ...overrides,
});

describe("mapGabrooAvatarFrame", () => {
  it("maps all canonical visemes explicitly and suppresses neutral mouth weight", () => {
    const cases = [
      ["neutral", "neutral", 0],
      ["closed_lips", "mbp", 0.6],
      ["lip_teeth", "fv", 0.6],
      ["tongue_teeth", "th", 0.6],
      ["open_wide", "aa", 0.6],
      ["open_mid", "ee", 0.6],
      ["open_round", "oh", 0.6],
      ["narrow_round", "ou", 0.6],
      ["spread", "ih", 0.6],
    ] as const;
    for (const [shape, expected, weight] of cases) {
      expect(mapGabrooAvatarFrame(frame({ viseme: { shape, weight: 0.6 } }))).toMatchObject({
        viseme: expected,
        visemeWeight: weight,
      });
    }
  });

  it("maps all expressions and gesture cues to allow-listed rig controls", () => {
    const expressions = {
      neutral: "neutral",
      warm_smile: "friendly",
      encouraging: "encouraging",
      playful: "curious",
      thinking: "thinking",
      surprised: "curious",
      concerned: "thinking",
      laughing: "friendly",
    } as const;
    for (const [source, expected] of Object.entries(expressions)) {
      expect(mapGabrooAvatarFrame(frame({ expression: source as keyof typeof expressions })).expression).toBe(expected);
    }

    const gestures = {
      small_wave: "open_palm",
      gentle_nod: "small_nod",
      head_tilt: "small_nod",
      open_palm: "open_palm",
      thumbs_up: "celebrate",
      subtle_shrug: "open_palm",
    } as const;
    for (const [source, expected] of Object.entries(gestures)) {
      expect(mapGabrooAvatarFrame(frame({ gesture: source as keyof typeof gestures })).gesture).toBe(expected);
    }
    expect(mapGabrooAvatarFrame(frame()).gesture).toBe("idle");
  });

  it("preserves the validated viseme weight and maps complete frame controls", () => {
    expect(mapGabrooAvatarFrame(frame({
      viseme: { shape: "closed_lips", weight: 0.72 },
      expression: "warm_smile",
      gesture: "gentle_nod",
    }))).toEqual({
      viseme: "mbp",
      visemeWeight: 0.72,
      expression: "friendly",
      gesture: "small_nod",
    });
  });
});
