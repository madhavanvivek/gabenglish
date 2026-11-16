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

## 8. B2C freemium and subscription model

The current commercial model is B2C freemium. Learners create a free account using email OTP or phone OTP, take a free analysis/placement test and see the free result before being invited to subscribe to Gabroo. Email OTP accepts Gmail and other email providers; this is not Google OAuth. Learners may verify both email and phone and link them to one account.

Only two initial paid terms are approved: Monthly ₹99 standard / ₹69 launch offer for exactly 30 days; Yearly ₹1,188 standard / ₹799 launch offer for exactly 360 days (12 × 30-day months). No six-month or tiered packages. Paid subscription unlocks Gabroo learning companion, classes, paid practice, ongoing learner assessment/profile and progress. Free analysis report and basic account details remain available without subscription. Paid access is controlled server-side and ends at the paid-through timestamp. Manual renewal is the default until auto-renewal is explicitly approved. Payment provider and launch-discount renewal policy remain undecided.

Detailed requirements: `docs/product/B2C_FREEMIUM_SUBSCRIPTION_MODEL.md`.

## 9. Core product flows and future MVP scope

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

## 10. Privacy, safety and compliance

- Request microphone permission only at point of need and explain purpose before capture.
- Make recording state visible; obtain explicit consent before retaining audio.
- Default to minimised/transient audio processing; retention periods, purposes and deletion must be defined before production voice launch.
- Provide access, correction, export and deletion controls as applicable.
- Apply child-safety and age-appropriate consent requirements before enabling features for minors.
- Use TLS, managed encryption at rest, least privilege, role-based admin access, audit logs, rate limits, safe upload validation and short-lived signed media links.
- Never put secrets in the client, source control or logs.
- Payment status and entitlements must be verified server-side; never trust client success callbacks.
- Review applicable Indian privacy, consumer, payment, app-store and child-safety requirements with qualified counsel before public release. This specification is not legal advice.

## 11. Repository and delivery rules

Canonical repository: `madhavanvivek/gabenglish`.
Current working branch: `foundation/app-skeleton`.
Keep changes on this branch and the existing PR draft until reviewed. Do not merge to `main` without explicit approval. Do not deploy to production or provision paid services without review/approval.

Current repository structure includes `apps/mobile`, `apps/api`, `packages/contracts` and `docs/`. Planned future boundaries include admin, worker, design-system/shared packages and infrastructure definitions; these are not completed applications unless present in the repository.

## 12. Verified implementation status (2026-11-16)

### Implemented in the foundation branch
- pnpm monorepo, Fastify API skeleton, shared Zod contracts and Expo/React Native mobile application shell.
- GitHub Actions CI workflow for API/contracts and mobile typecheck.
- Placement conversation start/respond API endpoints with session, prompt-order and request validation.
- Mobile placement flow connected to the API through an environment-configured client, with timeout handling, response-schema validation and safe user-facing errors.
- Structured provisional report and separate Gabroo explanation returned by the API and displayed separately in the mobile prototype.
- Observable response evidence extraction with explicit text/transcript limitations; no skill findings, proficiency score or stage recommendation is generated.
- Short-lived placement session persistence support when PostgreSQL is configured and migration 0002_placement_sessions.sql is applied; 30-minute expiry is documented. In-memory fallback remains for tests/development.
- Six core prompt records spanning the five hidden challenge bands, with a conservative coverage-first sequence and up to two optional clarification turns. Clarification turns are excluded from core assessment evidence.
- PostgreSQL-backed placement sessions use optimistic revision checks to reject stale concurrent writes instead of silently overwriting a newer turn. Replaying the same successfully saved turn returns its cached response. The API distinguishes expired PostgreSQL rows from unknown session IDs so the client can show the correct restart flow.
- A checksum-verified PostgreSQL migration runner applies ordered migrations under an advisory lock, records checksums in `schema_migrations`, skips unchanged applied files and rejects edits to already-applied migrations. The API package exposes `pnpm --filter @gabenglish/api db:migrate`.
- Initial learner account API foundation: registration, scrypt password hashing, sign-in, short-lived signed access tokens, hashed rotating refresh tokens, logout/revocation and authenticated profile retrieval/update.
- Learner preferences and versioned consent records can be stored; account deletion requests disable the account and revoke refresh sessions.
- Login throttling is stored in PostgreSQL using keyed email/IP digests, without retaining raw email/IP values in the attempt log.
- Mobile placement flow now provides an explicit restart action when a server session expires or is no longer available.
- Shared Zod contracts now cover learner registration, login, refresh, profile, preferences, consent and token response shapes.
- Gabroo's Concept C identity direction and respectful communication/address policy are documented.

