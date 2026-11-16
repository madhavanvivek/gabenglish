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

Only two initial paid terms are approved: Monthly ₹99 standard / ₹79 introductory first-purchase offer (20.20% discount) for exactly 30 days; Yearly ₹1,188 standard / ₹799 introductory first-purchase offer (32.74% discount) for exactly 360 days (12 × 30-day months). No six-month or tiered packages. The introductory offer applies only to a learner's first-ever successful subscription purchase; later renewals/re-purchases use the standard price. Superadmin can independently configure the discount percentage for each plan, enable/disable each offer and set an offer window in the admin portal. Server-side price calculation and immutable transaction price snapshots are required. Paid subscription unlocks Gabroo learning companion, classes, paid practice, ongoing learner assessment/profile and progress. Free analysis report and basic account details remain available without subscription. Paid access is controlled server-side and ends at the paid-through timestamp. Manual renewal is the default until auto-renewal is explicitly approved. Payment provider remains undecided.

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
- The legacy password registration/login routes are disabled outside automated tests (HTTP 410). The old password-based mobile screen remains a prototype and must be replaced with OTP UX.
- Passwordless OTP request/verify API routes now exist. OTPs are generated cryptographically, stored only as keyed digests, expire after five minutes, have a five-attempt limit, are throttled per destination and IP, are consumed transactionally and cannot be replayed. Verified email/phone OTP creates or signs in a learner and issues a session only after successful verification. Shared contracts and PostgreSQL integration coverage were added.
- OTP delivery is not operational: the API accepts an injectable email/SMS delivery adapter, but no provider has been selected or configured. With no adapter configured, OTP requests fail closed with HTTP 503; no code is logged or returned to the client.
- The free placement conversation now requires a verified learner session and checks session ownership on every response. Migration `0005_placement_owner.sql` adds learner ownership to placement sessions. Anonymous placement is blocked. Completed free diagnostic reports are now persisted against the learner account and exposed through a protected latest-report endpoint; they are not gated by paid subscription.
- Verified email/phone contact linking is implemented in the API with a separate authenticated challenge and verification flow; contacts already owned by another account are rejected and accounts are never auto-merged. The mobile account screen now uses email/mobile OTP and the landing screen routes unverified visitors to registration before analysis; the saved free report is shown in the account. Live email/SMS provider configuration, subscription checkout/entitlements, payment verification, production curriculum/content delivery and admin application remain incomplete.
- No final Gabroo 3D model, rig or production animation assets are approved.
- No production AI/speech provider has been selected or configured.

These limitations must remain visible in README, release notes and handover reports until verified changes replace them.

## 13. Next implementation sequence

1. Keep the PostgreSQL 16 integration suite green as migrations and session handling evolve; add a controlled deployment migration step, backup/restore verification and release rollback procedure before enabling PostgreSQL-backed placement in production.
2. Select and configure email/SMS delivery providers, implement verified-contact linking and mobile OTP UX, remove/deprecate public password auth, and persist the free analysis report against the learner account.
3. Implement exactly monthly/yearly subscriptions, payment-provider verification, 30/360-day entitlements and server-side gates for Gabroo classes, paid assessments and progress. Do not select a provider or enable recurring billing without approval.
4. Review the draft prompt-to-skill map with educators, then approve prompt objectives and mappings; do not enable skill findings until the analytic rubric and calibration gates are approved.
5. Implement evidence coverage/uncertainty and a defensible report with a starting-stage recommendation only after educator validation.
6. Produce the first complete Malayalam-supported lesson pack and editorial review workflow for all five stages.
7. Benchmark AI/STT/TTS providers before selecting one; then implement consent-based voice flows.
8. Complete profile, admin/content workflows, security review and analytics.
9. Build full OpenAPI, ERD/migrations, threat model, deployment/backup plan and an estimated Phase 1 backlog.


## 14. Detailed documentation index

- Product requirements: `docs/product/PRODUCT_SPECIFICATION.md`
- B2C freemium, OTP and subscription model: `docs/product/B2C_FREEMIUM_SUBSCRIPTION_MODEL.md`
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


## 15. Gabroo teaching intelligence foundation — 2026-11-16

The teaching-intelligence architecture and content-authoring contract are now documented. The implementation direction is a provider-neutral AI teaching system: Gabenglish owns curriculum, teaching policy, retrieval, learner-learning records and quality evaluation; a replaceable model adapter supplies language generation. No AI, speech or vector-search provider has been selected or activated.

