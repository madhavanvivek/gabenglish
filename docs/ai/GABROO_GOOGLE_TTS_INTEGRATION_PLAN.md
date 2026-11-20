# Gabroo Google Cloud Text-to-Speech Integration Plan

Status: **approved initial provider candidate; implementation and voice approval pending**
Decision scope: Google Cloud Text-to-Speech is the first TTS provider to evaluate and integrate behind the Gabenglish-owned Speech Gateway. This does not approve a canonical Gabroo voice, avatar, or unrestricted production spend.

Last reviewed: 2026-11-21

## 1. Decision

- Use Google Cloud Text-to-Speech as the first speech-generation provider candidate.
- Keep provider selection behind a Gabenglish-owned server-side Speech Gateway.
- Keep the provider adapter replaceable so self-hosted Gabroo models or another provider can be added without changing mobile clients.
- Benchmark Standard, WaveNet and Chirp 3 HD voices using the canonical audition script.
- Do not select or lock a voice until the owner explicitly approves audition evidence.
- Do not enable paid production traffic or create/modify a Google Cloud project, billing account, API key or service account without explicit authorization and access.

Official references:
- Voice catalogue: https://cloud.google.com/text-to-speech/docs/list-voices-and-types
- Pricing: https://cloud.google.com/text-to-speech/pricing
- Chirp 3 HD capabilities: https://cloud.google.com/text-to-speech/docs/chirp3-hd
- Authentication: https://cloud.google.com/docs/authentication

## 2. Candidate voices

Initial Malayalam locale: `ml-IN`.

### Standard baseline
- `ml-IN-Standard-B` — male
- `ml-IN-Standard-D` — male

### WaveNet comparison
- `ml-IN-Wavenet-B` — male
- `ml-IN-Wavenet-D` — male

### Chirp 3 HD comparison
Test a small male subset first:
- `ml-IN-Chirp3-HD-Charon`
- `ml-IN-Chirp3-HD-Fenrir`
- `ml-IN-Chirp3-HD-Orus`
- `ml-IN-Chirp3-HD-Puck`

The live Google voice catalogue is the source of truth for availability, voice gender, locale and model status. Do not assume that a voice name or model remains available indefinitely.

### Capability differences to account for
- Standard and WaveNet support SSML controls and speaking-rate/pitch parameters, subject to voice/API support.
- Chirp 3 HD does not support SSML input or speaking-rate/pitch-audio parameters. It has its own streaming and audio-control capabilities.
- Do not apply one shared settings profile to every voice family. The adapter must validate and map supported controls per model.

## 3. Speech Gateway architecture

Mobile application -> Gabenglish API -> Speech Gateway -> provider adapter -> Google Cloud TTS.

The mobile client must never call Google TTS directly and must never contain a Google credential.

Gateway responsibilities:
- Provider-neutral synthesis request/response contract.
- Server-side Google authentication.
- Voice/model allow-list.
- Input validation, text length limits and request timeouts.
- Streaming response where supported; otherwise bounded response delivery.
- Audio format normalization and metadata.
- Per-user and per-subscription usage metering.
- Daily/monthly quotas and hard cost ceilings.
- Request IDs, structured logs and latency/error metrics.
- Provider fallback only when it does not silently change an owner-approved voice; otherwise return a controlled error.
- Optional caching for approved, non-personalized repeated lesson content. Do not cache learner-specific or sensitive text by default.
- No raw audio or learner text in application logs by default.

## 4. Proposed internal contract

A provider-neutral request should contain:
- `text`
- `locale` (initially `ml-IN`)
- `voiceId`
- `modelFamily` (`standard`, `wavenet`, `chirp3-hd`)
- `speakingRate` and `pitch` only when supported
- `audioEncoding`
- optional `stream` preference
- correlation/request ID

The response should expose:
- audio stream or audio payload
- content type and sample-rate metadata
- provider/model/voice metadata for internal diagnostics
- measured first-audio and total latency where available
- usage characters and estimated billable units
- request ID and normalized error code

