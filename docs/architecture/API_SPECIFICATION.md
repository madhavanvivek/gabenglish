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