New documentation:
- `docs/ai/GABROO_TEACHING_INTELLIGENCE_ARCHITECTURE.md` — request lifecycle, teaching orchestrator, retrieval policy, learner-memory separation, content governance, provider strategy and staged implementation.
- `docs/learning/CONTENT_AUTHORING_AND_SCHEMA.md` — content types, required metadata, lesson structure, accepted-answer policy, Malayalam editorial review and publication workflow.
- `content/schema/content-item.schema.json` — machine-readable content-item schema. Published items require approved editorial status.
- `content/seed/grammar-and-conversation-foundations.json` — three initial draft lesson records: simple present/daily routines, simple past/completed actions and self-introductions.

Important status:
- Seed records are drafts and are not approved for production retrieval.
- Educator review of English, Kerala Malayalam and learning design is pending.
- The content schema and sample records are a first authoring baseline, not a complete curriculum.
- AI model integration, retrieval implementation, learner learning-event storage, revision scheduling, admin authoring/publishing UI and provider benchmarking remain future implementation work.
- Do not promote conversation transcripts into shared teaching content automatically. Private learner memory and aggregate analytics remain separate from the shared library.
- The previous CI run for the app foundation passed. CI for these new documentation/content commits is running; final green status must be confirmed against the latest branch SHA.



## 16. All-day Gabroo subscription experience — 2026-11-16

Product direction clarified: the paid Gabroo subscription is an all-day English-learning companion, not simply access to scheduled lessons. An active subscriber can initiate open conversations with Gabroo on broad learner-chosen topics, and can optionally follow a personalised daily activity plan. Open chat must remain a first-class action and must never be blocked by the daily plan.

New specification:
- `docs/product/DAILY_ENGAGEMENT_AND_OPEN_CONVERSATION.md` — open-topic conversation, correction modes, daily activity planner, private memory, subscription entitlement, fair-use/availability transparency, reminders, safety and acceptance criteria.

This is a product specification, not a claim that the chat product is implemented. The current foundation has placement and OTP/report flows; provider-backed live AI conversations, chat history, conversation memory, entitlement enforcement, daily planner, notifications and voice chat remain implementation work. Text conversation is the first target; voice remains future work after consent and speech QA.

The approved subscription prices and 30/360-day periods are unchanged. Open chat and daily activities are paid features; the free diagnostic report remains accessible after expiry. Provider selection and any production fair-use thresholds remain undecided.

## 17. Progressive challenge and doubt clearing — approved product direction

Gabroo should speak mostly within the learner's demonstrated comfort range while regularly introducing manageable next-level language and conversational challenges. The learner's current stage is a default guide, not a ceiling. Difficulty should adapt to comprehension, recent responses, topic familiarity and explicit requests to simplify or increase challenge. Avoid fixed advanced-language quotas and sudden jumps that overwhelm learners.

Learners can interrupt at any time to ask about a word, phrase, grammar, meaning, tone or Gabroo's choice of expression, in Malayalam or English. Gabroo should pause, explain at the learner's level, give a natural example, check understanding when useful and resume the original conversation without losing context. Doubt clearing is available in every conversation mode and is not a separate paywall feature.

Detailed behaviour is recorded in `docs/product/DAILY_ENGAGEMENT_AND_OPEN_CONVERSATION.md` and `docs/ai/GABROO_TEACHING_INTELLIGENCE_ARCHITECTURE.md`. This is an approved product requirement; adaptive runtime behaviour is not yet implemented.

## 18. One subscription covers Gabenglish and Gabroo — approved commercial rule

The learner buys one Gabenglish subscription, choosing either Monthly or Yearly. There is no additional Gabroo subscription, separate Gabroo add-on, chat credit pack, per-message fee or extra tier. The single active Gabenglish entitlement covers the complete paid learning experience, with **“Talk to Gabroo anytime”** as its central experience: open-topic conversations, progressive level adaptation, doubt clearing, optional daily activities, lessons, classes, practice and progress features.

Free users keep their free diagnostic report and basic account access. The monthly/yearly Gabenglish subscription unlocks the paid experience for the selected period. Do not split Gabroo into a separately payable product or gate ordinary open conversation behind an extra purchase. Any fair-use controls must be transparent and consistent with this one-subscription promise.

