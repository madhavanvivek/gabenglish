# Gabroo Conversational Placement Assessment

Version 1.0 — product direction approved for foundation implementation.

## 1. Purpose

The first meaningful Gabenglish experience is a friendly, adaptive conversation with Gabroo. It identifies the learner's practical English ability and recommends the most useful starting stage. It is an internal Gabenglish placement assessment, not a formal CEFR examination or certification.

The learner may accept the recommendation, choose to start from the beginning, choose another available stage, or ask for a further challenge. The recommendation never locks the learner into a path.

## 2. Experience principles

- A conversation, not a conventional multiple-choice exam.
- Gabroo explains the purpose, process and microphone use before asking for permission or recording speech.
- Begin with approachable questions and increase complexity only when the learner's responses support it.
- Adapt each next prompt to demonstrated ability and skills that remain uncertain.
- If the learner struggles, simplify, rephrase or offer limited support without embarrassment.
- Do not waste time testing skills already demonstrated consistently.
- Keep the learner informed about progress without exposing technical scoring or making the experience feel like an exam.
- Finish with a clear report and a personalised spoken explanation from Gabroo.
- Respect learner choice and never pressure the learner to accept the recommended level.

## 3. Opening and consent

Gabroo opens in the learner's selected support language, initially Malayalam where selected. It explains that this is a relaxed conversation to understand the learner's current English, that mistakes are expected, and that the outcome is a suggested learning starting point.

Voice assessment requires explicit microphone permission and a clear explanation of what is captured, processed, retained and deleted. Text-only participation may be offered, but text cannot be used to claim verified speaking fluency or pronunciation ability.

## 4. Adaptive conversation model

The assessment uses hidden difficulty bands rather than presenting five fixed tests.

1. **Basic communication:** greetings, introductions, familiar people and places, simple needs and everyday vocabulary.
2. **Everyday conversation:** routines, preferences, descriptions, simple past and future events.
3. **Independent expression:** narrating experiences, explaining reasons, describing problems and giving connected answers.
4. **Advanced conversation:** opinions, comparisons, hypothetical situations, nuanced explanations and unfamiliar topics.
5. **Expert communication:** professional or abstract discussion, persuasion, argument, spontaneous follow-ups and nuanced responses.

These are checkpoints, not a mandatory linear sequence. Strong evidence can move the learner forward quickly. Weak or uncertain evidence can trigger a simpler prompt or a targeted follow-up.

### Prompt selection

After each response, the assessment engine should:
- update provisional evidence by skill and difficulty;
- identify the strongest demonstrated capability and the least-tested or least-certain relevant skill;
- select a follow-up that can distinguish the learner's actual ability;
- avoid repeating equivalent questions;
- occasionally ask the learner to elaborate, clarify or rephrase to test independent communication;
- distinguish misunderstanding of a prompt from inability to express an answer;
- avoid treating memorised phrases as proof of broad ability.

The system should not use one unusually strong or weak answer as the sole basis for placement.

## 5. Assessment dimensions

Evaluate separately and retain evidence for:

- vocabulary range, precision and appropriateness;
- grammar and control of sentence structures;
- sentence construction and connected discourse;
- comprehension of spoken or written prompts;
- fluency, response continuity and dependence on prompting;
- communicative effectiveness: describing, narrating, explaining, comparing and expressing opinions;
- pronunciation and intelligibility, only when genuine voice evidence is available.

For spoken assessment, retain transcript confidence and speech-recognition uncertainty. A recognition/transcription error must not automatically be scored as a learner grammar or vocabulary error. Pronunciation is not inferable from a text transcript.

Do not claim to measure confidence or personality from voice alone. If self-confidence is relevant, ask the learner directly or describe only observable interaction patterns.

## 6. Stopping criteria

Stop when there is sufficient evidence across the dimensions required for a useful recommendation and the learner's current level is reasonably clear. Continue targeted prompts where evidence is insufficient or contradictory. Apply a sensible maximum duration and question budget; explain that the result may be provisional if the learner stops early or declines voice assessment.

## 7. Five Gabenglish learning stages

Map evidence to Gabenglish's own five-stage curriculum:
1. Malayalam Mode.
2. Malayalam + English Mix.
3. English Practice Mode.
4. English Immersion.
5. Expert Communication.

