# Gabenglish Quality and Test Strategy

Version 1.0 — baseline for Phase 0 and implementation.

## 1. Quality goals
Protect learner data; ensure correct and helpful teaching; preserve learning progress; maintain consistent Gabroo behaviour; provide reliable speech interactions; and keep costs and latency observable.

## 2. Test layers
- Unit: domain logic, scoring, progression, validation and adapters.
- Integration: API/database, auth, content, progress and provider boundaries.
- Contract: OpenAPI schemas and mobile/backend compatibility.
- End-to-end: registration, assessment, lesson, practice, speaking and subscription flows.
- Visual/UI: navigation, layout, accessibility, responsive sizes and interaction states.
- Security: auth, access control, upload validation, rate limits, secrets and payment webhooks.
- Performance: API latency, database queries, audio processing and concurrent sessions.
- Recovery: backup restore, job retry and provider outage behaviour.

## 3. Learning correctness tests
- Accept valid alternative answers.
- Distinguish grammar error from unnatural phrasing.
- Avoid marking a valid regional expression as incorrect without evidence.
- Check Malayalam explanations with fluent reviewers.
- Verify stage-level language adaptation.
- Verify stage progression requires multiple skill evidence points.
- Check feedback is actionable and respectful.

## 4. Gabroo personality tests
Test male voice direction and friendly energy at provider evaluation; natural Kerala Malayalam; code-switching; gentle humour; serious response when learner is frustrated; no mocking, insults, stereotypes or humiliating feedback; stable personality across sessions.

## 5. Speech tests
Test permission denied, interrupted recording, silence, noisy environment, slow/fast speech, code-switching, Malayalam-accented English, replay, transcript mismatch, provider timeout, network loss and duplicate submission. Always indicate recording state and preserve safe retry context.

## 6. Privacy/security tests
Verify user ownership for every learner resource; admin role boundaries; consent before recording retention; deletion/expiry jobs; signed media URL expiry; upload constraints; webhook signatures and idempotency; no secrets in logs; account deletion behaviour.

## 7. Performance and reliability
Track p50/p95 API latency, error rate, STT/TTS latency, AI response latency, audio failure rate, cost per session, database query time and worker backlog. Establish numeric service-level targets after baseline load tests and provider benchmarks rather than inventing targets now.

## 8. Release gates
No unresolved critical/high security issue; core learner journeys pass; no data-loss defect; payment state reconciles; AI feedback passes reviewed evaluation thresholds; Malayalam speech performance is acceptable for disclosed capabilities; backup restore is tested; crash and error monitoring is active; privacy and store policies are reviewed.

## 9. Test data
Use synthetic accounts and consented/licensed audio. Never use production learner recordings as default test fixtures. Keep benchmark data access controlled and document provenance.