Do not expose provider credentials or raw provider errors to the mobile client.

## 5. Audition plan

Use the exact script and scoring rubric in `docs/ai/GABROO_VOICE_AUDITION_PROTOCOL.md`.

Minimum initial comparison:
1. Standard B
2. Standard D
3. WaveNet B
4. WaveNet D
5. Chirp 3 HD Charon
6. Chirp 3 HD Fenrir
7. Chirp 3 HD Orus
8. Chirp 3 HD Puck

For each candidate:
- Same script, punctuation and locale.
- Include Malayalam-only, English-only and code-switched segments.
- Record at least three repeated latency trials under comparable network conditions.
- Evaluate natural Kerala Malayalam, English clarity, code-switching, warmth, expressiveness and long-session comfort.
- Test learner speed controls only where the selected model supports them; separately test client-side playback-rate changes and document any quality degradation.
- Blind-review samples with Malayalam-fluent listeners.
- Record the exact voice/model ID and date of retrieval.

No candidate is automatically selected because it is the default or cheapest.

## 6. Cost and quota controls

- Confirm current pricing and free-tier eligibility in the Google Cloud pricing page before enabling billing or traffic.
- Treat free usage allowances as quota budgets, not a reason to leave unbounded billing enabled.
- Configure budget alerts and application-level hard usage limits.
- Track generated characters by learner, day, month, voice family and environment.
- Add a kill switch to disable provider synthesis immediately.
- Separate development/audition usage from production usage.
- Never promise that budget alerts themselves stop charges; enforce hard limits in the application.

## 7. Security and privacy

- Use a server-side service identity with least-privilege permissions; prefer workload identity/application default credentials over a long-lived JSON key where deployment supports it.
- Store secrets only in the deployment secret manager.
- Never commit credentials or put them in Expo public environment variables.
- Send only the text required for synthesis.
- Review Google's current data processing, retention and service terms before production.
- Do not send passwords, authentication tokens, private profile details or unrelated personal data to TTS.
- Define retention and deletion rules for any generated audio stored by Gabenglish.

## 8. Implementation sequence

1. Inspect current API structure, environment conventions, auth and subscription/usage contracts.
2. Add provider-neutral speech contracts and validation.
3. Add a Google TTS adapter with server-side credential loading.
4. Add an authenticated API endpoint and rate/usage limits.
5. Add test doubles and unit/integration tests; tests must not require live Google credentials.
6. Add a restricted audition command or internal-only endpoint for candidate voice IDs.
7. Add mobile playback integration through Gabenglish API, never direct Google calls.
8. Run staging tests only after credentials and billing are separately authorized.
9. Capture audition samples and technical scorecard for owner review.
10. After explicit voice approval, lock canonical voice/model/settings in the voice protocol.

## 9. Acceptance criteria

- Mobile app contains no Google credential and no direct Google TTS request.
- Provider can be replaced through server configuration/adapter without mobile changes.
- Authentication, authorization, rate limits and subscription usage controls are enforced.
- Tests cover invalid input, provider timeout, provider failure, quota exhaustion, unsupported voice controls and successful audio response.
- Streaming behavior is measured and documented; do not claim streaming if the implementation buffers full responses.
- Standard/WaveNet controls and Chirp 3 HD limitations are handled separately.
- Cost metering and hard usage limits are verified.
- No production voice is selected without explicit owner approval.
- No paid production deployment is enabled without explicit authorization.

## 10. Current status

- Architecture decision: approved.
- Google Cloud TTS as initial candidate: approved for evaluation/integration.
- Candidate voice IDs: identified for audition, not selected.
- Google Cloud project/API credentials: not configured by this change.
- Billing: not enabled by this change.
- Speech Gateway implementation: pending code changes and tests.
- Audition samples: pending authorized Google Cloud access.
- Final Gabroo voice: **not approved**.
- Production use: **not authorized yet**.
