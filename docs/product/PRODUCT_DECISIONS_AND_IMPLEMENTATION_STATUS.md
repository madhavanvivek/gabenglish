# Gabenglish Product Decisions, Requirements and Delivery Status

Version 1.0 — consolidated product and implementation reference
Last reviewed: 2026-11-18

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
- Voice identity and exact voice remain unapproved; candidate auditions must be benchmarked before selection.
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

See `docs/brand/GABROO_CHARACTER_GUIDE.md` and `docs/brand/GABROO_COMMUNICATION_POLICY.md`. Gabroo's final character identity and production 3D avatar have **not** been approved. Any supplied artwork or generated concept is exploratory reference material only until the owner explicitly selects and approves a canonical character direction and its production model. The Version 2 Gabenglish logo treatment is approved as the visual direction (17 November 2026); logo approval does not approve a Gabroo face, character concept, 3D model or avatar. A production-ready character model sheet and vector logo assets still need to be prepared and reviewed. Generated concept renders are not production assets.

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

## 6A. Gabroo visual identity selection and approval gate

No Gabroo character concept, face, outfit or production 3D avatar has been approved yet. The visual direction is an open selection task. Prepare multiple clearly differentiated concepts for owner review, then develop the selected direction into a production model sheet and 3D model. Do not describe any existing concept, artwork or model as canonical or approved before explicit owner sign-off. After selection, preserve the approved identity consistently across registration, onboarding, placement, lessons, live conversations, progress, notifications and marketing. Obtain owner approval of the 3D model before rigging and animation production.

The selection and approval process is defined in `docs/brand/GABROO_LIVE_CHARACTER_IDENTITY_LOCK.md`; the character guide is exploratory and must not be treated as an approved identity. Once a concept and model are approved, import the exact approved master asset into the repository with provenance and checksum. Do not invent a checksum or treat a storyboard/render as an approved source asset. Character selection, production model, rig, animation and visual regression remain pending.

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

Only two initial paid terms are approved: Monthly ₹99 standard / ₹79 current offer (20.20% discount) for exactly 30 days; Yearly ₹1,188 standard / ₹799 current offer (32.74% discount) for exactly 360 days (12 × 30-day months). No six-month or tiered packages. The offer may apply to initial purchases, renewals and re-purchases while enabled and within its configured offer window; when disabled or expired, the then-current standard price applies. Superadmin can independently configure the discount percentage for each plan, enable/disable each offer and set an offer window in the admin portal. The server calculates the final price and stores an immutable transaction price snapshot; later admin changes never rewrite completed checkouts or purchases. Paid subscription unlocks Gabroo learning companion, classes, paid practice, ongoing learner assessment/profile and progress. Free analysis report and basic account details remain available without subscription. Paid access is controlled server-side and ends at the paid-through timestamp. Manual renewal is the default until auto-renewal is explicitly approved. Payment provider remains undecided.

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
- Gabroo's Gabroo personality and respectful communication/address policy are documented; final visual identity and 3D avatar are not approved.

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


### Consent-first microphone permission preflight

- Added an explicit learner-facing consent step in the Gabroo conversation screen. The operating-system microphone permission prompt is never requested automatically on screen load.
- The learner must actively select the consent statement and then press the permission action. The request is made through the Expo AV permission API.
- Android and iOS microphone permission descriptions explain that access is requested only when the learner chooses to prepare a voice conversation.
- Corrected the shared voice lifecycle: permission approval now enters a distinct `ready` state. It does **not** mean the microphone is recording or that the session is listening. A separate `begin_capture` event is required to enter `listening`.
- The permission preflight originally checked OS permission only. A later local-only microphone validation flow now supports a separate recording consent, explicit start/stop and immediate temporary-file deletion. This does not provide speech recognition or live Gabroo voice conversation.
- Consent is an explicit in-screen action for this permission preflight; learners can clear the in-screen consent state. Revoking OS permission itself remains available in device settings.


### Provider-neutral Malayalam-English speech recognition boundary

