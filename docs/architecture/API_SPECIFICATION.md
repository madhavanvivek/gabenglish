# Gabenglish API Specification

Version 1.0 — contract outline; OpenAPI schemas required before implementation.

## 1. Conventions
Base path /api/v1; HTTPS outside local development; JSON by default; bearer auth on protected routes; input validation; pagination; request/correlation IDs; stable error codes; rate limits; idempotency for payment initiation and retry-sensitive writes.

Example error:
- error.code: VALIDATION_ERROR
- error.message: user-safe explanation
- error.request_id: correlation ID
- error.details: field-level safe details

Never expose stack traces, provider secrets or internal prompts.

## 2. Authentication/profile — approved passwordless OTP model
The B2C learner experience uses verified email or phone OTP, not passwords. Proposed contracts:
- POST `/api/v1/auth/otp/request` — request an email or phone OTP using `{channel,destination}`.
- POST `/api/v1/auth/otp/verify` — atomically verify a one-time code and issue a session only after verification.
- POST `/api/v1/auth/contacts/otp/request` — request a challenge for a new email or phone while authenticated.
- POST `/api/v1/auth/contacts/otp/verify` — verify and attach the contact to the current learner account without merging accounts.
- POST /auth/refresh and POST /auth/logout — rotate/revoke sessions.
- GET/PATCH /users/me and GET/PATCH /users/me/preferences — account/profile/preferences.

OTP values must be hashed/keyed, expire after five minutes, be one-time, attempt-limited (maximum five attempts), resend-cooled-down and rate-limited per destination and IP. Mask destinations and avoid account enumeration. Do not issue sessions before a contact is verified. Email and SMS delivery adapters remain provider-neutral pending selection. The request and verification endpoints now exist, including destination/IP throttling, five-minute expiry, maximum five attempts, keyed OTP digests, generic verification errors, session issuance after verification and replay rejection. The delivery adapter is injectable and fails closed when none is configured; no real email/SMS provider is connected, so customer delivery is not operational. Migration `0004_passwordless_otp.sql` provisions challenge storage and a verified-contact registry. Shared Zod contracts validate email/phone requests and six-digit codes. Verified-contact linking is implemented through authenticated challenge/request and verification routes. Legacy password routes are disabled outside automated tests. The placement conversation start/respond routes now require a verified bearer session, bind sessions to the learner account and reject cross-account access; anonymous placement is disabled. The current password endpoints/screen remain a prototype and must not be presented as the approved B2C flow.

## 3. Assessment
POST /assessments; GET /assessments/{id}; POST /assessments/{id}/answers; POST /assessments/{id}/complete; GET /assessments/{id}/result. Tie submissions to published versions and make retries safe.

## 4. Curriculum/progress
GET /learning/path; GET /learning/stages; GET /learning/stages/{id}; GET /courses/{id}; GET /modules/{id}; GET /lessons/{id}; POST /lessons/{id}/start; POST /lessons/{id}/complete; GET /progress/overview; GET /progress/skills. Completion validated server-side.

## 5. Practice
GET /vocabulary/daily; POST /vocabulary/{id}/save; DELETE /vocabulary/{id}/save; GET /vocabulary/review; POST /vocabulary/review/attempt; POST /practice/translation/attempts; POST /practice/listening/{activityId}/attempts; POST /practice/pronunciation/attempts. Responses distinguish correctness, naturalness and explanation.

## 6. Speaking/tutor
POST /speaking/sessions; GET /speaking/sessions/{id}; POST /speaking/sessions/{id}/turns; POST /speaking/sessions/{id}/end; GET /speaking/sessions/{id}/summary; POST /tutor/respond; POST /tutor/feedback. A turn supports transcript or controlled audio reference; do not embed large base64 audio in JSON.

## 7. Media/speech
POST /media/upload-intents; POST /media/{id}/complete; POST /speech/transcriptions; POST /speech/syntheses; DELETE /media/{id}. Use short-lived signed access; validate type, size, duration, ownership and consent.

## 8. B2C subscriptions and entitlement
Only two plans are offered initially:
- Monthly: ₹99 standard / ₹79 launch price; 30 days.
- Yearly: ₹1,188 standard / ₹799 launch price; 360 days (12 × 30 days).

GET /subscriptions/plans returns server-owned active prices and durations; GET /subscriptions/current returns the verified paid-through entitlement (authenticated read route implemented; currently reports free access when no verified entitlement exists); POST /subscriptions/checkout creates an idempotent checkout; POST /subscriptions/cancel handles the approved cancellation policy; POST /subscriptions/webhooks/{provider} receives signed, deduplicated payment events.