## 19. Learner-controlled Gabroo speaking speed — approved requirement

When voice responses are implemented, learners control how fast Gabroo speaks. Provide an in-player control and a saved voice preference, with 1.0× default and an initial proposed range of 0.75×–1.5×. Learners can slow speech for comprehension or increase it as they become comfortable. Preserve pitch where supported, apply the preference to all Gabroo spoken replies and replays, and allow an immediate reset to normal speed. Do not change the learner's own recording speed or response text. The preference should persist across sessions and sync across devices when account settings support it.

This control is included in the single Gabenglish subscription. It is a required part of the future voice UX, not an additional purchase. Voice itself remains a future capability until consent, STT/TTS, playback controls and device QA pass.

### Implemented learner preference foundation
- Gabroo speech playback preference is persisted per learner account as `gabroo_speech_rate` (0.75×–1.50×, default 1.00×) and can be updated through the authenticated learner-preferences API. The mobile account screen exposes slower/faster controls and reset-to-normal, with server persistence. This stores the preference only; actual voice playback, STT/TTS and applying the rate to audio remain future work and are not advertised as live.


## 20. Verified subscription entitlement schema foundation — 2026-11-16

Migration `0008_verified_subscription_entitlements.sql` is now present on the foundation branch. It narrows the initial commercial schema to the approved two plans (monthly/yearly), INR regional prices, 30/360-day terms, verified payment metadata and a purchase-level immutable entitlement ledger. The database exposes an active-entitlement read view using the strict boundary `period_start <= now() AND now() < period_end`.

This is a schema foundation only:
- No payment provider has been selected or configured.
- No checkout or webhook endpoint exists.
- No entitlement is seeded or granted by the migration.
- Paid Gabroo/conversation routes are not yet implemented or gated.
- Free diagnostic reports and basic account access remain independent of paid entitlement.

The migration integration test now asserts the new migration is recorded, the two-plan/interval constraints exist, the active-entitlement view is empty on the CI database, and the verified payment timestamp/provider event reference are mandatory. CI status for the new commit must be checked before calling this change validated.


### Implemented subscription status API foundation

- Added `GET /api/v1/subscriptions/current`, authenticated through the verified learner session.
- The API reads only the database's active verified entitlement view and returns free access when no valid entitlement exists.
- Added reusable server-side `getActiveSubscriptionEntitlement(pool, userId)` lookup for future paid-route gates.
- Added PostgreSQL integration coverage for unauthenticated rejection and default free access.
- No payment mutation, checkout, webhook, provider configuration or entitlement grant endpoint has been created. Paid feature routes still need to enforce the lookup before any paid content or AI usage is exposed.


### Verified-payment activation foundation

Added an internal transactional activation service. It refuses to grant access unless a payment transaction is marked `succeeded`, has a server-verified timestamp and unique provider event reference, and matches the server-owned regional price, currency, plan and interval. It creates the entitlement and activates the subscription atomically; duplicate retries return the existing entitlement.

This is deliberately not exposed as a public route. Provider-specific signature verification and server-to-server confirmation must be implemented before any production caller can mark a payment verified. Checkout, launch-discount campaign rules, refunds, renewals and cancellation remain outstanding. CI is running for the current implementation; do not treat the feature as validated until the latest run completes.


### Gabroo persistent conversation foundation — implemented, provider pending

- Added migration `0009_gabroo_conversations.sql` for learner-owned conversations and ordered text messages, with cascading deletion and bounded message length.
- Added authenticated create/list/read/delete/send API routes. Create, list, read and send fail closed unless the learner has a verified account and active paid entitlement. Conversation deletion remains available to the authenticated owner even after subscription expiry.
- Added an injectable provider-neutral `GabrooConversationProvider`. The API serializes each conversation turn and writes the learner message plus Gabroo response atomically after a valid provider response; failures do not leave a half-saved turn.
- No AI provider/model is selected or configured. Without an injected provider, create/send return 503 and do not fabricate replies. There is no live Gabroo chat yet, no mobile chat UI, no voice, and no production fair-use/retention policy.
- PostgreSQL integration coverage verifies anonymous rejection, free-account 403 gating, and that a free account cannot create a conversation row. Paid-provider turn persistence and cross-account read/delete need dedicated integration coverage before release.