- Added a shared recognition contract for Malayalam (ml-IN), English (en-IN) and mixed Malayalam-English (ml-en) requests.
- Audio metadata is validated against an allowlist of supported media types and a 10 MB maximum before an adapter receives the bytes.
- Recognition results are schema-validated, including transcript length, detected language and optional confidence bounds.
- Added a separate learner-reviewed transcript contract for any future voice-to-chat handoff. A transcript must be non-empty, within the text limit, carry a supported detected-language value, and include explicit `confirmed: true`; provider output is not eligible for automatic submission. The contract does not persist transcripts or enable transcription by itself. A shared confirmation helper derives the `edited` flag by comparing the learner's reviewed text with the validated provider transcript, retains the provider's validated language classification and refuses confirmation when the learner has not explicitly approved it.
- The recognition boundary supports cancellation and a 15-second default timeout, bounded to a maximum of 60 seconds. Invalid timeout values are rejected before the provider is invoked, and cancellation/timeout settle even if a provider ignores its abort signal. It returns stable application error codes rather than leaking provider error messages.
- No audio or transcript is persisted by this shared helper. The caller remains responsible for explicit learner consent, secure transport, retention and deletion policy.
- Added an API-side, provider-injected recognition service with a fail-closed explicit-consent gate. Missing or false consent is rejected before the provider is invoked; audio metadata/byte validation, provider timeout and cancellation are delegated to the shared recognition boundary. The service has no database/storage dependency and returns only an unconfirmed transcript; it does not create a conversation message or persist audio/transcript. Automated API service tests cover consent rejection, provider invocation only after consent, no automatic confirmation, missing provider and metadata mismatch.
- Added an authenticated `POST /api/v1/gabroo/recognition` HTTP route for the supported raw audio media types. It requires a verified learner session, an active paid entitlement and the explicit `x-gabroo-consent: true` header; accepts the recognition language in `x-gabroo-language`; and enforces a 10 MB in-memory request limit. Audio is passed as transient bytes to the injected provider and is not written to disk or the database. The response is explicitly marked `review_required: true`; it does not confirm the transcript or create a conversation message. Unsupported media types, unauthenticated requests and unconfigured providers fail closed. HTTP guard tests cover unsupported media, authentication and rejection above the 10 MB request limit.
- No speech-recognition provider is configured or selected, and the production server does not inject one. Therefore the endpoint currently returns provider-unavailable after authentication/consent checks; live transcription and voice conversation are not available. Provider selection, secure transport review, mobile upload/review UI, and end-to-end platform QA remain outstanding.

- Follow-up hardening: the recognition boundary now verifies that the actual byte length matches the declared metadata size and rejects mismatches before invoking a provider.
- Cancellation now settles promptly even if a future provider adapter ignores its abort signal; this prevents a cancelled learner action from remaining pending indefinitely.

### Local microphone capture validation (2026-11-16)

- Added a separate, explicit recording consent after OS microphone permission has been granted. Permission consent alone does not authorise recording.
- A learner can start a clearly labelled local microphone test only from the permission-ready state and only after accepting the separate recording consent.
- The mobile client records to a temporary device-local URI, stops on explicit learner action, and deletes the temporary file immediately after capture. The app resets the audio mode after stopping.
- The shared voice lifecycle now includes a guarded `capture_discarded` transition from transcribing back to ready, so a local test cannot be mistaken for a completed transcript.
- Leaving the Gabroo screen and sending the app to the background attempts to stop and unload any active recording and delete its temporary file. A recording-operation lock prevents duplicate stop calls; a background transition during recording startup is handled after startup completes.
- The shared contracts package defines the 15-second local-capture limit, and the mobile screen consumes that constant rather than duplicating the duration value.
- File deletion is retried in cleanup if the first deletion attempt fails. The UI reports an error rather than claiming successful cleanup when the initial deletion fails.
- This is a local capture and deletion validation only. Audio is not uploaded, retained in the account, transcribed, or sent to a provider. Live voice conversation remains incomplete.
- The local microphone test is capped at 15 seconds and automatically stops and deletes its temporary recording at the limit.


### Mobile Gabroo recognition transport foundation (2026-11-17)

