# Gabroo Placement Prompt-to-Skill Map — Draft for Educator Review

Status: **Draft only — not approved, calibrated, or used to score learners.**

This document proposes what each conversational prompt could provide evidence about. It is a review aid for a Kerala-based English educator, not an assessment rubric. The current API must continue returning observable evidence only; it must not produce skill ratings, proficiency levels, confidence values, or stage recommendations from this map.

## Evidence dimensions

- **Comprehension:** whether the learner appears to understand the question and respond to its intent. A short or off-topic answer is not, by itself, proof of misunderstanding.
- **Vocabulary:** range, precision and appropriateness of words used in context.
- **Grammar:** observable control of forms relevant to the response, without treating every non-standard form as a global ability judgement.
- **Sentence construction:** ability to form understandable clauses and connect ideas.
- **Communication effectiveness:** whether the learner communicates the intended message for the stated context.
- **Response continuity:** whether the learner can sustain and extend a response. This is not equivalent to speaking fluency when only text is collected.
- **Pronunciation / intelligibility:** not assessable from text. Transcript text alone must never be used to infer pronunciation.

## Prompt coverage proposal

| Prompt | Intended communicative task | Candidate evidence dimensions | Important limits |
|---|---|---|---|
| `intro` | Introduce oneself and provide familiar personal context | Comprehension, basic vocabulary, sentence construction, communication effectiveness | Familiar content may be memorised; do not infer broad proficiency |
| `routine` | Describe a typical day or repeated activity | Vocabulary, present-tense grammar, sequencing, sentence construction | Topic familiarity and answer length affect evidence |
| `past` | Narrate a recent event | Past-time reference, sequencing, vocabulary, connected sentences | One event does not establish general tense mastery |
| `reason` | Explain a goal and why it matters | Reason-giving, vocabulary precision, clause connection, communication effectiveness | Personal familiarity and confidence with the topic vary |
| `opinion` | Express a view and support it with examples | Opinion language, supporting reasons, discourse connection, vocabulary and grammar in context | Do not penalise a learner for holding a different view |
| `scenario` | Explain a response to a workplace/team situation | Contextual comprehension, sequencing, conditional language where naturally used, register and communication effectiveness | Work experience and scenario familiarity can influence performance |
| `clarify` | Give the learner a fair opportunity to expand a brief answer | Clarification behaviour and additional context for the associated core prompt | Excluded from the six core evidence samples; never treated as a separate proficiency item |

## Review questions for an educator

1. Does each prompt elicit the intended construct without requiring specialist or culturally narrow knowledge?
2. Are the prompts accessible to adult learners with limited formal education as well as experienced professionals?
3. Are there valid alternative response forms that the evaluation should accept?
4. What observable indicators distinguish a language error from a misunderstanding of the task?
5. What evidence quantity is sufficient before any judgement is made?
6. How should Malayalam-supported explanations and code-switching be represented without penalising the learner?
7. Which prompts need parallel forms to reduce memorisation and repeated-exposure effects?

## Approval and calibration gates

Before implementation as an assessment rubric:
- obtain review by at least one fluent Kerala Malayalam educator and one English-language assessment specialist;
- define observable indicators and counter-examples for each dimension;
- create benchmark responses across a broad range of learner backgrounds;
- have multiple reviewers independently rate responses and measure agreement;
- test prompt fairness, accessibility, alternative valid answers and topic bias;
- document uncertainty and minimum evidence requirements;
- version the approved rubric and preserve the rubric version with each future assessment report.

Until those gates are met, this mapping is planning documentation only. The current placement report remains provisional and evidence-descriptive, with no score or recommended learning stage.
