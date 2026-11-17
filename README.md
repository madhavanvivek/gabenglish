# Gabenglish

**Learn English in Malayalam. Build confidence. Gradually think and speak in English.**

Gabenglish is an Android-first English-learning product for Malayalam-speaking learners in Kerala and India. **Gabroo** is the friendly, energetic learning companion who helps learners move from Malayalam-supported foundations to confident English communication.

## Product direction

- Five adaptive stages: Malayalam Mode; Malayalam + English Mix; English Practice Mode; English Immersion; Expert Communication.
- The first meaningful experience is a relaxed, progressively adaptive conversation with Gabroo—not a fixed multiple-choice exam.
- The assessment produces a structured, evidence-based report and a separate personalised explanation from Gabroo.
- Learners retain control: accept the recommendation, start at the beginning, choose another stage or request a harder challenge.
- Malayalam support remains available at every stage.
- Gabroo is friendly and funny but respectful. Do not use “eda/edi” by default; follow the learner's chosen communication style.
- Voice assessment requires informed microphone consent. Text-only assessment cannot claim verified pronunciation or speaking fluency.

Read the consolidated source of truth: [Product decisions and implementation status](docs/product/PRODUCT_DECISIONS_AND_IMPLEMENTATION_STATUS.md).

## Repository layout

- `apps/mobile` — Expo + React Native learner application.
- `apps/api` — Fastify + TypeScript API service.
- `packages/contracts` — shared Zod contracts.
- `docs/` — product, UX, brand, architecture, AI, curriculum, security and delivery specifications.

## Local setup

Requirements: Node.js 22+, pnpm 10.10+; PostgreSQL 15+ for database-backed readiness.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm dev:api
```

Liveness: `GET http://localhost:4000/api/v1/health`  
Readiness: `GET http://localhost:4000/api/v1/ready` (requires a reachable database).  
Database migrations: `DATABASE_URL=... pnpm --filter @gabenglish/api db:migrate` (review the target database and backup plan before running against any shared environment).

Start mobile: `pnpm --filter @gabenglish/mobile start`.

For the mobile app, copy `apps/mobile/.env.example` to `apps/mobile/.env` and set `EXPO_PUBLIC_API_BASE_URL` to the reachable Gabenglish API origin. Use an HTTPS URL outside localhost. A physical phone cannot reach your development computer through `localhost`; use a LAN address or a hosted development API. This variable is public app configuration—never place credentials or provider secrets in it.

## Current implementation status (2026-11-17)

Implemented on `foundation/app-skeleton`:
- pnpm workspace, Fastify API foundation and shared Zod contracts.
- Expo mobile prototype and GitHub Actions CI.
- Placement conversation start/respond API with session/turn validation.
- Deterministic predefined-prompt placement API with short-lived PostgreSQL-backed sessions when configured, an in-memory test/development fallback, evidence extraction and a provisional non-diagnostic report.
- Expo mobile conversation connected to the placement API, including dynamic server prompts, report rendering, request timeouts, explicit network/configuration errors and learner-controlled recovery when a session expires.
- Database-backed placement writes use optimistic revision checks to prevent concurrent responses from overwriting one another; safe retries return the already-recorded result.
- GitHub Actions provisions PostgreSQL 16 and exercises the initial schema migrations plus placement-session persistence, restart, concurrency and expiry integration tests.
- A checksum-verified migration runner applies ordered SQL files under a PostgreSQL advisory lock and records applied checksums in `schema_migrations`; it rejects edits to already-applied migrations.
- Database-backed subscription pricing and immutable 15-minute learner checkout quotes, with API endpoints for public prices and authenticated quote creation. Quotes do not initiate payments or grant access.
- Separate Superadmin authentication with revocable sessions, scrypt password verification, failed-login lockout, role checks and transactional/audited monthly/yearly offer management APIs.
- Learner account foundation: registration/sign-in API, scrypt password hashes, short-lived signed access tokens, hashed rotating refresh tokens, logout, authenticated profile/preferences, consent records and account deletion requests; mobile sign-in/registration screen uses Expo SecureStore for tokens.
- PostgreSQL-backed login attempt throttling stores keyed email/IP digests rather than raw values.
- Product, placement and Gabroo communication documentation.

Latest CI evidence for the current foundation code: hosted workflow run #1010 (`44136100170`) passed API typecheck/tests, PostgreSQL-backed integration checks (including Superadmin sign-in, offer updates, audit records and session revocation), shared-contract typecheck/tests, mobile typecheck/unit tests and the Expo Android production-bundle smoke test. Later security-token and documentation updates are being revalidated in newer workflow runs. Temporary Mac runner workflow run #7 (`44129446387`) also completed successfully on `gabenglish-mac`; API typecheck, API tests, PostgreSQL integration tests, shared-contract typecheck/tests and mobile typecheck all passed. These runs validate automated checks only, not Android device QA or production readiness.

**Important limitations:** the assessment is not yet a live AI tutor; the prompt sequence is not a validated proficiency rubric; PostgreSQL session persistence depends on database configuration and migrations; the free diagnostic report is provisional and intentionally makes no validated skill or stage recommendation. The OTP API and mobile flow exist, but delivery remains unavailable until an email/SMS adapter and provider credentials are configured; the legacy password routes remain in the API and must be retired before public beta. Production AI tutor and Gabroo voice providers, validated STT/TTS and pronunciation assessment, payment-provider checkout/webhooks, the Superadmin web UI/MFA/recovery lifecycle, full learner account recovery/deletion processing, complete educator-reviewed curriculum, notification scheduling, Android device QA and production deployment remain pending. Gabroo's physical character design is not final or approved for production.

See the consolidated status document for the full list of completed work, limitations and next steps.

## Project isolation

Gabenglish is independent. Do not use resources, credentials, databases, repositories or deployments belonging to Ozhzo, Fabnotch, Endroser, Approver or other projects. Do not provision paid production resources or merge the draft PR without explicit review/approval.
