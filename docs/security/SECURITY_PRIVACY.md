# Gabenglish Security and Privacy Baseline

Version 1.0 — requirements for architecture and implementation.

## 1. Principles
Collect only necessary data; protect account, learning, voice and payment information; enforce least privilege; keep secrets out of source/client; log security events without sensitive payloads; define retention before collecting recordings; test authorisation boundaries.

## 2. Identity/access
Use current password hashing if password auth is implemented; short-lived access tokens and protected refresh lifecycle; session revocation; verification/recovery protections; rate limiting; abuse detection; role-based admin access; MFA for privileged administration where supported; audit sensitive actions.

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
