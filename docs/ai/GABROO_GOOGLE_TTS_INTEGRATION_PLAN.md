# Gabroo Google Cloud Text-to-Speech Integration Plan

Status: **Google Cloud TTS selected as the active development provider; adapter implemented with bounded timeout/cancellation; credentials, live audition and final voice approval pending**
Decision scope (2026-11-25): Use Google Cloud Text-to-Speech as Gabroo's active provider for the current development phase, behind the Gabenglish-owned API. Keep the voice ID replaceable. This does not approve a canonical Gabroo voice, avatar, or unrestricted production spend.

Last reviewed: 2026-11-25

## 1. Decision

- Use Google Cloud Text-to-Speech as the active speech-generation provider for current development and the first end-to-end voice integration.
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
- Do not apply one shared settings profile to every voice family. The adapter must validate and map supported controls per model. The current implementation intentionally accepts Standard and WaveNet IDs only because it sends `speakingRate`; Chirp 3 HD remains excluded until a separate adapter supports its control contract. For this development phase, configure one explicit Standard/WaveNet Malayalam voice and use Google as the preferred provider.

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
6. Add a restricted audition command for candidate voice IDs. **Implemented:** `pnpm --filter @gabenglish/api audition:google-tts -- --confirm-provider-usage` generates 56 identical-script MP3 samples across four Standard/WaveNet voices and two input modes (plain text and bilingual SSML), with randomized blind codes, a reviewer manifest and a separate private voice/mode mapping. The command requires explicit confirmation and a server-side API key; output is git-ignored.
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
- Google Cloud TTS as active development provider: selected by the product owner on 2026-11-25; voice/model selection remains pending.
- Native Google REST adapter: implemented; not yet live-tested. It now rejects oversized base64 payloads before decoded-buffer allocation and requires canonical base64 encoding.
- Existing API auth, active-subscription checks and single-use playback tickets: present.
- Google Cloud project/API credentials: not configured.
- Billing: not enabled by this change.
- Usage metering and atomic daily/monthly character quotas: implemented in migration 0026; defaults are 10,000/day and 100,000/month and are configurable. Subscription-specific quota policy, request-rate controls, usage retention cleanup and cost kill switch: pending.
- Blind audition generator: implemented; it is not run automatically. Actual samples still require an authorized server-side Google Cloud key and confirmed provider usage.
- Final Gabroo voice: **not approved**. The four Google voice IDs and both synthesis modes remain audition candidates only; owner approval is still required.
- Production use: **not authorized yet**.


Learner usage endpoint: `GET /api/v1/gabroo/speech/usage` returns authenticated India-local daily/monthly character usage and remaining allowance. It does not expose speech content.


## 11. Blind audition command (implemented 2026-11-25)

Run only after confirming the Google Cloud project, billing/quota and permitted use:

```bash
GABROO_GOOGLE_TTS_API_KEY=... pnpm --filter @gabenglish/api audition:google-tts -- --confirm-provider-usage
```

The command generates eight randomized blind sample folders (`SAMPLE-01` through `SAMPLE-08`), seven matching script segments per variant (56 MP3 files total). Every one of the four voices is synthesized once as plain text and once as bilingual SSML. `reviewer-manifest.json` contains blind codes only; `mapping.private.json` records the corresponding voice and input mode and must remain restricted. The reviewer manifest contains no provider or voice IDs. Keep the private mapping restricted and share only the blind-coded audio plus reviewer manifest with the independent listeners. The output directory defaults to `.local/gabroo-voice-auditions` and is excluded from Git; `GABROO_AUDITION_OUTPUT_DIR` may select a different local directory.

The generator does not run during CI, application startup or deployment. The Google adapter regression tests cover malformed padding and over-limit encoded payload rejection. No samples were generated as part of this code change, no provider credentials were accessed, and no voice was selected or approved.


## 12. Malayalam-English SSML handling and matched A/B auditions (2026-11-25)

The Google Standard/WaveNet adapter now sends SSML rather than plain text. It preserves the configured Malayalam voice as the default and wraps contiguous Latin-script phrases in an English `<lang>` span (`en-US`). XML-reserved characters are escaped before insertion, and the locale is validated. The provider does not switch to a second English voice.

