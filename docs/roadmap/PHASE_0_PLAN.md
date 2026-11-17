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

Latest scaffold hosted CI run `44129311415` passed API and mobile jobs, including the Android production-bundle smoke test. The subsequent temporary-Mac run `44129446387` also passed all executed validation steps. These confirm configured checks only; they do not certify production readiness.

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


## 8. Foundation implementation checkpoint (2026-11-17)

### Repository and review state
- Application foundation is maintained on `foundation/app-skeleton`; PR #1 targets review and remains a draft. Do not merge or deploy it without owner approval.
- The application scaffold includes the pnpm workspace, Fastify API, shared Zod contracts and Expo mobile application. The PR description records the current implemented workflows and their limitations.
- The manual temporary-Mac CI workflow checks out `foundation/app-skeleton` and validates API typecheck/tests, PostgreSQL integration tests, shared-contract checks and mobile typecheck.
- The temporary self-hosted Mac runner has since been reconnected and verified by a completed run (workflow run #7, ID `44129446387`, commit `c6b92b27731d955615a0001932793cf8ab9632`). The `gabenglish-mac` runner executed toolchain verification, PostgreSQL 16 startup, dependency installation, API typecheck/tests and PostgreSQL integration tests, shared-contract typecheck/tests, and mobile typecheck; all steps passed. The earlier runner-allocation failure is resolved for this run.

### Product decision reconciliation
- Monthly launch price is ₹79 against ₹99 standard; yearly launch price is ₹799 against ₹1,188 standard.
- Superadmin-configured monthly/yearly discounts can apply to renewals and re-purchases while the relevant offer remains enabled and within its configured offer window. Each checkout must snapshot its server-calculated price; later admin changes must not rewrite completed purchases.
- The subscription and product specifications were reconciled on 2026-11-17 to remove the obsolete ₹69 monthly price and first-purchase-only discount rule.
- Gabroo speaking-speed preference remains a learner-controlled setting; validate end-to-end playback-rate behavior on physical Android devices before claiming voice playback is complete.

### Immediate next gates
1. Keep the self-hosted Mac runner healthy and retain the passing validation run as evidence; add any missing test coverage as workflows mature.
2. Review PR #1 and reconcile its remaining implementation checklist against the current product decisions.
3. Add and verify the server-side subscription offer calculator for initial purchases, renewals/re-purchases, disabled/expired offers and immutable transaction price snapshots. The pure quote calculator and unit tests have now been added; checkout persistence and admin configuration remain outstanding.
4. Complete Android end-to-end QA for account lifecycle, free placement, paid entitlement, open Gabroo conversation, saved speaking speed and navigation/accessibility.
5. Keep production deployment blocked until secrets, OTP delivery, payment verification, speech-provider decisions and release checks are complete.

This checkpoint is a status record, not a claim that the listed gates have passed.


## 9. CI runner recovery checkpoint (2026-11-17)

- Temporary Mac workflow run #7 (`44129446387`) completed successfully on the `gabenglish-mac` self-hosted runner. API typecheck, API tests, PostgreSQL integration tests, shared-contract typecheck/tests and mobile typecheck all passed.
- Hosted CI run #981 (`44129311415`) also passed API and mobile jobs, including the Expo Android production-bundle smoke test.
- The PR description and this plan should treat the earlier runner-allocation issue as resolved for these runs. Continue monitoring runner availability; do not infer device QA or production readiness from CI alone.


## 10. Subscription pricing foundation checkpoint (2026-11-17)

- Added `apps/api/src/subscription-pricing.ts`, a deterministic server-side quote calculator for the two approved INR plans.
- Initial offer defaults are represented as versioned rules: Monthly ₹99 → ₹79 (20.20%) and Yearly ₹1,188 → ₹799 (32.74%).
- Offer eligibility is evaluated at a supplied server timestamp; start is inclusive and end is exclusive. Disabled or out-of-window offers return the standard price.
- Discounts are rounded to the nearest whole rupee using integer minor-unit amounts. The quote includes standard, discount and payable amounts, offer version, and evaluation timestamp so a future checkout handler can persist an immutable snapshot.
- Added unit coverage for both launch prices, renewal/re-purchase parity, disabled and time-windowed offers, rounding, and invalid configuration.
- This is a tested pricing-calculation foundation only. It is not yet connected to checkout, payment-provider verification, Superadmin offer management, or entitlement activation. Do not describe subscriptions as purchasable until those flows are implemented and tested.

## 11. Persisted subscription quote foundation checkpoint (2026-11-17)

- Added migration `0016_subscription_offer_pricing.sql`: database-backed monthly/yearly offer rules, seeded from the approved INR list prices and current launch discounts, with an automatic version bump on every update.
- Added immutable price-snapshot columns to payment transactions. A snapshot is either entirely absent for legacy rows or fully populated and arithmetically consistent with the transaction amount.
- Added public `GET /api/v1/subscriptions/prices`, which calculates current prices from the database offer rules rather than client-supplied amounts.
- Updated verified entitlement activation to retain standard price, discount and paid amount from a verified transaction snapshot. Legacy transactions without a snapshot retain the existing full-price validation path.
- Added migration `0017_subscription_checkout_quotes.sql` and authenticated `POST /api/v1/subscriptions/checkout/quote`. It stores a learner-owned, immutable quote with a 15-minute validity window and returns `access_granted: false`.
- A quote is not a payment intent, payment confirmation, subscription or entitlement. No provider was selected; no payment was initiated; no paid access is granted by quote creation.
- Added API and PostgreSQL integration coverage for public pricing, quote ownership/expiry, immutable quote rows, offer version changes and discounted entitlement activation.
- CI run #995 passed the pricing/offer migration, API and Android checks. The first checkout-quote integration run exposed a test-isolation assumption about the mutable offer version; the assertion was corrected to compare the stored quote with the version returned by that quote. CI run #1003 then passed API typecheck/tests, PostgreSQL integration tests, shared-contract checks and Android bundle smoke tests. CI run #1004 is validating the subsequent OpenAPI documentation update.

### Remaining subscription release gates
- Admin authentication/authorisation and Superadmin offer-management UI/API.
- Payment provider decision, credentials, server-side payment intent creation, signed webhook verification and replay protection.
- Converting an unexpired quote into a payment transaction while copying its immutable price snapshot.
- End-to-end tests for successful, failed, duplicated, refunded and expired payment events.
- Learner-facing checkout UI, subscription history and cancellation/renewal experience.


- OpenAPI contract updated to describe public subscription prices, authenticated quote creation and current entitlement lookup. The quote contract explicitly states that creating a quote does not create a payment intent or grant paid access.

## 12. Superadmin subscription controls checkpoint (2026-11-17)

- Added migration 0018_admin_subscription_controls.sql with a separate admin session store, failed-login counters/lockout fields and the Superadmin role. No default administrator account or password is created.
- Added an isolated admin authentication boundary with distinct token issuer/audience, revocable database-backed sessions, password verification using the repository's scrypt format, and a 15-minute lockout after repeated failed attempts.
- Added Superadmin-only endpoints to list and update monthly/yearly offer discounts and offer windows. Standard prices remain fixed. Every update increments the database version and is recorded in admin_audit_events in the same transaction.
- Registered admin routes in the API, added a secure out-of-band first-Superadmin provisioning runbook and documented the endpoints in OpenAPI.
- PostgreSQL integration coverage now exercises Superadmin login, offer read/update, price recalculation, invalid date-window rejection, audit record creation and session revocation. The latest run is pending; do not treat this new checkpoint as CI-green until verified.

### Remaining admin release gates
- Build the actual admin web UI and account invitation/recovery lifecycle.
- Add MFA and operational monitoring/alerting for admin lockouts and audit events.
- Perform a focused security review and penetration test before production exposure.
- Payment provider selection, checkout intent creation and signed webhook verification remain separate blockers.

### Superadmin validation result
- Hosted CI run #1010 (44136100170) passed the new Superadmin/PostgreSQL integration tests.
- Hosted CI run #1015 (44136368589) passed after storing and verifying the digest of the issued admin access token against its revocable database session.
- Hosted CI run #1017 (44136465606) passed the latest API typecheck/tests, PostgreSQL integration suite, shared-contract typecheck/tests, mobile typecheck/unit tests and Expo Android production-bundle smoke test.
- The Superadmin API foundation is therefore CI-validated. The admin web UI, MFA, invitation/recovery lifecycle, audit browser, security review and production deployment remain incomplete.