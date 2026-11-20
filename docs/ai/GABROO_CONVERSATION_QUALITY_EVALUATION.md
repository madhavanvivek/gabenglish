# Gabroo Conversation Quality Evaluation

## Purpose

This evaluation layer checks observable conversation behaviours that support the product goal: Gabroo may contribute knowledge, but the learner should do most of the speaking, explaining and idea-building.

The API helper `apps/api/src/gabroo-conversation-quality.ts` provides deterministic signals for automated fixtures and offline QA. It is deliberately a heuristic checklist, not a semantic model judge.

## Signals

| Signal | What it checks | Why it matters |
|---|---|---|
| Concision | Reply is no longer than 90 meaningful words | Avoids turning a conversation into a lecture |
| Question discipline | At most one question mark | Reduces interrogation and stacked questions |
| Invitation | A recognisable open invitation to elaborate | Gives the learner a clear next speaking opportunity |
| Lexical connection | Reply reuses at least one meaningful learner keyword | Basic evidence that the response stays connected to the learner's point |
| Prompt variety | Avoids a bare, generic "Tell me more" prompt | Encourages specific, useful follow-ups |

A short learner message without an invitation is flagged for review. The evaluator returns a score, individual checks, flags and simple evidence counts.

## Important limitations

- Keyword overlap is not semantic understanding. A response can share a word and still misunderstand the learner.
- Invitation phrase detection is intentionally small and will miss valid phrasings in English or Malayalam.
- Question marks are not a perfect count of questions in every language or writing style.
- A short answer may be a complete answer, a direct question, a boundary or a sign that the learner wants to pause. The score must never force a follow-up or override learner intent. Direct learner questions are excluded from the short-answer invitation flag; answer them first and respect a natural stopping point.
- The score is not a learner proficiency, fluency, confidence or pronunciation score.
- Do not use this heuristic to block a response, penalise a learner, change subscription access or make placement decisions.
- Learner messages and replies are processed in memory only by this helper. Do not persist evaluation text or add transcript logging for scoring.

## Human review protocol

For release evaluation, sample opt-in, consented test conversations across free-flow, topic practice, role-play, vocabulary and correction modes. Review:

1. Did Gabroo answer a direct question before asking for more?
2. Did he acknowledge the learner's actual idea?
3. Did any fact or example help the learner continue speaking?
4. Did he invite elaboration without repeating the same prompt?
5. Did he correct naturally and proportionately?
6. Did the learner have a comfortable opportunity to decline, pause or change topic?

Reviewers should inspect full turns and context, not just the numeric score. Include Malayalam-English code-switching and a range of learner response lengths. Use synthetic fixtures by default; use real learner data only with explicit consent and appropriate retention controls.

## Release gate

The helper's unit tests must pass, and human review must show that Gabroo is a conversation partner rather than a presenter. This helper alone does not establish production readiness or prove that learners speak more in live sessions.
