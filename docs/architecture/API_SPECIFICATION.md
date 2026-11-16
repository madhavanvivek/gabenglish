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

## 2. Authentication/profile
POST /auth/register; POST /auth/login; POST /auth/refresh; POST /auth/logout; POST /auth/password/forgot; POST /auth/password/reset; GET/PATCH /users/me; GET/PATCH /users/me/preferences.

Document verification, enumeration protection, token rotation, lockout and recovery.

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

## 8. Subscriptions
GET /subscriptions/plans; GET /subscriptions/current; POST /subscriptions/checkout; POST /subscriptions/cancel; POST /subscriptions/webhooks/{provider}. Verify signatures and deduplicate events. Client success is not payment proof.

## 9. Administration
GET /admin/users; GET /admin/users/{id}; GET/POST /admin/content; PATCH /admin/content/{id}; POST /admin/content/{id}/publish; GET /admin/ai/providers; PATCH /admin/ai/configurations/{id}; GET /admin/analytics; GET /admin/audit-logs. Enforce roles server-side and audit sensitive actions.

## 10. Example tutor turn
Request fields: session_id; input.type (text or audio reference); input.text when text; correction_mode. Response fields: turn_id; reply.text/language/audio_asset_id; feedback.original/corrected/category/explanation_ml/natural_alternatives.

## 11. Required next contracts
OpenAPI 3.x; request/response schemas; auth and role matrix; error catalogue; pagination/filter conventions; rate limits; idempotency; contract tests and generated-client strategy.


## 12. Implemented placement conversation pilot (foundation branch)

The current Fastify service exposes these prototype routes:
- `POST /api/v1/placement/conversation/start` — validates preferred support language, optional display name and communication style; creates an ephemeral session and returns the first prompt.
- `POST /api/v1/placement/conversation/respond` — validates session ID and prompt/turn order; accepts a text response and returns the next prototype prompt or completion state.
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


## Learner authentication API foundation (implemented on foundation/app-skeleton)

All routes below require a configured PostgreSQL pool. Access tokens are short-lived bearer tokens bound to a refresh-session ID and checked against its active database row on every request; refresh tokens are opaque, stored as SHA-256 hashes, single-use and rotated on refresh. Rotation and logout revoke the old session, immediately invalidating its access token.

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

Security limitations: email verification, password reset, MFA, device/session management, full account erasure and learner-linked assessment history are not implemented. Registration currently creates an active but unverified account. Login throttling is database-backed, keyed by HMAC digests and limited to 10 failures per email digest or 30 per request-IP digest in a 15-minute window. This is an initial abuse-control layer, not a substitute for a production edge/WAF policy.


Mobile account client: `apps/mobile/src/auth-api.ts` uses Expo SecureStore for access and refresh tokens, rotates refresh tokens after an authenticated request receives 401, and exposes account/profile/preference operations. The account screen is `apps/mobile/app/account.tsx`. The learner home screen links to this route. Email verification and password recovery are not available; the UI must continue to disclose the unverified-email limitation.
