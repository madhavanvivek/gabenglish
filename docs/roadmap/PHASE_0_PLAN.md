# Phase 0 — Documentation and Foundation Plan

Version 1.1 — active planning baseline; Gabroo identity is already approved and locked.

## 1. Objective
Complete product, design, character-production, technical, AI, curriculum, privacy and delivery foundations before substantial public-release implementation.

## 2. Workstreams
### Product
Requirements, target audience, five-stage model, MVP/public-release boundary, success metrics and assumptions register.

### UX/design
Information architecture, screen inventory, user journeys, wireframes, interaction specs, design tokens, components, accessibility and empty/error/loading states.

### Gabroo — identity locked, production pending
Use only **Concept C — Signature Gabroo**, as documented in `docs/brand/GABROO_CHARACTER_GUIDE.md` and the owner-approved source artwork. Do not explore, compare, generate, substitute or redesign character concepts. Audit source asset provenance; produce the production model, rig, expressions, gestures and Android-ready exports strictly from the approved identity. Follow `docs/roadmap/GABROO_LIVE_AVATAR_DELIVERY_PLAN.md`.

### Technical
Repository/package boundaries; mobile/backend/admin architecture; ERD and physical schema plan; API/OpenAPI; auth/roles; jobs/storage; architecture decision records.

### AI/speech
Malayalam/code-switch corpus; tutor benchmark; STT and male TTS benchmark; cost, latency, privacy/licensing comparison; provider and fallback decision. The exact Gabroo voice remains pending a blind benchmark and explicit owner approval.

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
4. Audit the already-approved Gabroo source artwork; proceed directly to production model/rig planning without reopening character concepts.
5. Define architecture decisions and ERD.
6. Produce API/OpenAPI contracts.
7. Run AI/speech benchmarks and obtain owner approval for the canonical voice.
8. Define curriculum taxonomy and sample lessons.
9. Prepare Render and CI/CD.
10. Complete security review and Phase 1 backlog.

Some work can run in parallel. The character identity is not pending approval; only production asset delivery and QA are pending. Voice provider/voice identity selection remains pending evaluation and owner approval.

## 4. Exit gates
Product requirements approved; core screen flows and components reviewed; approved Gabroo source provenance and production model/rig plan ready; architecture/ADRs reviewed; ERD/migration strategy ready; API contracts reviewed; AI/speech benchmark evidenced and canonical voice approved; curriculum/editorial process approved; Render/CI design verified; security/privacy reviewed; Phase 1 backlog has estimates, dependencies and acceptance criteria.

## 5. Phase 1 entry scope
Repository/CI foundation; mobile shell/design system; backend skeleton/health checks; authentication/profile; registration-to-Meet-Gabroo onboarding; conversational assessment; curriculum delivery/progress persistence; first grammar, vocabulary and translation flows. Speaking AI proceeds behind provider-neutral interfaces while voice selection and privacy gates are completed.

## 6. Delivery discipline
Track work in issues; use PRs; require lint/typecheck/tests; keep main deployable; record decisions; update docs when implementation diverges; review resource costs before creating paid production infrastructure; distinguish verified facts from estimates and pending decisions. Never represent a spec, storyboard or placeholder as a completed production feature.