## Gabroo private learner memory implementation (16 November 2026)

Implemented on `foundation/app-skeleton`:
- PostgreSQL migration `0010_gabroo_learner_memory.sql` stores learner-owned goals, interests, saved phrases and learning notes.
- Authenticated API supports list/create/edit/delete. All operations are scoped to the verified account.
- Memory privacy controls remain available after subscription expiry; account deletion cascades saved memory.
- Only learner-saved entries are currently accepted. No transcript auto-extraction, sensitive personal inference, or shared-curriculum promotion is implemented.
- At most 20 recently updated saved entries are passed to the Gabroo provider as bounded structured context.

Still required:
- Disable-personalisation toggle and a more explicit learner-facing memory settings policy.
- Explicit opt-out / clear-all flow and user education about how memory is used.
- Provider integration and QA to validate that memory is used only as contextual assistance, not as an override of the learner's current request or teaching policy.

## 13. Gabroo conversation, memory and speech-preference checkpoint

Verified in the foundation branch after the earlier checkpoint:

- **Open Gabroo conversations:** authenticated conversation create/list/read/update/delete and message-turn APIs are implemented. Conversation history is learner-owned; ownership is checked on access. Paid entitlement is enforced server-side before a conversation is created or history is returned.
- **Provider boundary:** the conversation service accepts an injected reply provider, keeping the application independent of a specific AI vendor. The production provider, model, safety evaluation and operational credentials are not yet selected/configured.
- **Learner memory:** learners can explicitly save, inspect, edit and delete their own goals, interests, useful phrases and learning notes. The conversation teaching context receives saved learner memory; do not silently infer or store personal memories.
- **Subscription foundation:** the database includes subscription plans, regional prices, payment transactions and verified entitlements. Entitlement activation requires a verified, price-matched payment and is idempotent. This is not a live checkout integration; payment provider selection and production webhook configuration remain open.
- **Gabroo speaking-speed preference:** account preference `gabroo_speech_rate` is persisted and validated from 0.75× through 1.50× in 0.05× increments, defaulting to 1.0×. The account screen exposes slower/faster controls and reset-to-normal, and the API integration test checks persistence and rejects an invalid 1.03× value.
- **Important voice limitation:** no production TTS playback, STT, microphone capture or voice conversation is connected yet. The saved speed preference is ready to be consumed by the future playback layer, but it does not currently change any audio. Do not describe voice conversations or live playback-speed adjustment as implemented.

Next implementation sequence:
1. Add a focused, provider-neutral speech/playback contract and a testable playback controller that consumes the saved speech rate without binding the product to an unbenchmarked vendor.
2. Benchmark candidate TTS voices against the approved male, friendly, energetic Gabroo direction, Kerala Malayalam and Malayalam-English code-switching; document quality, latency, licensing, privacy and cost before selecting a provider.
3. Implement consent-first audio playback and recording UX, visible recording state, graceful text fallback and device-level QA.
4. Complete automated tests for the speech-rate preference and playback-rate application, then run the full PostgreSQL-backed CI suite.
5. Configure a dedicated Gabenglish Render workspace and production services only after the workspace is available and infrastructure changes are reviewed. Keep the draft PR unmerged and do not deploy production without explicit approval.

### Provider-neutral Gabroo playback contract (foundation implementation)

- Shared contracts now define the approved 0.75×–1.50× range, 0.05× increments and 1.0× default.
- A provider-neutral `GabrooAudioPlayback` interface exposes only `setPlaybackRate`, so future native/Expo/web audio adapters do not leak SDK types into product contracts.
- `applyGabrooSpeechRate` validates the saved preference before calling the player, returns only after the adapter confirms success, and propagates player failures. Invalid rates never reach the audio adapter.
- Contract tests cover supported/unsupported rates, default/range values, successful application, invalid input rejection and adapter failures.
- This is a tested-by-design source addition, not yet a verified CI pass. The latest GitHub workflow-run lookup did not return a run for this commit; do not mark CI green until the actual workflow result is inspected.
- No TTS/STT vendor or native audio dependency has been selected. No voice playback is exposed in the UI until a real adapter and audio asset/service exist.


### Consent-first, provider-neutral voice-session lifecycle

