# Gabenglish Product Decisions, Requirements and Delivery Status

Version 1.0 — consolidated product and implementation reference
Last reviewed: 2026-11-16

This document consolidates the important product decisions and delivery boundaries established for Gabenglish. It complements the detailed specifications linked below. If implementation and documentation differ, record the difference here and update the relevant detailed specification; do not silently treat a prototype as a production capability.

## 1. Product identity and promise

- Product: **Gabenglish**.
- Learning companion: **Gabroo**.
- Primary initial audience: Malayalam-speaking English learners in Kerala and India.
- Product promise: **Learn English in Malayalam. Build confidence. Gradually think and speak in English.**
- Initial platform: Android-first mobile app, with shared architecture suitable for iOS.
- Gabenglish is a standalone product and repository. Do not reuse infrastructure, credentials, databases, deployments, code, or product identity from Ozhzo, Fabnotch, Endroser, Approver or other projects.

Gabenglish teaches practical English, not memorisation alone. It should help learners understand words and meanings, pronunciation, grammar, sentence construction, natural usage, listening, and everyday-to-professional communication. Malayalam support should reduce as demonstrated ability grows, but learners may request Malayalam explanations at any stage.

## 2. Gabroo character and behaviour

### Personality direction
- Male voice direction.
- Funny, energetic, friendly, talkative and witty.
- Natural Kerala Malayalam and understandable code-switching.
- Gentle, situational teasing may be used when welcomed; never insult, humiliate, shame or discourage.
- Patient, encouraging and relatable; serious and calm when the learner is frustrated or asks for serious help.
- Consistent identity and behaviour across onboarding, lessons, assessment, speaking, feedback and notifications.

### Respect and address
- Default to the learner's chosen name or respectful, neutral Malayalam.
- Do not use “eda/edi” or equivalent intimate/familiar terms by default.
- Casual address and slang require the learner to explicitly choose or welcome that style.
- Do not infer age from voice. Age band is a weak signal for age-appropriate safeguards and initial presentation, not a replacement for communication preference.
- Offer changeable communication styles: Friendly and respectful (default), Casual and conversational, Playful and energetic, Calm and professional.
- Children receive age-appropriate, safe communication; teenagers are not forced into slang; adults and older adults are treated respectfully without patronising assumptions.

See `docs/brand/GABROO_CHARACTER_GUIDE.md` and `docs/brand/GABROO_COMMUNICATION_POLICY.md`. Gabroo's physical design is not final: concept artwork is for review only until explicitly approved. No generated concept is a production asset or canonical model sheet without approval.

## 3. Learning stages and progression

The curriculum has five Gabenglish-defined stages:
1. **Malayalam Mode** — foundational words, Malayalam meanings, basic sounds and simple supported sentences.
2. **Malayalam + English Mix** — everyday grammar, sentence formation and guided bilingual practice.
3. **English Practice Mode** — listening, conversation, narration and independent expression.
4. **English Immersion** — natural social/workplace English, longer exchanges, opinions and register.
5. **Expert Communication** — nuanced, professional, spontaneous communication, presentations, persuasion and argument.

Illustrative Malayalam-to-English support ratios discussed for experience design are 90/10, 65/35, 35/65, 10/90 and English-first. These are adaptive examples, not fixed quotas or promises. Progression must be based on demonstrated comprehension, recall and independent use—not elapsed time, streaks or lesson count. Keep prior stages revisitable.

Core learning modules include grammar, vocabulary and spaced revision, translation, listening, pronunciation, speaking with Gabroo, everyday roleplays, daily challenges and evidence-based progress recommendations. A lesson should include objectives, Malayalam explanation where useful, English examples, audio/transcript where appropriate, guided practice, feedback and revision.

## 4. First-session placement: Gabroo conversation

The first meaningful learner experience is a relaxed conversation with Gabroo, not a fixed multiple-choice quiz. The assessment should start accessibly, adapt to the learner's actual answers, raise or lower difficulty, ask targeted follow-ups, avoid redundant questions and distinguish misunderstanding from inability to express an answer.

Hidden challenge bands cover:
1. Basic communication.
2. Everyday conversation.
3. Independent expression.
4. Advanced conversation.
5. Expert communication.

Assess relevant dimensions separately: vocabulary, grammar, sentence construction, comprehension, fluency/response continuity and communicative effectiveness. Pronunciation and intelligibility may be evaluated only from genuine voice evidence. A text transcript cannot establish pronunciation or verified speaking fluency. Speech-recognition uncertainty must not be mistaken for a learner error.

### Report and explanation are separate
The structured learner report must contain:
- recommended starting stage and plain-language rationale;
- skill-by-skill findings;
- actual response examples where permitted;
- strengths and improvement priorities;
- evidence coverage/confidence and limitations;
- whether text, voice or both were used;
- practical next steps.

