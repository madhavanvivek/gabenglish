# Gabroo Google Cloud Text-to-Speech Integration Plan

Status: **Google adapter implemented with bounded timeout/cancellation; credentials, audition and voice approval pending**
Decision scope: Google Cloud Text-to-Speech is the first speech provider to evaluate behind the Gabenglish-owned API. This does not approve a canonical Gabroo voice, avatar, or unrestricted production spend.

Last reviewed: 2026-11-22

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
- Do not apply one shared settings profile to every voice family. The adapter must validate and map supported controls per model. The current implementation intentionally accepts Standard and WaveNet IDs only because it sends `speakingRate`; Chirp 3 HD remains excluded until a separate adapter supports its control contract.

## 3. Speech Gateway architecture

Mobile application -> Gabenglish API -> Speech Gateway -> provider adapter -> Google Cloud TTS.

The mobile client must never call Google TTS directly and must never contain a Google credential.

Gateway responsibilities:
- Provider-neutral synthesis request/response contract.
- Server-side Google authentication. The audition adapter sends the restricted API key in the `x-goog-api-key` header rather than the URL query string.
- A 15-second provider request timeout combined with caller cancellation; learner interruption can abort an in-flight request.
- Voice/model allow-list.
- Input validation, text length limits and request timeouts.
- Streaming response where supported; otherwise bounded response delivery.
- Audio format normalization and metadata.
- Durable per-user character reservations in PostgreSQL, partitioned by India-local day and month.
- Configurable daily/monthly character quotas, enforced transactionally before provider requests; provider failures are conservatively counted because upstream processing may already have occurred.
- Continue to add subscription-tier policy mapping and a separate operational cost kill switch before production.
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

- The current audition adapter uses a server-side API key in the `x-goog-api-key` request header for the native REST endpoint. Restrict that key to the Cloud Text-to-Speech API and, where practical, restrict its source/network use. Treat it as a secret; never place it in Expo public configuration or source control. Before production, replace the API-key approach with a service identity and short-lived credentials supported by the deployment environment.
- Before production, prefer a service identity and short-lived credentials supported by the deployment environment; do not rely on an unrestricted API key.
- Store secrets only in the deployment secret manager.
- Send only the text required for synthesis.
- Review Google's current data processing, retention and service terms before production.
- Do not send passwords, authentication tokens, private profile details or unrelated personal data to TTS.
- Define retention and deletion rules for any generated audio stored by Gabenglish.

## 8. Implementation sequence

1. Inspect current API structure, environment conventions, auth and subscription/usage contracts. **Done.**
2. Add a native Google TTS adapter behind the existing provider interface. **Done.**
3. Add explicit server-side configuration, mutually exclusive provider selection and test doubles. **Done.**
4. Reuse the existing authenticated speech API and one-time playback-ticket flow. **Already present; Google adapter is wired into server startup.**
5. Add durable usage metering, quotas and timeout policy. **Initial implementation done:** PostgreSQL day/month buckets, atomic reservations, configurable 10,000 daily / 100,000 monthly character defaults, and quota rejection responses. Subscription-plan-specific quota mapping, retention cleanup and a separate operational cost kill switch remain pending.
6. Add a restricted audition command for candidate voice IDs. **Implemented:** `pnpm --filter @gabenglish/api audition:google-tts -- --confirm-provider-usage` generates 28 identical-script MP3 samples across four Standard/WaveNet candidates, with a blind reviewer manifest and a separate private provider-to-code mapping. The command requires explicit confirmation and a server-side API key; output is git-ignored.
7. Add/verify mobile playback integration through Gabenglish API, never direct Google calls. **Pending verification.**
8. Run staging tests only after credentials and billing are separately authorized.
9. Capture audition samples and technical scorecard for owner review.
10. After explicit voice approval, lock canonical voice/model/settings in the voice protocol.

## 9. Acceptance criteria

- Mobile app contains no Google credential and no direct Google TTS request.
- Provider can be replaced through server configuration/adapter without mobile changes.
- Authentication and subscription entitlement checks are enforced by the existing speech routes.
- Durable per-user character metering and atomic daily/monthly quotas are implemented. Subscription-plan-specific policy mapping, request-rate controls, retention cleanup and a separate operational cost kill switch remain required before production use.
- Tests cover invalid input, provider failure, malformed/empty/oversized audio, successful audio response and caller cancellation. The provider enforces a 15-second request timeout; durable quota tests remain pending.
- The Google adapter uses synchronous synthesis and buffers the returned MP3. It does **not** claim provider streaming.
- Standard/WaveNet controls and Chirp 3 HD limitations must be handled separately before broad voice auditions.
- No production voice is selected without explicit owner approval.
- No paid production deployment is enabled without explicit authorization.

## 10. Current status

- Architecture decision: approved.
- Google Cloud TTS as initial candidate: approved for evaluation/integration.
- Native Google REST adapter: implemented; not yet live-tested. It now rejects oversized base64 payloads before decoded-buffer allocation and requires canonical base64 encoding.
- Existing API auth, active-subscription checks and single-use playback tickets: present.
- Google Cloud project/API credentials: not configured.
- Billing: not enabled by this change.
- Usage metering and atomic daily/monthly character quotas: implemented in migration 0026; defaults are 10,000/day and 100,000/month and are configurable. Subscription-specific quota policy, request-rate controls, usage retention cleanup and cost kill switch: pending.
- Blind audition generator: implemented; it is not run automatically. Actual samples still require an authorized server-side Google Cloud key and confirmed provider usage.
- Final Gabroo voice: **not approved**. The four generated candidate IDs remain evaluation candidates only; owner approval is still required.
- Production use: **not authorized yet**.


Learner usage endpoint: `GET /api/v1/gabroo/speech/usage` returns authenticated India-local daily/monthly character usage and remaining allowance. It does not expose speech content.


## 11. Blind audition command (implemented 2026-11-25)

Run only after confirming the Google Cloud project, billing/quota and permitted use:

```bash
GABROO_GOOGLE_TTS_API_KEY=... pnpm --filter @gabenglish/api audition:google-tts -- --confirm-provider-usage
```

The command generates four candidate folders (VOICE-01 through VOICE-04), seven matching script segments per candidate (28 MP3 files total), `reviewer-manifest.json`, and `mapping.private.json`. The reviewer manifest contains no provider or voice IDs. Keep the private mapping restricted and share only the blind-coded audio plus reviewer manifest with the independent listeners. The output directory defaults to `.local/gabroo-voice-auditions` and is excluded from Git; `GABROO_AUDITION_OUTPUT_DIR` may select a different local directory.

The generator does not run during CI, application startup or deployment. The Google adapter regression tests cover malformed padding and over-limit encoded payload rejection. No samples were generated as part of this code change, no provider credentials were accessed, and no voice was selected or approved.