- Added a shared Zod response contract for the recognition HTTP endpoint. It requires a validated transcript, the literal `review_required: true`, and a non-empty request ID; unknown response fields and any response that removes the review gate are rejected.
- Added contract tests for valid responses, review-gate enforcement, unknown fields and invalid transcript confidence.
- Added a mobile authenticated binary-upload helper using the app's secure session token. It sends the learner's explicit consent header, selected recognition language and allowlisted audio MIME type; it retries once after a 401 session refresh and validates the response against the shared contract.
- The helper returns only an unconfirmed transcript. It does not create a conversation message, persist audio, or bypass learner review. The local microphone test remains local-only and does not call this helper.
- The mobile screen does not yet expose a record-and-upload action or transcript editor. Do not upload a local recording until a provider is selected/configured and the learner-facing consent, review, discard and failure states are implemented. With the current production configuration, the recognition endpoint still returns provider-unavailable after its account, subscription and consent gates.
- CI/device verification remains pending; the current GitHub Actions runner allocation issue has prevented reliable CI execution. No production deployment or PR merge was performed.


### Gabroo recognition readiness and mobile gating (2026-11-17)

- Added authenticated `GET /api/v1/gabroo/recognition/status`. It requires a verified learner and active paid entitlement, then reports whether a recognition provider is injected, accepted audio types, language options, the 10 MB request limit and the mandatory transcript-review requirement. It exposes no provider secrets or configuration details.
- Added the mobile status client and a readiness panel in the Gabroo voice-preparation UI. The screen now distinguishes local microphone permission/capture testing from actual speech recognition and clearly reports when the provider is unavailable.
- Added an API test confirming the readiness endpoint rejects unauthenticated requests.
- The app does not upload recordings or offer a transcript editor yet. That remains intentionally gated until a production provider has been selected and configured and the consent/review/discard experience is implemented. A provider being reported as available is not, by itself, a release sign-off.
- No deployment or merge performed. CI/device validation is still required.


### Recognition readiness contract hardening (17 November 2026)
- Added a shared Zod response schema for the authenticated recognition readiness endpoint. The contract validates availability, the 10 MB ceiling, allowlisted audio MIME types, supported language identifiers, and the mandatory transcript-review flag.
- Mobile now validates the readiness response before using it; malformed or unexpected server responses fail closed and keep voice uploads disabled.
- Added shared contract tests for invalid limits, unsupported MIME types, unexpected fields, and attempts to disable transcript review.
- The API advertises supported languages from the shared contract constant to avoid server/client drift.


### API response and disconnect hardening (17 November 2026)
- The recognition status endpoint now validates its outgoing payload against the shared readiness schema, and successful transcription responses are validated against the shared review-required response schema before being returned.
- The API now aborts provider work when the incoming request is aborted or the response connection closes before completion. This avoids continuing a paid/remote recognition request after the learner has disconnected, provided the injected provider honours AbortSignal.
- No audio is persisted by this route. Transcript output remains unconfirmed and cannot be sent to a conversation by this endpoint.


### Mobile readiness loading correction (17 November 2026)
- Corrected the Gabroo screen's subscription load path to actually request the authenticated recognition readiness endpoint for active subscribers. Previously the endpoint client was imported but not called, leaving the availability panel permanently in its unknown state.
- Readiness lookup failure is isolated from conversation loading: saved conversations still load, while voice recognition remains safely unavailable in the UI. Free accounts clear the paid-only readiness state.


### Authenticated recognition readiness API coverage (17 November 2026)
- Added route-level tests using a signed test learner session and a mocked entitlement lookup.
- Covered the paid learner success response (including the full shared-contract payload), free learner denial, and the provider-injected availability flag.
- These tests exercise authentication, subscription gating, and the status response through Fastify rather than testing only the standalone Zod schema.


### Gabroo voice-input review flow (17 November 2026)
- Added a separate transcription-consent checkbox; microphone permission and the local-only microphone test remain separate.
- Voice-input capture is available only to a paid learner after the authenticated readiness endpoint reports a configured provider and microphone permission has been granted.
- Captures are limited to 15 seconds. Stopping capture does not upload audio; the learner must explicitly choose **Review & transcribe**.
- The unconfirmed transcript is editable. The app sends only the learner-reviewed text after **Confirm & send to Gabroo**; the shared `confirmGabrooTranscript` contract derives the edited flag and requires explicit confirmation.
- Audio is held temporarily in the app cache and deleted after transcription, on discard, when the app backgrounds, or when the screen loses focus. This app-side cleanup does not assert provider-side retention/deletion behavior.
- The UI remains hidden for transcription when provider readiness is unavailable. No provider credentials or service were configured as part of this change.
- Verification limitation: GitHub Actions currently exits before job steps/logs are available, so this implementation has not yet been validated by CI or on physical devices. The voice provider remains unconfigured in the current environment.


