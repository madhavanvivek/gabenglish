# Phase 0 — Documentation and Foundation Plan

Version 1.0 — active planning baseline.

## 1. Objective
Complete product, design, character, technical, AI, curriculum, privacy and delivery foundations before substantial application implementation.

## 2. Workstreams
### Product
Requirements, target audience, five-stage model, MVP/public-release boundary, success metrics and assumptions register.

### UX/design
Information architecture, screen inventory, user journeys, wireframes, interaction specs, design tokens, components, accessibility and empty/error/loading states.

### Gabroo
Locked personality; explore kid, bigger/adult and ageless concepts; compare; obtain explicit owner approval; create canonical model sheet; define rig, animation and mobile performance plan.

### Technical
Repository/package boundaries; mobile/backend/admin architecture; ERD and physical schema plan; API/OpenAPI; auth/roles; jobs/storage; architecture decision records.

### AI/speech
Malayalam/code-switch corpus; tutor benchmark; STT and male TTS benchmark; cost, latency, privacy/licensing comparison; provider and fallback decision.

### Curriculum
Five-stage outcomes; course/module taxonomy; lesson/exercise schemas; alternative-answer rubric; editorial QA.

### Infrastructure
Dedicated Render plan; local/staging/production boundaries; GitHub Actions; secrets; monitoring; backup/recovery; release/rollback.

### Security/privacy
Data classification; voice consent/retention; auth/authorisation; payment security; account deletion; security test plan.

## 3. Recommended order
1. Review repository and branch state.
2. Review/approve documentation baseline.
3. Create UX flows and screen designs.
4. Explore Gabroo concepts and obtain approval.
5. Define architecture decisions and ERD.
6. Produce API/OpenAPI contracts.
7. Run AI/speech benchmarks.
8. Define curriculum taxonomy and sample lessons.
9. Prepare Render and CI/CD.
10. Complete security review and Phase 1 backlog.

Some work can run in parallel. Do not treat character production or provider selection as approved before evaluation.

## 4. Exit gates
Product requirements approved; core screen flows and components reviewed; Gabroo concept and model sheet approved; architecture/ADRs reviewed; ERD/migration strategy ready; API contracts reviewed; AI/speech benchmark evidenced; curriculum/editorial process approved; Render/CI design verified; security/privacy reviewed; Phase 1 backlog has estimates, dependencies and acceptance criteria.

## 5. Phase 1 entry scope
Repository/CI foundation; mobile shell/design system; backend skeleton/health checks; authentication/profile; onboarding/assessment; curriculum delivery/progress persistence; first grammar, vocabulary and translation flows. Speaking AI proceeds once provider and privacy decisions are sufficiently complete.

## 6. Delivery discipline
Track work in issues; use PRs; require lint/typecheck/tests; keep main deployable; record decisions; update docs when implementation diverges; review resource costs before creating paid production infrastructure; distinguish verified facts from estimates and pending decisions.


## 7. Foundation implementation checkpoint (2026-11-16)

### Completed at scaffold/prototype level
- pnpm monorepo, Fastify API skeleton, shared Zod contracts and Expo mobile shell.
- GitHub Actions workflow for API/contracts and mobile typecheck.
- Gabroo conversational placement requirements and respectful communication policy.
- Placement conversation start/respond prototype routes with session/turn validation.
- Local text-only mobile conversation prototype.

Latest confirmed CI run `43848505407` passed the API and mobile jobs. This confirms the configured checks only; it does not certify production readiness.

### Still required before Phase 0 can be declared complete
- Full OpenAPI and reviewed assessment contracts; ERD, database migrations and retention model.
- Skill evidence model, calibrated placement rubric, report specification and separate Gabroo explanation flow.
- API-connected mobile journey and persisted assessment lifecycle.
- UX wireframes, design tokens and reviewed component system.
- First educator-reviewed Malayalam-supported lesson pack and curriculum taxonomy.
- AI/STT/TTS benchmark and provider decision.
- Final Gabroo character approval, canonical model sheet and production asset/rig plan.
- Authentication, security threat model, deployment/backup/restore plan and release gates.
- Prioritised Phase 1 backlog with estimates, dependencies and acceptance criteria.

Do not mark Phase 0 complete merely because the scaffold or prototype CI passes.