The free account and free analysis test/result do not require paid entitlement. A verified learner can retain the free analysis report. `GET /api/v1/placement/reports/latest` returns the latest account-owned report after sign-in, including after paid subscription expiry. Gabroo ongoing learning companion, classes, paid practice, ongoing learner assessment/profile and progress require an active server-side entitlement. Basic account settings are not gated. Access expires when now >= paid-through end timestamp. Monthly duration is 30 days; yearly duration is 360 days. Keep the existing free result distinct from paid assessment/profile history. Payment client callbacks are never proof of payment.

## 9. Administration
GET /admin/users; GET /admin/users/{id}; GET/POST /admin/content; PATCH /admin/content/{id}; POST /admin/content/{id}/publish; GET /admin/ai/providers; PATCH /admin/ai/configurations/{id}; GET /admin/analytics; GET /admin/audit-logs. Enforce roles server-side and audit sensitive actions.

## 10. Example tutor turn
Request fields: session_id; input.type (text or audio reference); input.text when text; correction_mode. Response fields: turn_id; reply.text/language/audio_asset_id; feedback.original/corrected/category/explanation_ml/natural_alternatives.

## 11. Required next contracts
OpenAPI 3.x; request/response schemas; auth and role matrix; error catalogue; pagination/filter conventions; rate limits; idempotency; contract tests and generated-client strategy.


## 12. Implemented placement conversation pilot (foundation branch)

The current Fastify service exposes these prototype routes:
- `POST /api/v1/placement/conversation/start` — requires a verified learner bearer session, validates preferred support language, optional display name and communication style; creates an account-owned session and returns the first prompt.
- `POST /api/v1/placement/conversation/respond` — requires the owning verified learner session, validates session ID and prompt/turn order; accepts a text response and returns the next prototype prompt or completion state.
- `GET /api/v1/placement/reports/latest` — returns the latest persisted free diagnostic report for the signed-in learner; it remains available without paid entitlement.
- Legacy pilot routes remain: `GET /api/v1/placement/questions` and `POST /api/v1/placement/score`. These are fixed multiple-choice pilot endpoints and are not the intended primary placement experience.

**Prototype limitations:** conversation sessions are held in process memory; prompt content is predefined; adaptation uses a simple heuristic; the mobile prototype is not yet connected to these routes; there is no persistent assessment history, validated rubric, detailed learner report, or personalised Gabroo voice explanation. The endpoints are not a production assessment contract.

Before production, replace or version this pilot with an OpenAPI-reviewed contract that supports:
- authenticated or privacy-reviewed anonymous sessions, expiry, explicit completion/abandonment and safe resume policy;
- response mode, consent reference and transcript confidence for voice submissions;
- prompt/evidence identifiers and skill/difficulty metadata without leaking answer keys or internal evaluation prompts;
- evidence-based skill findings with confidence, coverage and "not assessed" states;
- a separate report resource and Gabroo explanation resource (text plus optional audio asset);
- learner stage selection/override and recommendation acknowledgement;
- idempotency, rate limits, ownership checks, retention/deletion and audit events.

Do not expose a learner-facing numeric score until the rubric has been calibrated and approved.


## Legacy password-auth prototype (implemented, superseded by the approved OTP model)