## 13. Mobile UI foundation progress (2026-11-17)

- Added shared semantic mobile theme tokens for colour, spacing, radii and type scale.
- Added reusable mobile primitives for the Gabenglish brand mark, primary action, surface card and eyebrow label.
- Applied shared brand/background tokens to the root app surface and the placement, account and Gabroo learner screens.
- Refactored the placement screen to use shared brand and primary-action primitives.
- This is an initial UI foundation only. The final UI is not green: complete onboarding, home/dashboard, learning, progress, subscription and profile flows still need implementation/refinement; the full design system, final Gabroo art, Malayalam font/device validation, accessibility and usability QA remain open.


## 14. Learner home and learning-path UI (2026-11-17)

- Added an authenticated learner Home screen using the live learner profile, subscription entitlement and saved Gabroo conversation endpoints.
- Added a primary Talk to Gabroo action, recent conversation list, account/profile navigation and learner-controlled saved playback speed (0.75×–1.50×, default 1.0×, reset action).
- Added a five-stage learning-path explorer based on the approved curriculum framework. The stage descriptions are informational; no learner stage or completion progress is inferred.
- The current seed lessons remain editorial drafts with review pending. They are intentionally not presented as published, playable lessons.
- Connected navigation between placement, Home, Learn, Account and Gabroo.
- Remaining UI work includes a real lesson player and reviewed/published curriculum, practice/revision, evidence-based progress, subscription checkout/management, profile polish, and the final shared navigation system.
- Verification remains blocked by GitHub Actions jobs exiting before runner allocation (empty step lists and runner ID 0). No successful mobile typecheck or device QA is claimed. No merge or production deployment performed.


## 15. Learner profile, preferences and progress snapshot (2026-11-17)

- Added editable preferred name using the authenticated profile update endpoint; the app reloads the canonical learner profile after saving.
- Added live controls for support language (Malayalam/English), correction style (gentle/balanced/detailed), daily learning target (5/10/15/20 minutes), and the reminder preference.
- Reminder preference is stored, but local/push notification scheduling is not yet implemented; the UI states this explicitly.
- Added a progress snapshot backed by the saved free diagnostic report: response/sample counts, Gabroo explanation, observed patterns, next steps and report limitations.
- The progress screen does not invent streaks, scores, stage advancement or longitudinal charts. It presents only the evidence available from the saved report.
- Added navigation from Home to Progress. Further work: real lesson delivery, practice/revision and persisted learning activity, subscription checkout/management, final navigation and device QA.
- CI and physical Android QA remain outstanding. No merge or production deployment performed.


## 16. Approved Version 2 brand direction (2026-11-17)

- Approved the Version 2 visual direction for the Gabenglish logo: brighter, high-contrast purple wordmark; purple-and-yellow “with Gabroo” lockup; more legible “YOUR AI ENGLISH TUTOR” tagline; and a cleaner, consistent brand system.
- The approved identity system should include four practical variants: primary mascot + wordmark lockup, app icon using the Gabroo face, compact horizontal logo, and a single-colour logo/standalone “G” brand mark.
- Preserve the original learner-supplied Gabroo character as the canonical character reference. Do not silently substitute a newly generated face, hairstyle, age, outfit or character identity when preparing final artwork.
- Keep the established purple identity and yellow accent. Use sufficient contrast on both light and dark backgrounds; the near-black wordmark on black in the initial concept is not an approved treatment.
- The generated Version 2 presentation is a visual direction/mockup, not a production-ready vector master. Next brand-artwork tasks: create clean vector wordmark and brand mark, prepare transparent-background logo exports and app icon crops, verify typography/spacing at small sizes, and prepare light/dark/monochrome variants. Final exports should be reviewed before being wired into app launch assets.
- This approval does not approve any new character model or claim that the production mascot/animation asset pipeline is complete.


