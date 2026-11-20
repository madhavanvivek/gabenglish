import {describe,it,expect} from "vitest";
import {extractResponseEvidence} from "./placement-evidence.js";

describe("placement response evidence extraction",()=>{
  it("records observable signals without claiming a proficiency score",()=>{
    const result=extractResponseEvidence("why","I visited my friend last weekend. We went shopping because we needed some things. It was a lovely day together.");
    expect(result.metrics.wordCount).toBeGreaterThan(10);
    expect(result.metrics.uniqueWordCount).toBeGreaterThan(0);
    expect(result.metrics.uniqueWordCount).toBeLessThanOrEqual(result.metrics.wordCount);
    expect(result.metrics.uniqueWordRatio).toBeGreaterThan(0);
    expect(result.metrics.uniqueWordRatio).toBeLessThanOrEqual(1);
    expect(result.metrics.averageWordsPerSentence).toBeGreaterThan(0);
    expect(result.metrics.hasPastReference).toBe(true);
    expect(result.metrics.hasReasoningMarker).toBe(true);
    expect(result.observations).toContain("One or more discourse connectors were used.");
    expect(result.limitations).toContain("Text does not provide evidence of pronunciation or spoken fluency.");
    expect(result).not.toHaveProperty("score");
    expect(result).not.toHaveProperty("stage");
    expect(result.observedSkills).toEqual([]);
    expect(result.sampleSize).toBe("extended");
    expect(result).not.toHaveProperty("confidence");
  });

  it("marks brief answers by sample size, not proficiency confidence",()=>{
    const result=extractResponseEvidence("intro","I'm fine.");
    expect(result.sampleSize).toBe("brief");
    expect(result.observations).toContain("The response is brief; more evidence is needed.");
  });

  it("keeps voice transcript limitations explicit",()=>{
    const result=extractResponseEvidence("voice","I enjoy learning English.", "voice_transcript");
    expect(result.limitations).toContain("Transcript text cannot establish pronunciation quality.");
    expect(result.observedSkills).toEqual([]);
  });

  it("reports vocabulary repetition descriptively without scoring the learner",()=>{
    const result=extractResponseEvidence("repeat","I like music and I like reading. Music makes me happy.");
    expect(result.metrics.wordCount).toBe(11);
    expect(result.metrics.uniqueWordCount).toBe(8);
    expect(result.metrics.uniqueWordRatio).toBe(0.73);
    expect(result.metrics.averageWordsPerSentence).toBe(5.5);
    expect(result).not.toHaveProperty("score");
  });

  it("flags a small set of high-confidence grammar patterns without grading proficiency",()=>{
    const result=extractResponseEvidence("grammar","He go to work every day. Yesterday I did went home. I am study English.");
    expect(result.grammarObservations).toEqual(expect.arrayContaining([
      expect.objectContaining({category:"subject_verb_agreement",example:"He go"}),
      expect.objectContaining({category:"past_tense_form",example:"did went"}),
      expect.objectContaining({category:"verb_form",example:"I am study"})
    ]));
    expect(result.grammarObservations.length).toBeLessThanOrEqual(3);
    expect(result.observations).toContain("A few grammar patterns may be worth reviewing; automated checks can miss context and valid alternatives.");
    expect(result).not.toHaveProperty("score");
    const modal=extractResponseEvidence("modal","I can speaks English.");
    expect(modal.grammarObservations).toEqual([expect.objectContaining({example:"can speaks",suggestion:"can speak"})]);
  });

  it("does not flag correct common agreement and verb forms",()=>{
    const result=extractResponseEvidence("correct","She goes to work. They have lunch. I am studying. Yesterday I went home.");
    expect(result.grammarObservations).toEqual([]);
  });

  it("provides specific, cautious correction examples for auxiliary and agreement patterns",()=>{
    const result=extractResponseEvidence("grammar","They is ready. She study every day. He doesn't goes there. I can speaks English.");
    expect(result.grammarObservations).toEqual(expect.arrayContaining([
      expect.objectContaining({category:"subject_verb_agreement",example:"They is",suggestion:"They are"}),
      expect.objectContaining({category:"subject_verb_agreement",example:"She study",suggestion:"She studies"}),
      expect.objectContaining({category:"verb_form",example:"He doesn't goes",suggestion:"He doesn't go"})
    ]));
    expect(result.grammarObservations.every(item=>item.note.length>0&&item.suggestion.length>0)).toBe(true);
    expect(result).not.toHaveProperty("score");
  });

  it("suggests a natural simple-present form for stative verbs after am",()=>{
    const result=extractResponseEvidence("verb","I am agree with you.");
    expect(result.grammarObservations).toEqual([
      expect.objectContaining({example:"I am agree",suggestion:"I agree"})
    ]);
  });

  it("counts Unicode Malayalam words",()=>{
    const result=extractResponseEvidence("ml","എന്റെ പേര് അനു ആണ്. ഞാൻ കോഴിക്കോട് താമസിക്കുന്നു.");
    expect(result.metrics.wordCount).toBeGreaterThan(3);
  });
});