Gabroo then gives a personalised spoken explanation and matching transcript. It must cite the learner's actual evidence, explain strengths and one or two improvement areas, explain the recommendation and preserve learner agency. The learner can accept the recommendation, start at the beginning, choose another available stage or request a harder challenge.

Do not publish numerical scores until a defensible rubric has been validated and calibrated. Do not claim CEFR equivalence, certification, or personality/confidence measurement from voice alone. Early exits and unavailable skills must be clearly marked as provisional or not assessed.

Detailed contract: `docs/learning/GABROO_CONVERSATIONAL_PLACEMENT.md`.

## 5. Feedback and teaching quality

Correction modes:
- **Gentle:** prioritise important errors or end-of-session feedback.
- **Balanced:** correct meaningful errors after the learner finishes (default).
- **Detailed:** provide fuller feedback when requested.

Distinguish grammatical errors, unnatural-but-valid phrasing, vocabulary/word-choice issues, comprehensibility and register. Accept valid alternative answers. Explain the difference between a grammatically correct sentence and a more natural expression. Do not interrupt every sentence by default or treat a valid regional expression as wrong without evidence. Encourage retry and practice without shame.

Malayalam learner-facing content must be reviewed by a fluent Kerala Malayalam educator/editor. English content must be checked for grammar, naturalness, register and accepted alternatives. Audio, cultural appropriateness and age suitability must be reviewed before publication.

## 6. Speech, AI and character technology

AI/text generation, structured evaluation, speech-to-text (STT), text-to-speech (TTS), optional streaming and character animation should be behind replaceable adapters. No provider/model is considered selected until comparative evaluation is documented.

Benchmark:
- Kerala Malayalam understanding and naturalness;
- Malayalam-English code-switching;
- Malayalam-accented English recognition;
- recognition across common devices, noise and speaking speeds;
- male voice quality, pronunciation and naturalness for Gabroo;
- latency, reliability, cost, licensing, data retention and provider training/use terms.

The mobile client must never contain provider secrets. Track model/config version, latency and usage without logging unnecessary sensitive learner content. Fallback to text or a safe retry when speech providers fail. Do not claim a production AI tutor, reliable Malayalam ASR, pronunciation scoring or voice interaction until implemented and evaluated.

## 7. Technical architecture

Proposed baseline:
- Mobile: React Native + Expo + TypeScript.
- Backend: Node.js + TypeScript, Fastify REST API.
- Database: PostgreSQL.
- Shared validation/contracts: Zod and OpenAPI.
- Admin: React + TypeScript + Tailwind CSS.
- Media: S3-compatible object storage.
- Push: Firebase Cloud Messaging (iOS push later).
- CI: GitHub Actions.
- Hosting direction: dedicated Gabenglish Render environment.
- Background worker/queue and exact service topology to be selected after workload/cost evaluation.

Keep identity, learner profile, assessment, curriculum, lessons, exercises, vocabulary, translation, listening, speaking, tutor orchestration, speech, progress, subscription, notifications, administration, audit and analytics as clear backend modules. PostgreSQL is the transactional source of truth. Do not store user media on ephemeral app disks.

Open decisions requiring ADRs: authentication/session provider, ORM/migration approach, queue, object storage provider, LLM, STT, TTS, 3D runtime/asset pipeline and payment provider. Never represent proposed choices as deployed infrastructure. No paid production infrastructure is provisioned/approved by this document.

## 8. Core product flows and future MVP scope

Android initial public-release direction:
- registration, sign-in and learner profile;
- language, goals and communication preferences;
- Gabroo conversational placement and report;
- personalised learning path across the five stages;
- grammar, vocabulary, translation and listening;
- AI speaking tutor and roleplays, once provider quality and privacy are validated;
- pronunciation feedback only if validated voice analysis supports it;
- progress and revision;
- daily challenges and notifications;
- subscription/entitlement flows;
- admin/content management and support workflows.

Authentication, payments, admin console, production content delivery and live AI/speech are not complete merely because their requirements are documented.

## 9. Privacy, safety and compliance

- Request microphone permission only at point of need and explain purpose before capture.
- Make recording state visible; obtain explicit consent before retaining audio.
- Default to minimised/transient audio processing; retention periods, purposes and deletion must be defined before production voice launch.
- Provide access, correction, export and deletion controls as applicable.
- Apply child-safety and age-appropriate consent requirements before enabling features for minors.
- Use TLS, managed encryption at rest, least privilege, role-based admin access, audit logs, rate limits, safe upload validation and short-lived signed media links.
- Never put secrets in the client, source control or logs.
- Payment status and entitlements must be verified server-side; never trust client success callbacks.
- Review applicable Indian privacy, consumer, payment, app-store and child-safety requirements with qualified counsel before public release. This specification is not legal advice.