## 17. Bidirectional language learning expansion (2026-11-17)

- Approved the product direction to support two distinct learning journeys: English through Malayalam (`ml_to_en`) and Malayalam through English (`en_to_ml`).
- The existing English-through-Malayalam journey remains the default and launch foundation. Existing learners must not be silently switched.
- Target language, support/explanation language and learning direction are separate concepts. Do not overload the existing `support_language` preference to represent course direction.
- The Malayalam-through-English journey requires its own curriculum, assessment blueprint, register/politeness guidance, script and optional romanisation support, and fluent educator review. It is not a translated copy of the English curriculum.
- Initial product recommendation is to include both directions under the existing subscription model; no price, billing or entitlement changes are authorised.
- Detailed architecture, learner journeys, pedagogy, content metadata, rollout and acceptance criteria are documented in `docs/learning/BIDIRECTIONAL_LANGUAGE_LEARNING.md`.
- This is a product/architecture decision only. Direction persistence, selector UI, Malayalam curriculum, assessment, direction-aware tutor behaviour and release QA remain unimplemented. No new language direction should be shown as production-ready until its reviewed content and flows exist.


## 18. Learning direction persistence and selector (2026-11-17)

- Added migration `0011_learning_direction.sql`; existing and new accounts default to `ml_to_en` (English through Malayalam).
- Added `learning_direction` to learner preference validation and the authenticated preference update/read APIs. The existing `support_language` remains a separate setting.
- Added a learner-home selector for English through Malayalam and Malayalam through English. The choice is saved to the account and reloaded from the API.
- The learning-path screen now changes its overview based on the selected direction. Malayalam shows planned learning areas and clearly states that reviewed lessons/audio/practice are not yet available.
- Added contract tests for supported and unsupported learning-direction values.
- Not yet implemented: direction-aware Gabroo conversation prompting and turn metadata, separate per-direction progress records, Malayalam placement assessment, reviewed Malayalam lessons/audio, and direction-aware free diagnostic. Do not present the Malayalam course as available until these are implemented and reviewed.
- Verification: GitHub Actions runs continue to fail before runner allocation (`runner_id=0`, `steps=0`); no code checks were executed. Android device QA remains outstanding.

## 19. Direction-aware Gabroo conversation foundation (2026-11-17)

- Added migration `0012_gabroo_conversation_direction.sql` to persist each conversation's learning direction and target language. Existing conversations are backfilled as English learning with Malayalam support.
- New conversations read the learner's saved direction and support-language preference. An explicit support-language choice for a conversation remains possible; omitting it uses the saved learner preference.
- The direction and target language are frozen on the conversation record, so changing the learner's course preference later does not silently change the teaching context of an existing conversation.
- Passed learning direction and target language separately from support language to the Gabroo provider contract and teaching policy.
- Added direction-specific teaching guidance. English acquisition remains Malayalam-supported; Malayalam acquisition uses English explanations and calls for Malayalam script, optional romanisation, register/politeness guidance and caution around slang.
- Added policy tests for both directions and for avoiding invented Malayalam proficiency stages.
- This is a direction-aware orchestration foundation, not a completed Malayalam course. The Malayalam curriculum, direction-specific placement assessment, reviewed content, per-direction progress records, and live AI provider integration remain outstanding.
- Validation status: code changes committed to `foundation/app-skeleton`; GitHub Actions must complete its actual runner steps before this work can be called tested. No merge or production deployment performed.

## 20. Direction-safe free diagnostic and report retrieval (2026-11-17)

- Added migration `0013_directional_diagnostic_reports.sql` to tag diagnostic reports with the learning direction and target language they assess. Existing reports remain tagged as English acquisition (`ml_to_en`).
- The current free conversation diagnostic is English-specific. The API now refuses to start it for a learner whose saved direction is Malayalam acquisition, returning a clear unavailable-assessment response rather than silently assessing the wrong language.
- Latest-report retrieval is scoped to the learner's selected direction and includes the report's direction metadata. An English report will not be presented as evidence of Malayalam proficiency.
- The Malayalam assessment is still not implemented. This is an intentional product-integrity guard, not a completed assessment flow.

