# Gabroo Learning Intelligence Model (GLIM)

## Purpose

GLIM is Gabenglish-owned teaching intelligence. It is the decision layer that determines what Gabroo should help a learner practise next. It is separate from the language model that generates natural dialogue and from speech/avatar providers.

The first implementation is a transparent hybrid model: deterministic, testable decisions for skill estimation and practice selection; a language model for natural explanations and conversation; speech services for recognition and synthesis; and a separate rendering layer for avatar expression and lip synchronisation.

This is not a claim that Gabenglish has trained foundation-model weights. GLIM v1 is our own learning model and policy system. Fine-tuning is a later option, gated by evidence, consent and evaluation.

## Learning dimensions

1. Grammar — sentence structure, tense, articles, prepositions and agreement.
2. Vocabulary — recall, meaning, collocation and appropriate use.
3. Pronunciation — intelligibility, sound production, stress and rhythm; only score when the speech provider returns suitable evidence.
4. Fluency — continuity, pauses and ability to sustain an utterance; do not equate speed with fluency.
5. Comprehension — understanding spoken or written prompts and responding to their meaning.
6. Confidence — learner-reported comfort and willingness to participate; never infer personality or confidence from accent or demographic attributes.

## Evidence rules

A skill estimate must be grounded in a real, traceable task. Each observation carries a skill, normalised score, confidence in the observation, source, timestamp and task identifier.

- No evidence means no proficiency label. Start with a short placement activity.
- One weak observation is not enough to label a weakness.
- Repeated, sufficiently reliable observations are required before GLIM selects a targeted practice focus.
- Confidence weighting reduces the influence of uncertain signals.
- Invalid, out-of-range, unlinked or malformed observations are ignored.
- The learner's request for free conversation overrides forced lessons and corrections.
- Do not create pronunciation or fluency scores from plain text transcripts alone.

## Decision loop

1. Observe — collect evidence from placement tasks, conversation tasks, learner review and (where appropriate) human review.
2. Estimate — aggregate evidence by skill without fabricating missing values.
3. Select — choose one next skill only when repeated reliable evidence supports it; otherwise use balanced practice or placement.
4. Teach — select an activity and correction intensity appropriate to the skill and learner's language direction.
5. Check — ask the learner to apply the target in a new example or conversation turn.
6. Review — use learner recall ratings and later performance to schedule spaced repetition.
7. Re-evaluate — update estimates as new evidence arrives; retain provenance.

## Language direction

- Malayalam-to-English: English is the target language; Malayalam is the support language.
- English-to-Malayalam: Malayalam is the target language; English is the support language.
- The target/support distinction is explicit in every decision. The model must not silently reverse it.

## v1 implementation

The module apps/api/src/gabroo-learning-model.ts implements the six skill dimensions, typed task-linked evidence, confidence-weighted estimates, a no-evidence placement decision, a conservative repeated-evidence threshold, one-focus-at-a-time practice selection, free-conversation override, language-direction-aware target and support language, and activity selection including retrieval practice for due vocabulary.

The existing teaching policy, conversation memory, vocabulary review scheduler and conversation modes remain the delivery layer. GLIM feeds those components rather than replacing them.

## Deliberately not in v1

- No custom foundation model or fine-tuning.
- No automatic personality, age, gender, accent or confidence inference.
- No pronunciation scoring without validated audio evidence.
- No automatic changes to a learner's level based on one conversation.
- No use of private learner conversations as training data by default.
- No commercial speech quota or cost assumption.

## Model training and evaluation roadmap

Before fine-tuning, create a consented and de-identified evaluation corpus with Malayalam-English code-switching, regional variation, beginner speech, common grammar errors, natural dialogues and task-specific expected outcomes. Keep training, validation and test sets separate by learner to avoid leakage.

Evaluate correctness of error identification; usefulness of corrections; learner-level and language-direction fit; Malayalam support and code-switch handling; task completion and delayed retention; latency, interruption recovery and cost per completed practice session; and fairness across accents and proficiency levels.

Run offline expert review first, then a limited opt-in learner pilot. Compare candidate models/providers using the same fixed tasks and blinded scoring. Fine-tune only if a measured failure cannot be solved reliably through curriculum, retrieval, prompts or deterministic policy.

## Privacy and governance

