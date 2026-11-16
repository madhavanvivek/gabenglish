# Gabenglish

**Learn English in Malayalam. Build confidence. Gradually think and speak in English.**

Gabenglish is an Android-first English-learning product for Malayalam-speaking learners, supported by Gabroo, its friendly AI English buddy.

## Repository layout
- `apps/mobile` — Expo + React Native learner application.
- `apps/api` — Fastify + TypeScript API service.
- `packages/contracts` — shared Zod contracts.
- `docs/` — product, UX, brand, architecture, AI, curriculum and security documentation.
- `infrastructure/database` — PostgreSQL migrations and operating notes.

## Requirements
Node.js 22+, pnpm 10.10+, PostgreSQL 15+ for database-backed readiness.

## Local setup
```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm dev:api
```
Liveness: `GET http://localhost:4000/api/v1/health`  
Readiness: `GET http://localhost:4000/api/v1/ready` (requires DATABASE_URL).

Start mobile: `pnpm --filter @gabenglish/mobile start`

## Current status
The foundation branch contains an initial pnpm monorepo scaffold, Fastify health/readiness API, API tests, shared Zod contracts, and Expo welcome screen. Authentication, learner workflows, content delivery, speech/AI integrations, production Gabroo assets, admin UI and payment flows are not implemented yet. The GitHub Actions workflow is configured; successful CI execution must be confirmed from its run results.

Do not use resources, credentials or deployments belonging to Ozhzo, Fabnotch, Endroser or other projects.