## 21. Persisted subscription offers and Superadmin API (2026-11-17)

- Added database-backed monthly/yearly offer rules, fixed INR standard prices and current launch discounts, version increments on every update, and immutable payment price-snapshot columns.
- Added public current-price retrieval and authenticated learner-owned 15-minute quote creation. Quote rows cannot be updated; creating a quote never creates a payment intent or grants paid access.
- Updated verified payment entitlement activation to preserve the server-calculated standard/discount/paid amounts from a trusted payment snapshot. Provider verification remains a separate prerequisite.
- Added a separate admin account/session boundary with the Superadmin role, distinct signed-token issuer/audience, token-digest validation against revocable DB sessions, scrypt password verification and a 15-minute lockout after repeated failed sign-ins.
- Added Superadmin-only APIs to list and update monthly/yearly offer discounts and offer windows. Every update is transactional, increments the offer version and creates a redacted audit event. Added a paginated, action-filterable audit-history API for reviewing those events.
- Migration 0018 intentionally creates no default administrator. The first Superadmin must be provisioned out-of-band using the documented secure runbook at docs/security/ADMIN_PORTAL_BOOTSTRAP.md.
- CI run #1010 (44136100170) passed API typecheck/tests, PostgreSQL integration tests for Superadmin authentication and offer management, shared-contract checks and Android bundle smoke test. CI run #1015 (44136368589) passed after admin session token-digest hardening. CI run #1017 (44136465606) passed the API typecheck/tests, PostgreSQL integration suite, shared-contract checks, mobile typecheck/unit tests and Android bundle smoke test. CI run #1022 (44136787654) also passed after adding audit-history pagination/filter integration coverage.
- Still outstanding: admin web UI, MFA, admin invitation/recovery lifecycle, audit export, security/penetration review, payment provider selection, checkout intent creation and signed webhook verification. No payment provider is configured and subscription purchases are not yet enabled.


## 22. Initial Superadmin console (2026-11-17)

- Added a dependency-free responsive static console at `apps/admin-console/index.html`. It uses the separate Superadmin bearer-token API and supports provisioned-account sign-in/sign-out, monthly/yearly offer configuration, active administrator session inventory/revocation and redacted audit-history browsing with action filtering and pagination.
- Admin access tokens are held in tab-scoped `sessionStorage`; the console does not hold database/provider credentials and does not create administrator accounts or grant learner entitlements.
- Added `docs/admin/SUPERADMIN_CONSOLE.md` with local preview, API origin/CORS configuration, HTTPS deployment requirements, session limitations and manual acceptance checks. Updated README and the admin bootstrap/security runbook.
- The session inventory excludes expired/revoked sessions and sessions belonging to suspended administrator accounts. Session revocation is audited.
- This is an initial functional static console prototype, not a production security sign-off. MFA, invitations/recovery, CSP/idle-timeout hardening, audit export, hosted browser QA and penetration testing remain outstanding.
- The latest console commits have not yet been verified by a reported CI run. Do not treat this UI as CI-validated or production-ready. The PR remains draft and unmerged; no deployment has been performed.


## 23. Gabroo speech operations reporting and India-local date handling (2026-11-24)

- Added the Superadmin-only aggregate endpoint `GET /api/v1/admin/gabroo/speech-usage`, with daily/monthly buckets, inclusive date filters, Asia/Kolkata timezone metadata, character totals, request counts and active-learner counts.
- Added `unique_learners` as a distinct learner count across the entire selected range so it is not confused with the sum of active learner buckets.
- Corrected the default 30-day filter to use Asia/Kolkata calendar dates rather than UTC dates. Added a regression test for the default window and retained month-start normalization for monthly reports.
- The report intentionally excludes learner identifiers, email addresses, transcripts and audio. It is not a quota-management interface or provider-spend report.
- CI run #1964 (`45361526265`) passed API typecheck/tests, shared-contract typecheck/tests, mobile typecheck/unit tests and Android production-bundle smoke test for commit `8aaa571`.
- India-local date correction commits `46e8cb7` and `b73eae9` are awaiting their own CI completion. The feature branch and draft PR remain unmerged; no deployment or physical Android device QA has been performed.
