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

## Current implementation status (2026-11-16)

Implemented on `foundation/app-skeleton`:
- pnpm workspace, Fastify API foundation and shared Zod contracts.
- Expo mobile prototype and GitHub Actions CI.
- Placement conversation start/respond API with session/turn validation.
- Deterministic predefined-prompt placement API with short-lived PostgreSQL-backed sessions when configured, an in-memory test/development fallback, evidence extraction and a provisional non-diagnostic report.
- Expo mobile conversation connected to the placement API, including dynamic server prompts, report rendering, request timeouts, explicit network/configuration errors and learner-controlled recovery when a session expires.
- Database-backed placement writes use optimistic revision checks to prevent concurrent responses from overwriting one another; safe retries return the already-recorded result.
- GitHub Actions provisions PostgreSQL 16 and exercises the initial schema migrations plus placement-session persistence, restart, concurrency and expiry integration tests.
- A checksum-verified migration runner applies ordered SQL files under a PostgreSQL advisory lock and records applied checksums in `schema_migrations`; it rejects edits to already-applied migrations.
- Learner account API foundation: registration/sign-in, scrypt password hashes, short-lived signed access tokens, hashed rotating refresh tokens, logout, authenticated profile/preferences, consent records and account deletion requests.
- PostgreSQL-backed login attempt throttling stores keyed email/IP digests rather than raw values.
- Product, placement and Gabroo communication documentation.

Latest CI verification: GitHub Actions workflow run 43862840171 passed with PostgreSQL 16 provisioned for the API job. All 27 API tests passed across five files, including migration runner and learner account lifecycle integration tests. API typecheck, shared-contract typecheck and mobile typecheck also passed. The previous PostgreSQL session/concurrency integration checkpoint passed in workflow run 43861505662.

**Important limitations:** the assessment is not yet a live AI tutor; the prompt sequence is not a validated proficiency rubric; PostgreSQL session persistence is conditional on database configuration and migration 0002 being applied; no durable authenticated learner report history exists; the report is provisional and intentionally makes no skill or stage recommendation; no voice capture or personalised voice explanation is connected. Microphone capture, STT, TTS, pronunciation assessment, email verification, password reset, MFA, full account recovery/deletion processing, learner-linked assessment history, complete curriculum delivery, admin, subscriptions/payments and production deployment remain pending. Gabroo's physical character design is not final or approved for production.

See the consolidated status document for the full list of completed work, limitations and next steps.

## Project isolation

Gabenglish is independent. Do not use resources, credentials, databases, repositories or deployments belonging to Ozhzo, Fabnotch, Endroser, Approver or other projects. Do not provision paid production resources or merge the draft PR without explicit review/approval.