### Latest validation checkpoint
The placement-selector correction passed workflow run 43859020856. The mobile expired-session recovery and API placement work then passed workflow run 43859171656 (API typecheck, API tests, shared-contract typecheck and mobile typecheck). The optimistic-concurrency implementation and regression test passed workflow run 43859779934: API typecheck, all 21 API tests, shared-contract typecheck and mobile typecheck. The real PostgreSQL 16 integration suite passed workflow run 43861505662: CI applied migrations 0001 and 0002, then verified session persistence across API restarts, concurrent response handling and expiry. The learner account lifecycle, session-bound access-token revocation and mobile account screen passed workflow run 43863689708: all 27 API tests passed across five files, including PostgreSQL migration checks, registration, scrypt password storage, login throttling, profile/preferences, consent, refresh rotation, immediate access-token invalidation on refresh/logout and account disablement; API typecheck, shared-contract typecheck and mobile typecheck also passed. A second run 43863698242 also passed. No production deployment has been performed.

### Explicit limitations — not production-ready
- The current placement selector is conservative coverage routing with clarification support, not a fully skill-aware adaptive assessment or live LLM-driven tutor.
- No educator-approved prompt-to-skill mappings, analytic rubric or calibration dataset exists; therefore no learner skill ratings, confidence levels or starting-stage recommendation are produced.
- Reports and answers are retained only within the short-lived assessment session; a durable learner assessment history/report store is not yet implemented.
- PostgreSQL persistence is conditional on deployment configuration and migration application; no live Gabenglish database or production deployment has been verified.
- The mobile assessment is text-only. No microphone capture, STT, TTS or pronunciation evaluation is implemented. Transcript input support in the API is not a production voice feature.
- The existing learner password registration/login and password-based mobile screen are an implementation prototype only. They do not meet the approved B2C OTP model and must be replaced before public beta. Email OTP, phone OTP, verified-contact linking, subscription checkout and paid entitlements are not implemented yet.
- Placement reports are still anonymous and are not linked to learner accounts; persistent assessment history remains pending.
- B2C subscriptions, payment verification, subscription entitlements, OTP identity, production curriculum/content delivery and admin application remain incomplete.
- No final Gabroo 3D model, rig or production animation assets are approved.
- No production AI/speech provider has been selected or configured.

These limitations must remain visible in README, release notes and handover reports until verified changes replace them.

## 13. Next implementation sequence

1. Keep the PostgreSQL 16 integration suite green as migrations and session handling evolve; add a controlled deployment migration step, backup/restore verification and release rollback procedure before enabling PostgreSQL-backed placement in production.
2. Replace prototype password auth with email/phone OTP challenges, verification, verified-contact linking, OTP abuse controls and secure sessions. Preserve the free analysis funnel and persist its report for verified free accounts.
3. Implement exactly monthly/yearly subscriptions, payment-provider verification, 30/360-day entitlements and server-side gates for Gabroo classes, paid assessments and progress. Do not select a provider or enable recurring billing without approval.
4. Review the draft prompt-to-skill map with educators, then approve prompt objectives and mappings; do not enable skill findings until the analytic rubric and calibration gates are approved.
5. Implement evidence coverage/uncertainty and a defensible report with a starting-stage recommendation only after educator validation.
6. Produce the first complete Malayalam-supported lesson pack and editorial review workflow for all five stages.
7. Benchmark AI/STT/TTS providers before selecting one; then implement consent-based voice flows.
8. Complete profile, admin/content workflows, security review and analytics.
9. Build full OpenAPI, ERD/migrations, threat model, deployment/backup plan and an estimated Phase 1 backlog.


## 14. Detailed documentation index

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
