# Gabenglish Technical Architecture

Version 1.0 — proposed; implementation choices subject to Phase 0 validation.

## 1. Goals
Android-first with shared iOS-ready mobile code; modular backend; replaceable AI/speech providers; secure identity/audio/payment handling; reliable progress and content versioning; observable Render deployment; cost-aware AI orchestration.

## 2. Proposed stack
- Mobile: React Native, Expo, TypeScript.
- Admin: React, TypeScript, Tailwind CSS.
- Backend: Node.js, TypeScript.
- API: versioned REST.
- Database: PostgreSQL.
- Contracts: shared schemas and OpenAPI.
- Background work: dedicated worker and queue approach after evaluation.
- Media: S3-compatible object storage.
- Push: Firebase Cloud Messaging; iOS push setup later.
- CI: GitHub Actions.
- Hosting: Render.
- Monitoring: structured logs, error tracking and health checks.

Pin exact package versions and lockfiles during implementation.

## 3. Logical services
Mobile owns presentation, local state, permissions, secure token storage and audio capture/playback; never provider secrets. API owns auth, validation, learning state, entitlements, AI orchestration and audit events. Worker handles asynchronous audio, notifications, reports and revision scheduling. Admin handles authorised content, support, provider config, analytics and audit. PostgreSQL is transactional source of truth. Object storage holds approved learning audio and only consented/retention-compliant user recordings.

## 4. Backend modules
Identity; profiles; assessment; curriculum; lessons; exercises; vocabulary; translation; listening; speaking; tutor orchestration; speech; progress/recommendations; subscriptions/payments; notifications; administration; audit/analytics. Avoid circular dependencies.

## 5. AI/speech adapters
Define internal interfaces for chat/text generation, structured feedback, answer evaluation, STT, TTS and optional streaming. Provider-specific types must not leak into domain logic. Record provider/model/config version, latency, token/audio usage and outcome for cost/quality analysis. Avoid unnecessary sensitive prompt logging.

## 6. API governance
Prefix /api/v1; validate external input; stable error envelope; pagination; auth and AI/audio rate limits; idempotency for payment/retry-sensitive writes; OpenAPI documentation; shared client/server contracts where practical.

## 7. Render topology
Dedicated Gabenglish environment, no reuse of other product databases/services. Proposed resources: API web service, admin web service, PostgreSQL, worker if required, staging/production separation. Store media outside ephemeral application disks. Instance sizes, region, service count, queue and backup tier require cost/workload review. Do not create paid production resources before reviewing the plan.

## 8. Environments
Local: isolated DB and mock/restricted provider credentials. Staging: production-like settings, test accounts, sandbox providers and synthetic data. Production: restricted secrets, protected DB, monitored services, verified payments, backups and audited administration. Never copy production personal data to development.

## 9. Planned repository boundaries
apps/mobile; apps/admin; services/api; services/worker; packages/contracts; packages/design-system; packages/shared; infrastructure/render; docs. Start with a monorepo unless a concrete reason to split emerges.

## 10. Reliability
Liveness/readiness endpoints; correlation IDs; error/latency monitoring; provider latency/failure metrics; usage/cost dashboards; migration checks; backup/restore verification; graceful provider outage handling; bounded retry for safe operations; no blind retries of non-idempotent payment operations.

## 11. Open architecture decisions
Auth provider/session strategy; ORM/migrations; queue; object storage; AI model; STT; TTS; 3D runtime/asset pipeline; payment provider. Record each in an ADR with context, options, decision, consequences and review date.