Do not label these as CEFR levels or imply equivalence to a certified external framework.

## 8. Learner report

Provide a persistent, revisitable report with:
- recommended starting stage and plain-language rationale;
- skill-by-skill findings;
- examples drawn from the learner's actual responses, where permitted;
- strengths and improvement priorities;
- confidence/coverage indicators and any limitations;
- whether the assessment used voice, text or both;
- personalised next steps.

Use calibrated descriptions, not false precision. Numerical scores should be introduced only after a validated scoring rubric and pilot calibration exist. Never present illustrative scores as measured facts.

## 9. Gabroo's personal explanation

After the report is generated, Gabroo gives a short, personalised spoken explanation and matching transcript. It should:
- recognise specific things the learner did well;
- explain one or two improvement areas with examples;
- explain why the suggested stage is a sensible starting point;
- reassure the learner that earlier material remains available;
- invite the learner to choose the recommended stage, start from the beginning, select another stage or continue with a harder challenge.

Gabroo's tone is encouraging and evidence-based. It must not exaggerate ability, shame the learner, manipulate them or argue against their choice. The report is the structured record; Gabroo is the trusted companion who helps the learner understand and act on it.

## 10. Age-aware communication

Ask for or use an age band only where necessary for age-appropriate experience and applicable safeguards. Do not infer age from voice. Age is a weak default signal, never a substitute for explicit communication preference.

Avoid overfamiliar address terms such as “eda/edi” by default. Prefer the learner's chosen name or respectful, neutral Malayalam. Adapt to a learner's stated preference; do not assume that because a learner uses informal language, they welcome the same form of address. Use age-appropriate, respectful language for children and older adults. Keep humour gentle and optional.

## 11. Privacy and safeguarding

- Obtain consent before microphone capture.
- Explain whether raw audio is stored, for how long, and for what purpose.
- Minimise retention; do not retain raw audio by default unless necessary and consented to.
- Provide deletion and privacy controls.
- Apply child-safety and age-appropriate consent requirements before enabling voice features for minors.
- Do not use assessment responses to make unrelated sensitive inferences.

## 12. Acceptance criteria

- The assessment starts as a natural conversation, not a fixed quiz.
- Question difficulty changes in response to learner evidence.
- A learner demonstrating strong fundamentals can skip unnecessary beginner assessment.
- The learner can recover from a difficult prompt without embarrassment.
- Text-only assessments do not claim to evaluate pronunciation or verified speaking fluency.
- A report is available separately from Gabroo's spoken explanation.
- The spoken explanation cites actual learner evidence and gives a clear rationale.
- Learner choice is preserved.
- Assessment limitations and confidence are visible.
- No formal CEFR certification or equivalence is claimed.


## 13. Evidence extraction implementation boundary

The foundation API now has a first evidence-extraction module. It records observable response features such as response length, sentence count, discourse connectors and possible past/reason markers. It stores the prompt identifier, whether the source was typed text or a voice transcript, observable surface features, a brief/extended sample-size label and explicit limitations. Sample size is not confidence in learner ability. No skill is assigned until educator-reviewed prompt-to-skill mappings exist.

This is **not** an English proficiency evaluator. These surface features must not be interpreted as proof of grammar accuracy, vocabulary range, comprehension, fluency, pronunciation or a learning stage. A long answer can be inaccurate; a short answer can be correct. The module intentionally does not assign a score or stage.

The next assessment-engine milestone must add reviewed prompt-to-skill mapping, educator-authored analytic rubrics, multiple evidence samples per skill, uncertainty/coverage handling, human-reviewed calibration data and a report assembled only from defensible findings. A voice transcript remains transcript evidence; pronunciation requires audio analysis that has been independently validated.

## 14. First adaptive-selector implementation boundary

The API now has a conservative first follow-up rule: when a learner gives a very brief response, Gabroo asks once for a little more detail before moving on. It does not increase the difficulty band on the basis of that brief response. This is a clarification opportunity, not a judgement that the learner has low ability.

The current difficulty-band selector still uses simple response-length and surface-marker heuristics to choose among a small fixed prompt set. It is a routing prototype only; it is not a validated proficiency model. Prompt records intentionally do not claim skill mappings yet. Educator-reviewed prompt objectives and analytic rubrics are required before the system can produce skill findings or stage recommendations.