Learning evidence must be minimised, purpose-limited and access-controlled. Learners should be able to inspect and correct their profile, and delete learning history where product policy allows. Any use of learner data for model training requires a separate, explicit consent flow and retention policy. Never train on raw voice recordings or private conversations by default.

## Versioning

- GLIM v1: transparent skill evidence and conservative next-practice decisions.
- Future versions must include a versioned decision contract, migration strategy, evaluation results and rollback path.
- Changes to scoring thresholds or decision rules require regression tests and benchmark review.


## Persisted learner profile API

The API now persists task-linked skill evidence in `gabroo_skill_evidence` (migration `0020_gabroo_skill_evidence.sql`). `recordGabrooSkillEvidence()` is an internal service boundary for trusted assessment, conversation and review evaluators; it is not exposed as an endpoint that lets a learner submit arbitrary proficiency scores. Duplicate observations for the same learner, skill, source and task are ignored rather than overwriting history.

Authenticated learners can read `GET /api/v1/gabroo/learning-profile`. The response contains the current 180-day evidence window, evidence-backed skill estimates, a conservative next-practice decision, target/support language, limitations and privacy flags. Learners cannot read another learner's evidence. Raw audio and transcripts are not returned or used for training.

The profile will remain at `needs_placement` until a trusted evaluator records task evidence. Conversation text length, word count and transcript-only pronunciation guesses must not be written as skill evidence. The next integration step is to connect validated placement and activity evaluators to the internal evidence writer.


## Trusted rubric adapter

`apps/api/src/gabroo-assessment-evaluator.ts` is the boundary between explicit evaluator output and persisted GLIM evidence. It accepts only schema-valid, task-linked rubric outcomes; it does not calculate scores from response length, vocabulary counts, transcript heuristics or grammar hints. Objective task outcomes are accepted only for placement assessments, learner self-reviews only for learner-review provenance, and human review outcomes only for human-review provenance. Pronunciation and fluency require an audio-analysis or human-audio-review method; text-only outcomes are discarded for those dimensions.

The adapter is intentionally not called by the current free-form placement conversation: that flow has not yet produced validated rubric scores. Its unit tests cover provenance, modality restrictions, malformed results and task traceability. Integration is permitted only when a real evaluator emits the explicit rubric contract.


## Objective placement pilot integration

The keyed multiple-choice pilot now emits item-level rubric observations for answered questions. The server owns the answer key and maps grammar items (q1, q2, q3, q5) and one pragmatic-response comprehension item (q4) to separate task identifiers. Correct answers receive 1 and incorrect answers 0; the item reliability weight is explicitly provisional (0.8 for grammar items and 0.7 for q4) and is not a learner ability score.

The scoring response exposes these observations for review, but does not persist them to the learner profile: this legacy scoring endpoint is not yet bound to an authenticated learner identity. The conversational placement flow also remains observation-only. A later authenticated assessment submission must bind results to the verified learner and apply consent, task-versioning, retake and idempotency rules before calling the internal evidence writer. This pilot is not a calibrated proficiency test and does not justify a CEFR label or a definitive learning-stage assignment.


## Authenticated placement submission

A separate `POST /api/v1/placement/assessments/submit` endpoint now requires a verified learner session, all five unique pilot answers, and a client-generated UUID idempotency key. The server validates against its own answer key, creates a versioned attempt record, and writes GLIM evidence in one database transaction. Replaying the same key and same answers returns the stored result; reusing the key with different answers returns a conflict. A new attempt uses a new attempt ID, so retakes remain distinct and auditable.

One sitting contributes at most one aggregated observation per skill, even when several questions assess that skill. This prevents four grammar questions in one sitting from satisfying GLIM's repeated-evidence threshold by themselves. A later independent assessment attempt is required to create another grammar observation. The older unauthenticated pilot score endpoint remains for compatibility and does not write learner evidence.


## Adaptive lesson blueprint

`apps/api/src/gabroo-lesson-planner.ts` converts the GLIM decision into a versioned, skill-specific lesson blueprint exposed as `next_activity` on the learner profile. It defines an objective, activity format, ordered teaching steps, completion check, language direction and explicit scoring boundary. It supports diagnostic placement, balanced conversation, grammar example-to-recall, vocabulary spaced retrieval, comprehension checks, confidence warm-ups and audio-gated speaking practice.

