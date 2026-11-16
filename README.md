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

Start mobile: `pnpm --filter @gabenglish/mobile start`.

## Current implementation status (2026-11-16)

Implemented on `foundation/app-skeleton`:
- pnpm workspace, Fastify API foundation and shared Zod contracts.
- Expo mobile prototype and GitHub Actions CI.
- Placement conversation start/respond API with session/turn validation.
- Deterministic predefined-prompt placement prototype and a local text-only mobile conversation prototype.
- Product, placement and Gabroo communication documentation.

Latest confirmed CI run `43848505407`: API and mobile jobs passed (API typecheck/tests, contracts typecheck and mobile typecheck).

**Important limitations:** the assessment is not yet a live AI tutor; the heuristic is not a validated proficiency rubric; sessions are in-memory; the mobile prototype is not yet API-connected; there is no evidence-based learner report or personalised voice explanation yet. Microphone capture, STT, TTS, pronunciation assessment, authentication, persistent learner accounts, complete curriculum delivery, admin, subscriptions/payments and production deployment remain pending. Gabroo's physical character design is not final or approved for production.

See the consolidated status document for the full list of completed work, limitations and next steps.

## Project isolation

Gabenglish is independent. Do not use resources, credentials, databases, repositories or deployments belonging to Ozhzo, Fabnotch, Endroser, Approver or other projects. Do not provision paid production resources or merge the draft PR without explicit review/approval.