- Shared contracts now model the voice-session states: idle, requesting permission, listening, transcribing, generating, speaking, interrupted and error.
- The transition function requires an explicit consent flag before a session can request microphone permission. Permission denial fails closed.
- Capture, transcription, response generation and playback must occur in order; out-of-order provider callbacks are rejected.
- Interruption is supported during active session stages. Resuming requires an explicit action and returns through the permission-request state.
- Recovery from error requires reset. The lifecycle is provider-independent and does not request microphone access or capture audio by itself.
- Automated contract tests cover consent gating, the complete lifecycle, permission denial, interruption/resume, error recovery and invalid transitions.
- This is orchestration logic only. No microphone API, STT/TTS provider, real-time audio transport or voice UI is connected. Do not advertise voice chat as available.


### First mobile speech playback preview (device TTS)

- Added the Expo SDK 53-compatible expo-speech dependency (~13.1.7) and a Listen control on Gabroo assistant replies.
- The mobile conversation screen loads the learner's saved gabroo_speech_rate and applies it to each new speech utterance. The in-conversation slower/faster controls update the saved preference in 0.05× steps, within 0.75×–1.50×. The selected rate applies to the next listen/replay; changing it does not claim to retime an utterance already in progress.
- Playback uses the operating system's installed text-to-speech voices. When a reply contains Malayalam script, the app looks for an installed ml-IN voice and gives a clear message rather than knowingly reading Malayalam with an English voice when none is available. English replies prefer en-IN, with device fallback.
- Speech can be stopped, and playback is stopped when the Gabroo screen unmounts. Device speech errors are surfaced in the UI.
- This is a local playback preview, not the final Gabroo character voice. Voice gender, expressive identity, consistent Malayalam-English code-switching, naturalness and quality vary by device and installed voices; no male Gabroo voice has been selected or approved. No microphone capture, STT or live voice conversation is implemented.
- Expo documents expo-speech as supporting Android, iOS and web; the SDK 53 package reference identifies ~13.1.7 as the bundled version. Physical-device QA is still required, including iOS silent-mode behaviour and Malayalam voice availability.


### Consent-first voice session lifecycle contract

- Added automated tests for the provider-neutral voice session state machine: idle, permission request, listening, transcription, response generation, speech playback, interruption and error.
- A voice session cannot begin without explicit learner consent. Permission denial transitions to an error state; out-of-order lifecycle events are rejected rather than silently advancing.
- Active stages can be interrupted, and recovery requires an explicit resume or reset transition.
- This is a tested lifecycle contract only. It does not yet request microphone permission, capture audio, transcribe speech, or start live voice sessions. Those capabilities require a selected and reviewed speech provider/adapter and platform QA.


### Malayalam-English mixed-language speech playback

- Added a shared text segmentation helper that preserves the original order, whitespace and punctuation while separating Malayalam-script and Latin-script runs.
- Gabroo's mobile Listen action now queues each run with the matching installed device voice: Malayalam runs use an ml-IN voice and Latin-script runs prefer en-IN. The learner's saved speech rate is applied to every run.
- If a reply contains Malayalam but the device has no installed Malayalam voice, playback is not silently misrepresented as Malayalam; the learner receives an actionable notice.
- Added contract tests for Malayalam-only text, mixed-language switching, punctuation, whitespace and digits.
- This improves local device TTS only. Quality and pronunciation still depend on the installed OS voices; a consistent premium male Gabroo voice and live speech recognition remain future work.


### Speech playback sequencing and navigation safety

- Mixed-language runs are now spoken sequentially, awaiting completion of each device TTS segment before starting the next. This avoids overlapping or prematurely queued language changes.
- Playback uses a run token so Stop, a newer Listen request, or leaving the Gabroo screen cancels the remaining segments.
- The screen stops device speech when it loses focus, not only when the component is finally unmounted. This handles navigation stacks that keep screens mounted in the background.
- These safeguards apply to local device playback; they do not imply live microphone capture or a production Gabroo voice provider.


### Tested sequential speech playback queue

- Extracted the speech-segment queue into the shared contracts package so ordering, saved playback rate and cancellation can be tested without a device or a speech-provider SDK.
- The mobile Gabroo screen now uses this shared queue for its language-specific Expo Speech adapter.
- Added automated tests for ordered mixed-language playback, cancellation between segments, cancellation before playback, invalid speed rejection before audio starts, and empty replies.
- The queue is provider-neutral and does not request microphone access or record learner audio.