This is a curriculum blueprint, not a claim that a lesson player, audio evaluator or generated exercise renderer is already live. The client/tutor runtime must execute the steps, and only a trusted evaluator may produce evidence. Pronunciation and fluency plans explicitly require consented validated audio; confidence uses learner self-report; conversation volume and transcript statistics are never proficiency scores.


## Lesson exercise evidence loop

Published exercise authoring now supports an optional explicit skill tag for grammar, vocabulary or comprehension. The learner exercise submission endpoint requires a UUID idempotency key and persists the evaluated attempt and its GLIM evidence in one database transaction. Replaying the same key and answer returns the original result; reusing the key with a different answer returns a conflict. A successful new attempt contributes one task-linked `lesson_exercise` observation with a provisional 0.75 observation-confidence weight. The score is the authored answer-key outcome, not a transcript heuristic.

Exercises without a supported skill tag still save their result but do not affect GLIM. The current authored schema intentionally does not map free-text or ordinary multiple-choice results to pronunciation, fluency or confidence. Those skills require the separate audio-evaluation or learner-review pathways. Migration `0022_lesson_exercise_evidence.sql` adds nullable idempotency keys for backward compatibility and expands the evidence provenance constraint.

## Adaptive next-exercise delivery

`GET /api/v1/learning/lessons/:id/next-exercise` now selects the next learner-safe exercise from the currently published lesson. It requires a verified learner and active subscription, respects the learner's language direction and the Malayalam educator-approval gate, and reads only the published lesson version.

The selector uses recent authored exercise outcomes to prioritize an unseen exercise in the skill that needs reinforcement, then falls back to the next unseen exercise. When all exercises have been attempted, it offers a review exercise. The response is projected through the learner-safe lesson schema, so answer keys and accepted-answer rubrics are never returned.

This is skill-aware and difficulty-aware sequencing when authored metadata is available. The selector does not invent exercises or claim that a harder exercise exists. If no exercise is available near the target band, it falls back to another authored exercise for the recommended skill.
## Authored exercise difficulty bands

Authored exercises may now carry an optional integer difficulty from 1 (supported/foundational) through 5 (most challenging in the current curriculum). The field is learner-safe metadata; answer keys remain authoring-only. Existing lessons without difficulty continue to work unchanged.

Adaptive practice derives a target band only when recent attempts have authored difficulty metadata. Five or more recent outcomes with at least 80% correct can move the target up one band; three or more with at most 40% correct can move it down one band; otherwise the current band is retained. The target is bounded to 1–5 and is a content-selection hint, not a proficiency score.

The next-exercise selector prefers an unseen exercise in the recommended skill and closest to the target band. If no exercise exists at that band, it falls back to another authored exercise for that skill rather than fabricating content. Curriculum authors must provide reviewed content across bands before learners can experience a complete progression.

## Adaptive outcome integrity

Adaptive outcome queries tolerate malformed or missing lesson block arrays and ignore difficulty values outside the authored 1–5 range instead of allowing a cast error to break the learner profile or next-exercise endpoint. For each learner, lesson version and exercise, adaptive sequencing uses the latest recorded attempt rather than counting repeated submissions of the same exercise as independent evidence. This limits retry-driven inflation; distinct exercises remain separate observations. A future learning-session model may distinguish deliberate spaced re-attempts of the same exercise from transport retries.


## Learning-session identity for exercise evidence

Exercise submissions may include an optional UUID `learning_session_id`, separate from the per-request `idempotency_key`. The idempotency key protects a single network submission from duplicate writes; the learning-session ID groups deliberate practice across multiple exercises and attempts. When a session ID is supplied, GLIM records at most one evidence observation per learner, skill, exercise and learning session, using the first successfully persisted outcome for that exercise in the session. A later deliberate practice session can contribute a new observation. When no session ID is supplied, legacy behavior remains compatible and the attempt ID is used as the evidence task identity.

Adaptive sequencing keeps the latest attempt for each exercise within each identified learning session. Historical attempts without a session ID are collapsed to the latest attempt per exercise/version. This allows spaced practice sessions to count independently without allowing same-session retries to inflate the signal. The API client should create one UUID when a learner starts a practice session and reuse it for all exercise submissions in that session; it should create a new UUID for a later practice session.