## 10. Repository and delivery rules

Canonical repository: `madhavanvivek/gabenglish`.
Current working branch: `foundation/app-skeleton`.
Keep changes on this branch and the existing PR draft until reviewed. Do not merge to `main` without explicit approval. Do not deploy to production or provision paid services without review/approval.

Current repository structure includes `apps/mobile`, `apps/api`, `packages/contracts` and `docs/`. Planned future boundaries include admin, worker, design-system/shared packages and infrastructure definitions; these are not completed applications unless present in the repository.

## 11. Verified implementation status (2026-11-16)

### Implemented in the foundation branch
- pnpm monorepo workspace.
- Fastify API skeleton with health and readiness endpoints.
- Shared Zod contracts package.
- Expo/React Native mobile prototype.
- GitHub Actions CI workflow for API/contracts and mobile typecheck.
- Placement conversation start/respond API endpoints with session and turn validation.
- A deterministic, predefined-prompt placement prototype and basic heuristic.
- Text-only mobile conversation prototype (currently local UI flow).
- Placement and respectful communication documentation.

### Latest confirmed automated validation
GitHub Actions run `43848505407` completed successfully for both `api` and `mobile` jobs, including API typecheck, API tests, contracts typecheck and mobile typecheck. This is a code/CI check, not a production readiness or learning-quality certification.

### Explicit limitations — not production-ready
- The current assessment engine is deterministic and prompt-based, not a live LLM-driven adaptive tutor.
- Its response heuristic is basic and is not a validated proficiency rubric.
- Assessment sessions are held in process memory and are lost on API restart; no durable session/report persistence is implemented.
- The mobile conversation prototype is not yet connected to the API.
- No evidence-based detailed report or personalised Gabroo voice explanation is generated yet.
- The current assessment is text-only; no microphone capture, STT, TTS or pronunciation evaluation is implemented.
- No authentication, learner account lifecycle, production curriculum/content delivery, subscriptions/payments or admin application is complete.
- No final Gabroo character model, rig or production animation assets are approved.
- No Render production deployment or paid AI/speech provider has been configured.

These limitations must remain visible in README, release notes and future handover reports until verified changes replace them.

## 12. Next implementation sequence

1. Keep documentation and implementation aligned; define assessment engine interfaces and evidence model.
2. Replace simple response-length heuristics with tested, skill-aware adaptive selection and explicit uncertainty handling; keep deterministic fallback clearly labelled.
3. Design and validate the assessment rubric with English/Malayalam educators before assigning learner levels.
4. Implement report generation from recorded evidence, with coverage/confidence and text-vs-voice limitations; implement Gabroo's separate personalised explanation only from report evidence.
5. Connect mobile to the API using an environment-configured client with timeout, retry and safe error states.
6. Add persistence and privacy-aware retention after database schema and consent requirements are approved.
7. Produce the first complete Malayalam-supported lesson pack and editorial review workflow.
8. Benchmark AI/STT/TTS providers before selecting one; then implement consent-based voice flows.
9. Complete authentication/profile, admin/content workflows, security review, analytics and subscription decisions.
10. Build full OpenAPI, ERD/migrations, wireframes/design system, threat model, deployment/backup plan and an estimated Phase 1 backlog.

## 13. Detailed documentation index

- Product requirements: `docs/product/PRODUCT_SPECIFICATION.md`
- UX and screen inventory: `docs/ux/UX_SPECIFICATION.md`
- Android MVP flows: `docs/ux/ANDROID_MVP_FLOWS.md`
- Gabroo character direction: `docs/brand/GABROO_CHARACTER_GUIDE.md`
- Gabroo communication policy: `docs/brand/GABROO_COMMUNICATION_POLICY.md`
- Conversational placement: `docs/learning/GABROO_CONVERSATIONAL_PLACEMENT.md`
- Curriculum: `docs/learning/CURRICULUM_FRAMEWORK.md`
- Technical architecture: `docs/architecture/TECHNICAL_ARCHITECTURE.md`
- Data model: `docs/architecture/DATA_MODEL.md`
- API specification: `docs/architecture/API_SPECIFICATION.md`
- AI/speech evaluation: `docs/ai/AI_SPEECH_EVALUATION.md`
- Security/privacy: `docs/security/SECURITY_PRIVACY.md`
- Test strategy: `docs/quality/TEST_STRATEGY.md`
- Phase 0 plan: `docs/roadmap/PHASE_0_PLAN.md`
