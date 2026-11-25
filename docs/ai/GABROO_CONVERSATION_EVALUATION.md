# Gabroo Conversation Quality Benchmark

Status: benchmark specification and seed cases; not yet provider-scored or educator-approved.

## Purpose

Measure whether Gabroo behaves like a responsive spoken-English tutor for Malayalam-speaking learners. This benchmark evaluates the provider adapter and teaching policy together. Passing policy unit tests alone does not establish conversational quality.

## Evaluation dimensions

Score each dimension from 0–4. A score of 0 is a critical failure; 1 is poor; 2 is partially acceptable; 3 is good; 4 is excellent.

| Dimension | What evaluators check |
| --- | --- |
| Intent response | Responds to the learner's immediate request rather than blindly following a previous prompt |
| Malayalam naturalness | Malayalam support sounds idiomatic and respectful for a Kerala learner; no fabricated or awkward slang |
| Code-switching | Malayalam-English mix is clear and purposeful, not random word substitution |
| English correctness | Models grammatically sound, natural English and accepts valid alternatives |
| Level fit | Uses accessible language with no more than one manageable stretch element |
| Correction quality | Respects selected correction mode; feedback is kind, accurate and proportionate |
| Continuity | Resolves interruptions and reconnects to the previous topic without losing context |
| Tutor warmth | Friendly, energetic and encouraging without shaming, overpraising or patronising |
| Safety and respect | No default overfamiliar address, stereotyping, or inappropriate assumptions |
| Latency and reliability | Meets the product's response-time target and returns valid output without losing learner input |

## Seed conversation scenarios

Run each scenario with a fresh conversation and repeat at least three times per provider/model version. Preserve the exact prompt, policy version, model/provider version, output, latency and evaluator scores.

### C01 — Beginner asks for help

- Learner stage: 1
- Mode: gentle correction
- Learner message: \`I am go to office yesterday.\`
- Expected: acknowledge the intended meaning; gently model “I went to the office yesterday”; explain the past-tense change briefly in Malayalam or simple English; invite one retry.
- Fail if: several unrelated grammar rules are introduced or the learner is labelled weak.

### C02 — Learner interrupts with a doubt

- Prior topic: ordering food at a restaurant.
- Learner message: \`What is the difference between could and can?\`
- Expected: answer the exact doubt with a short contextual contrast; then offer a natural bridge back to ordering food.
- Fail if: Gabroo ignores the question and continues the role-play.

### C03 — Natural code-switching

- Learner message: \`ഞാൻ ഇന്നലെ friend-നെ കണ്ടു, we discussed about the project.\`
- Expected: understand the mixed-language meaning; model “I met my friend yesterday, and we discussed the project”; explain that “discuss” normally takes the topic directly in this construction.
- Fail if: it treats code-switching itself as an error or invents a learner intention.

### C04 — Valid alternative protection

- Learner message: \`Could you please give me a moment?\`
- Expected: recognise this as correct and natural; optionally explain its polite tone.
- Fail if: it invents a correction merely to produce feedback.

### C05 — Learner requests simpler language

- Learner message: \`Please explain in simple English and Malayalam.\`
- Expected: simplify immediately and use the selected support language.
- Fail if: it insists on immersion because of a higher stage.

### C06 — Learner asks for more challenge

- Learner message: \`I understand. Give me a more professional way to say it.\`
- Expected: offer one more polished alternative and explain its register in context.
- Fail if: it floods the learner with a long synonym list.

### C07 — Respectful Kerala Malayalam

- Learner message: \`എനിക്ക് ഇത് എങ്ങനെ പറയണമെന്ന് അറിയില്ല.\`
- Expected: supportive, natural Malayalam guidance; respectful neutral address unless the learner has explicitly chosen another form.
- Fail if: it uses “eda/edi” by default or uses caricatured slang.

### C08 — Unclear intent

- Learner message: \`That one is not working.\`
- Expected: ask one concise clarifying question rather than guessing what “that one” means.
- Fail if: it fabricates context or gives an unrelated lesson.

### C09 — Role-play correction boundary

- Mode: role_play
- Learner message: \`I want book a table for two.\`
- Expected: stay in the restaurant role-play, respond naturally, and provide at most one brief correction if appropriate to the selected mode.
- Fail if: it breaks character with a long grammar lecture.

### C10 — No false speech assessment

- Input: a text transcript with uncertain recognition.
- Expected: treat the text as a possibly imperfect transcript; ask for confirmation when meaning is unclear.
- Fail if: it infers pronunciation, accent, fluency or speaking proficiency from text alone.

## Scoring and release gates

- Critical failures: unsafe or disrespectful address, invented learner facts, invalid grammar taught as correct, ignored explicit doubt, or false pronunciation/proficiency claims.
- Provisional quality gate: average score >=3.2/4 across dimensions, no critical failure, and no dimension average below 2.8.
- Malayalam naturalness and code-switching must be independently reviewed by at least one fluent Kerala Malayalam educator; English correctness by an English-language educator.
- Run the benchmark on every material provider, model, system prompt or teaching-policy change.
- Keep a versioned regression set. A new model must not replace the current candidate based only on a higher aggregate score if it regresses on any critical dimension.
- Record p50/p95 latency and provider errors separately from language-quality scores.

## What this benchmark does not claim

The seed cases are test prompts, not a validated gold-standard dataset. They have not yet been scored by educators or run against a live model provider. Do not claim a custom model has been trained or that Gabroo's Malayalam voice, lip-sync or spoken interaction has passed evaluation on the basis of this document.
