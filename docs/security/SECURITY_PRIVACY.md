# Gabenglish Security and Privacy Baseline

Version 1.0 — requirements for architecture and implementation.

## 1. Principles
Collect only necessary data; protect account, learning, voice and payment information; enforce least privilege; keep secrets out of source/client; log security events without sensitive payloads; define retention before collecting recordings; test authorisation boundaries.

## 2. Identity/access
Implemented foundation: learner registration and sign-in use Node scrypt password hashes; short-lived HMAC-signed bearer access tokens; random refresh tokens stored only as SHA-256 hashes; one-time refresh rotation; logout revocation; authenticated profile/preferences; consent records; and an account deletion-request state that disables sign-in. Login failures are throttled in PostgreSQL using keyed digests of email and request IP, not raw values. `AUTH_TOKEN_SECRET` must be a strong unique secret in production.

Important gaps: email addresses are not verified yet; password reset/recovery, MFA, device/session management UI, distributed abuse monitoring, deletion worker and actual data erasure are not implemented. Registration currently activates an account before email verification; do not use the unverified email for trusted communications or recovery. The access token remains valid for at most 15 minutes but account status is checked on each authenticated request. This foundation is not production-ready until the gaps below are addressed.

Future requirements: verification/recovery protections; stronger abuse detection; role-based admin access; MFA for privileged administration where supported; audit sensitive actions.

## 3. Data protection
TLS in transit; managed encryption at rest where available; restrict production DB access; separate environment secrets; never use production personal data in development; define data classification and access policies.

## 4. Voice/microphone privacy
Explain microphone purpose; request permission only when needed; clearly indicate recording; obtain consent before retention; define transient processing vs storage/deletion; provide deletion handling; do not retain raw recordings indefinitely; review provider data-use/training terms; offer text practice if permission unavailable.

## 5. Payments
Use provider checkout/tokenisation; never store raw card details; verify webhook signatures; deduplicate events; reconcile payment and entitlement server-side; audit transactions; test refunds, cancellation, renewals and failures.

## 6. Application security
Validate input; parameterised DB access; protect against common web/API risks; restrict uploads; use short-lived signed media URLs; apply per-user AI/audio quotas; prevent cross-account access; enforce server-side admin roles; avoid exposing prompts, secrets or stack traces.

## 7. AI safety
Never ridicule/shame learners; avoid stereotypes; treat user content as untrusted; separate system instructions from learner text; do not claim unsupported proficiency or pronunciation precision; use fallback for uncertain evaluation; monitor harmful output.

## 8. Retention and user rights
Define schedules for account records, learning history, transcripts, raw audio, AI usage and financial/audit records. Provide appropriate access, correction, export and deletion subject to legal retention requirements.

## 9. Operations
Dependency/secret scanning; protected main branch; required CI; environment credentials; backup monitoring and restore drills; incident response; access reviews; security alerts.

## 10. Compliance
Before public release, review applicable Indian privacy, consumer, payment, platform and child-safety requirements with qualified counsel. This is an engineering baseline, not legal advice.

## 11. Current learner-auth implementation boundary

The API exposes `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET/PATCH /api/v1/auth/me`, `PATCH /api/v1/auth/me/preferences`, `POST /api/v1/auth/me/consents` and `POST /api/v1/auth/me/deletion-request` when a PostgreSQL pool is configured. Account records and preferences are stored in PostgreSQL. The anonymous placement flow remains separate; placement reports are not yet linked to learner IDs.

Voice consent records are currently only recorded as declarations against a policy version; no voice capture or provider processing is enabled. A deletion request disables the account and revokes refresh sessions but does not yet run final deletion or retention cleanup. Do not describe this as complete account erasure.