These routes exist only as a temporary engineering prototype on the foundation branch. They are not the approved B2C authentication experience and must be replaced by the passwordless email/phone OTP contracts in section 2 before public beta. The existing session implementation has short-lived access tokens bound to revocable refresh-session rows and hashed, rotating refresh tokens, but its password-based registration/login must not be extended as the customer sign-up flow.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/v1/auth/register` | Create learner account, profile and default preferences |
| POST | `/api/v1/auth/login` | Verify credentials and issue access/refresh tokens |
| POST | `/api/v1/auth/refresh` | Revoke the presented refresh token and rotate it |
| POST | `/api/v1/auth/logout` | Revoke the presented refresh token |
| GET | `/api/v1/auth/me` | Return authenticated profile and preferences |
| PATCH | `/api/v1/auth/me` | Update display name, locale or timezone |
| PATCH | `/api/v1/auth/me/preferences` | Update support language, learning goal, correction mode, daily target or reminders |
| POST | `/api/v1/auth/me/consents` | Record a purpose and policy-version consent decision |
| POST | `/api/v1/auth/me/deletion-request` | Disable the account and revoke refresh sessions; does not perform final erasure |

Security limitations of this prototype: it does not verify email or phone, has no OTP delivery, and registration activates an unverified account. It is unsuitable for public B2C launch. The database-backed password login throttling is prototype-only and will need to be redesigned for OTP send/verify abuse controls. Full account erasure and learner-linked assessment history are not implemented.


Mobile account client: `apps/mobile/src/auth-api.ts` and `apps/mobile/app/account.tsx` currently demonstrate password-based registration/login and secure token storage only. This screen is superseded by the approved email/phone OTP experience and should be replaced rather than presented as the final sign-up UX.


## 13. Subscription entitlement schema foundation — 16 November 2026

Migration `0008_verified_subscription_entitlements.sql` adds the first fail-closed paid-access ledger. It does not connect a payment provider, create checkout sessions, or grant any learner paid access.

- Restricts initial plan codes to `monthly` and `yearly`; regional billing intervals are limited to 30-day month and 360-day year conventions, with INR currency.
- Adds verified-payment metadata to payment transactions.
- Adds immutable purchase-level entitlement snapshots containing the provider/event reference, plan, INR price/discount snapshot, verified payment timestamp and exact period.
- Requires a verified-payment timestamp and unique provider event reference for each entitlement; duplicate payment/event grants are constrained by unique keys.
- Enforces exact 30-day and 360-day periods in PostgreSQL.
- Adds `active_subscription_entitlements`, a database read view that returns only verified, currently in-period access (`period_start <= now() < period_end`).

The migration intentionally creates no plan rows, price rows, payment records or active entitlements. The payment provider remains undecided. A future webhook/verification handler must validate provider signatures and server-to-server payment state, process events transactionally and idempotently, and be the only application path that writes entitlement rows. Paid feature routes are not yet implemented or gated by this view; no live paid feature should be exposed until those gates are in place. Free diagnostic reports and basic account access remain independent.

CI is required to validate migration application, constraints, view behaviour and safe re-run before this schema foundation is considered complete.


### Implemented entitlement status read route

`GET /api/v1/subscriptions/current` now requires an authenticated, verified learner session and reads only from `active_subscription_entitlements`. It returns `access: "free"` when no currently valid, verified entitlement exists, or a server-derived paid entitlement snapshot when one does. The route does not accept a client-supplied plan/status and has no grant, checkout or payment mutation capability. Paid feature routes must call the server-side entitlement lookup before serving protected content; that route-level gating is still pending.


### Verified payment activation service

The API foundation now includes an internal `activateVerifiedSubscriptionPayment(pool, paymentTransactionId)` service. It is not an HTTP endpoint and must only be called after a trusted payment-provider adapter has verified the provider signature and independently confirmed the payment server-to-server.

The service:
- locks the payment and subscription rows in a database transaction;
- rejects anything not marked successful, verified and associated with a provider event ID;
- checks the captured amount/currency against the server-owned regional price and checks the plan/billing interval pairing;
- creates one immutable 30-day or 360-day entitlement and activates the subscription atomically;
- safely returns the existing entitlement on an idempotent retry.

Integration coverage verifies that a successful-but-unverified payment is rejected, a verified price-matched monthly payment creates exactly 30 days of access, replay does not create a second entitlement, and the authenticated subscription status then reports paid access.

**Not yet implemented:** payment-provider signature verification, provider-specific webhook ingress, checkout, quote/discount campaign handling, refunds/chargebacks, renewals, cancellation and reconciliation. No provider is selected. Do not call the activation service from a learner-controlled route or mark a transaction verified based on a browser callback.


### Persistent Gabroo conversation API foundation

Migration `0009_gabroo_conversations.sql` adds learner-owned conversation sessions and ordered user/assistant text messages. The API exposes create/list/read/delete and send-message routes under `/api/v1/gabroo/conversations`. All read/create/send routes require a verified learner session and an active server-side subscription entitlement; the delete route remains available to an authenticated owner so learners can remove their history after expiry. Ownership is enforced in every conversation query and foreign keys cascade deletion with the learner account.

The send route serializes turns with a row lock, supplies recent conversation history to an injected provider-neutral `GabrooConversationProvider`, and persists the user and assistant messages together only after a valid provider response. Provider failure leaves no partial user message. If no provider is configured, create/send return a clear 503 and no AI response is fabricated. No model provider is selected, no live AI conversation is available, and production fair-use, retention and safety controls still require review.
