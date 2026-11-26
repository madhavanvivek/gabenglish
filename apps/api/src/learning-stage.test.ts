import {describe, expect, it} from "vitest";
import {evaluateLearningStage} from "./learning-stage.js";

describe("evidence-based learning stage progression", () => {
  it("does not change stage with fewer than eight attempts", () => {
    expect(evaluateLearningStage(2, [true, true, true, true, true, true, true])).toMatchObject({
      nextStage: 2, outcome: "insufficient_evidence", sampleSize: 7,
    });
  });

  it("promotes after at least seven of eight recent exercises are correct", () => {
    expect(evaluateLearningStage(2, [true, true, true, true, true, true, true, false])).toMatchObject({
      nextStage: 3, outcome: "promote", correctCount: 7, accuracy: 0.875,
    });
  });

  it("reduces difficulty only after eight attempts with at most two correct", () => {
    expect(evaluateLearningStage(3, [false, false, false, false, false, false, true, true])).toMatchObject({
      nextStage: 2, outcome: "demote", correctCount: 2,
    });
  });

  it("holds stage when evidence is mixed", () => {
    expect(evaluateLearningStage(3, [true, true, true, true, false, false, false, false])).toMatchObject({
      nextStage: 3, outcome: "hold",
    });
  });

  it("never promotes beyond stage five or demotes below stage one", () => {
    expect(evaluateLearningStage(5, Array(8).fill(true))).toMatchObject({nextStage: 5, outcome: "hold"});
    expect(evaluateLearningStage(1, Array(8).fill(false))).toMatchObject({nextStage: 1, outcome: "hold"});
  });

  it("uses only the eight most recent outcomes supplied", () => {
    expect(evaluateLearningStage(1, [true, true, true, true, true, true, true, true, false, false])).toMatchObject({
      nextStage: 2, sampleSize: 8,
    });
  });
});