Google describes `<lang>` support as best-effort and notes that mixed-language quality can vary. This implementation is a controlled pronunciation experiment, not a claim that code-switching is solved. The audition generator now produces a matched plain-text control for every Standard/WaveNet voice, with identical text, speed and script segments. It randomizes eight blind sample codes and stores the voice/mode key separately in the restricted mapping. Compare samples blind before retaining SSML for production. Chirp 3 HD remains excluded because it does not support SSML or the speaking-rate parameter used by this adapter.


### English locale and XML escaping hardening (2026-11-25)

The adapter now accepts an optional server-side `GABROO_GOOGLE_TTS_ENGLISH_LANGUAGE_CODE` setting (default `en-US`) so English pronunciation can be evaluated with a locale such as `en-GB` without changing the primary Malayalam voice. `GABROO_GOOGLE_TTS_INPUT_MODE` selects `ssml` (default) or `text`; the audition generator uses both modes to create matched blind samples for each candidate. Both locale values and the input mode are validated before synthesis. Regression coverage checks XML validity, escaping, plain-text request shape and configurable locale. These are markup-safety and evaluation controls only; they do not establish that one English locale is best for Kerala learners. Compare real samples before choosing a default.

### Measured MP3 metadata and alignment identity (2026-11-25)

The buffered Google Cloud TTS adapter now parses MPEG Layer III frame headers after decoding the provider response and rejects malformed, truncated, inconsistent or overlong MP3 streams. Duration is calculated from frame sample counts (including variable-bitrate streams and MPEG-1/2/2.5), not estimated from byte length. The API returns `x-gabroo-audio-duration-ms`, `x-gabroo-audio-sha256`, `x-gabroo-text-sha256` and `x-gabroo-audio-id` headers when the synthesis provider supplies measured duration. For this buffered adapter, the audio ID is the SHA-256 fingerprint of the exact MP3 bytes; the one-time playback ticket ID remains a separate transport identity. Streaming providers do not receive fabricated duration or alignment metadata.

This is an identity/metadata foundation only. The mobile player does not yet consume these response headers, no phoneme aligner is configured, and no viseme timeline is attached to native playback. Real phoneme timestamps, audio-to-avatar synchronization and physical Android validation remain outstanding. No Google request or audition sample was generated by this implementation; credentials and explicit provider-use authorization remain required.

### Mobile playback metadata handoff (2026-11-25)

The Android/iOS client now consumes the one-time playback URL through its authenticated API workflow, reads the bounded MP3 response and its HTTP metadata in JavaScript, and writes the validated bytes into the app cache before native playback. This is necessary because Expo AV's native URL loader does not expose response headers to the JS runtime. The mobile layer validates optional content-addressed audio identity, source-text SHA-256 and measured duration when all headers are present; generic streaming providers may omit them and do not receive synthetic timing values. The ticket token remains the native callback identity and is deliberately not confused with the content SHA-256.

The active mobile playback callback now records the actual native position and duration alongside the measured provider duration for the matching ticket ID. This is a handoff foundation only: no phoneme alignment is yet delivered to the client, and the clock is not yet driving a production avatar renderer. API and mobile CI passed on commit `6ea7b3f`; physical Android device QA remains outstanding.

### Exact-audio mobile avatar playback bridge (2026-11-25)

The mobile client now has a renderer-neutral bridge that samples a validated phoneme-to-viseme timeline against the native player's real position. It checks the active one-time playback ticket separately from the content-addressed audio identity, and confirms the timeline audio ID and measured duration match the downloaded MP3 metadata. Stale ticket IDs, missing timelines/metadata, paused or unloaded playback, and mismatched audio/duration all produce neutral rig controls. Tests cover these conditions.

This bridge is not a production avatar renderer and is not yet wired to a final 3D rig. No phoneme aligner is configured, so no live provider-generated phoneme timestamps currently reach it. The bridge is an integration boundary awaiting a genuine alignment provider and owner-approved character asset. CI for the latest bridge commits is running.
