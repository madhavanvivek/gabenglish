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
