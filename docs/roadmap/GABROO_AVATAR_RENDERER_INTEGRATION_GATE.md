# Gabroo Avatar Renderer Integration Gate

Status: implementation contract; renderer and production rig are not yet certified.

This document defines the next integration boundary after the audio-bound phoneme timeline parser and native-clock sampling bridge. It does not claim that a 3D renderer, approved production rig, phoneme aligner, or canonical voice is configured.

## Non-negotiable inputs

The renderer may animate only when all of the following are true:
1. The active conversation belongs to the signed-in learner and is allowed by the existing subscription gate.
2. The active native playback ticket matches the audio asset currently playing.
3. The MP3 metadata is measured and content-addressed (audio ID, SHA-256 and duration).
4. The phoneme alignment has passed schema validation and is bound to that exact audio ID, hash and duration.
5. The native player is loaded, playing, and reports a finite playhead in the open interval [0, duration).
6. The renderer has loaded the single owner-approved Gabroo model and reports the expected rig version.

If any input is missing, stale, paused, malformed, unsupported or mismatched, render the approved neutral/listening pose. Never estimate phoneme timing from text, infer alignment from elapsed wall-clock time, or start an approximate mouth loop while describing it as lip-sync.

## Renderer adapter boundary

Keep the application independent of a specific 3D engine. The adapter should expose these responsibilities:
- load(modelManifest): load a versioned model and return capabilities plus rig identity.
- applyFrame(frame): apply a complete immutable frame, not a partial patch that can leave old mouth shapes active.
- resetToNeutral(): synchronously clear mouth, expression and gesture controls.
- dispose(): release model, textures, animation resources and native/GPU handles.

A frame contains one validated viseme (or neutral), bounded viseme blend weight, one allow-listed expression cue (or neutral), one allow-listed gesture cue (or idle), and a monotonically increasing playback generation and sample timestamp.

The renderer must not receive provider-specific event objects, learner transcripts, credentials, or arbitrary model instructions. Map the shared `GabrooAvatarFrame` contract into the renderer gate's allow-listed controls through `apps/mobile/src/gabroo/avatar-frame-mapper.ts`. Compose the canonical sampler and mapper through `apps/mobile/src/gabroo/avatar-timeline-renderer.ts`, which re-validates the timeline and requires exact audio ID and measured-duration matches before sampling. `apps/mobile/src/gabroo/native-playback-clock.ts` accepts native player snapshots and independently supplied alignment hash/duration; it never fabricates alignment identity from audio metadata and stops on any mismatch. `apps/mobile/src/gabroo/expo-av-playback-adapter.ts` connects Expo AV status callbacks to that clock, including native position sampling and pause/resume generation resets. The pure status mapper lives in `apps/mobile/src/gabroo/expo-av-playback-status.ts` so its validation can be unit-tested without loading Expo's native runtime. The adapter requires a trusted audio URI, audio metadata and matching alignment timeline from its caller; it does not fetch audio or validate the provenance of those inputs. The current Gabroo screen still uses device TTS (`expo-speech`) and is not yet wired to this audio-asset path. Preserve viseme, expression and gesture blend weights in complete rig frames. These are integration bridges only, not a phoneme-alignment provider or production rig.

## Playback lifecycle

The Expo AV adapter ignores pre-playback loaded status, starts a fresh generation on each play/resume, resets on pause, and permanently closes the clock on completion, unload or playback failure. The caller remains responsible for invoking `unload()` when the screen or playback session is disposed.

Treat every audio asset as a generation:
1. On new playback, increment the generation and reset the rig before accepting samples.
2. On each native playback tick, verify the generation, ticket ID, measured duration and player state before sampling.
3. Apply a complete frame only when the sample belongs to the active generation.
4. On pause, completion, unload, screen blur, app background, interruption, error or cancellation, reset to neutral immediately.
5. Ignore late callbacks from earlier generations.
6. On alignment failure or provider unavailability, keep the mouth neutral and expose the capability as unavailable; do not silently fall back to guessed timing.

Expression and gesture cues must be time-bounded and blended independently of phoneme sampling. They must never override jaw/lip controls during speech. Listening and thinking poses must use a neutral mouth.

## Performance and accessibility

- Keep the approved static artwork as the fallback when model loading fails or the device is below the tested capability floor.
- Support reduced motion by disabling non-essential gestures and easing while retaining captions and controls.
- Avoid re-creating geometry, materials or animation resources on each playback tick.
- Bound texture/model memory and release resources on screen disposal.
- Test low-, mid- and high-range Android devices; do not infer device readiness from an Expo bundle build.

## Required tests before enabling the renderer

### Adapter unit tests
- Model manifest with wrong character identity or rig version is rejected.
- Missing rig capability produces a neutral frame, not a guessed mapping.
- Every applied frame clears stale mouth/expression/gesture state.
- Unknown viseme, expression or gesture is rejected to neutral.
- Blend weights and timestamps outside contract bounds are rejected.
- Dispose is idempotent and prevents subsequent frame application.

### Playback integration tests
- Correct ticket + exact audio hash + measured duration + playing native clock produces the expected sampled viseme.
- Wrong ticket, wrong hash, wrong duration, absent alignment, unmeasured audio, paused/unloaded player and completed playhead all produce neutral.
- A stale callback from the previous generation cannot animate the next audio asset.
- Pause, interruption, screen blur, app background and cancellation reset the mouth in the same lifecycle turn.
- Alignment timeout/failure leaves the conversation usable with captions and neutral artwork.

### Device acceptance
Record device model, Android version, renderer/rig version, frame-time percentiles, peak memory, thermal behaviour, battery impact, and results for interruption/recovery. Include Malayalam-English code-switch samples and M/B/P, F/V, L/tongue, vowel, silence and rapid-turn cases reviewed by Malayalam-fluent evaluators.

## Release gates

Do not set live_avatar_renderer=true until the owner-approved Concept C source asset and provenance are recorded; the production model and rig have explicit owner approval; adapter and playback integration tests pass; a real phoneme-alignment provider is configured and its output is validated against exact audio; Android device acceptance is recorded; and captions, mute, replay, speed control, reduced motion and static fallback pass.

Voice approval is a separate gate. The renderer must not select or lock a voice provider. No merge or production deployment is implied by this contract.

Native playback status validation rejects out-of-range playheads, invalid durations and malformed audio identity before clock sampling.

The Expo AV adapter now validates the complete trusted playback identity before creating a native sound instance, including bounded non-empty ticket/audio IDs, a SHA-256 audio hash, positive integer measured duration, and exact alignment hash/duration match. Consumer error callbacks are isolated so exceptions cannot escape native playback-status dispatch.

Native playback now performs a complete speech-asset preflight before `Audio.Sound.createAsync`: the untrusted alignment timeline is parsed with the shared contract, and its audio ID and duration must exactly match the validated playback identity. The accepted timeline is a fresh parsed copy, so later caller mutation cannot alter the animation data used by native playback.

## Server-issued speech asset contract

Added a shared `GabrooSpeechAsset` envelope for the future API-to-mobile handoff. It binds a playback ticket, audio ID, SHA-256 digest, measured duration, alignment digest/duration, HTTPS asset URL, expiry and canonical viseme/expression/gesture timeline. The schema rejects URL credentials and non-HTTPS schemes, unknown envelope fields, mismatched audio/alignment hashes, duration mismatches and timelines belonging to another audio ID. A playback-time parser rejects expired URLs. This is a contract and validation layer only: no speech provider, signed-URL issuer, audio storage, phoneme aligner or API endpoint is claimed to exist yet.


## API speech-generation boundary

Added a consent-gated, provider-neutral API service for future speech asset generation. It validates learner text length, Malayalam/English language, playback rate, provider presence, caller cancellation and bounded provider timeout. Provider output is treated as untrusted and must pass the shared, unexpired `GabrooSpeechAsset` schema before it can be returned to a caller. Provider timeouts have a distinct error code. The service does not persist text/audio, log provider payloads, issue signed URLs, or implement a concrete speech vendor. The provider must supply a complete audio asset and alignment envelope; deployment remains disabled until a provider and secure asset issuer are configured.


## Authenticated speech API route

Added `GET /api/v1/gabroo/speech/status` and `POST /api/v1/gabroo/speech`. Both require a verified learner session and active subscription entitlement. Generation additionally requires explicit `x-gabroo-consent: true`, strict JSON fields (text, language and speech rate), and an injected speech provider. The route returns 503 while no provider is configured; it does not fabricate speech output. Request disconnects cancel provider work. API registration accepts a provider through the existing dependency-injection seam; the production server does not configure one, so the feature remains safely unavailable until credentials, provider implementation and signed asset delivery are reviewed. Route tests cover authentication, free-tier denial, provider-unavailable behavior and consent gating.


## Speech route integration verification

The API route is now covered by an end-to-end Fastify injection test using a deterministic provider stub. It verifies consented Malayalam text is normalized and passed to the provider, a content-bound speech asset is validated and returned, and malformed requests are rejected before provider invocation. A CI-discovered missing provider-type export was corrected. The tests use a stub only; they do not represent a production voice vendor or real generated audio.


## Cancellation hardening

CI exposed a cancellation edge case when a speech vendor ignores its AbortSignal: the provider promise could remain pending after the learner disconnected. The generation boundary now races provider completion against an explicit caller-cancellation promise, re-checks cancellation after listener registration, and still aborts the provider signal. The regression test now deliberately uses a provider stub that ignores cancellation and never settles. This ensures the API request can terminate promptly even when a vendor SDK does not cooperate.

## Mobile speech-readiness integration

The learner app now calls the authenticated speech-status endpoint when an active subscription is present and surfaces whether the generated-voice provider is available. If the provider is not configured, the screen clearly says that playback still uses the installed device voice; if readiness cannot be checked, it avoids implying that generated speech is available. This is readiness discovery only: it does not submit learner text for generation, change consent, or replace the device-voice fallback.

## Readiness contract validation

The mobile client now validates the speech-readiness response through a pure, dependency-free runtime parser before exposing it to the UI. It rejects unexpected fields, malformed availability flags, duplicate or unsupported languages, invalid speed ranges, and missing explicit-consent requirements. Unit tests cover available/unavailable responses and malformed payloads. This is deliberately a readiness contract only; it does not enable speech generation.

## Mobile speech asset request boundary

The mobile API layer now also exposes a consent-gated speech-generation request. It sends the explicit consent header, uses the authenticated session (including refresh retry), and validates the returned asset envelope and expiry with the shared contract before exposing it to playback code. The Gabroo screen does not invoke this method yet; no learner text is sent to a speech provider until the owner-approved voice and provider are ready.

## Single-envelope native playback handoff

The mobile native playback adapter now accepts one untrusted speech-asset envelope rather than separately supplied URL, playback identity and timeline values. A preflight helper validates the server-issued envelope and expiry, then derives the URI, identity and parsed timeline exclusively from that same object. This closes a caller-substitution gap where a valid timeline and identity could otherwise be paired with an unrelated HTTPS audio URL. Tests cover successful derivation, expiry, cross-audio timeline substitution and alignment-hash mismatch. The adapter still remains gated by the owner-approved character/rig and live renderer integration; no production audio is enabled by this change.


## Native playback adapter lifecycle verification

The Expo AV adapter now exposes an injectable sound factory for deterministic tests while retaining Expo AV as the production default. Mobile tests exercise the adapter boundary directly: expired, cross-audio and unsafe-URL assets are rejected before native sound creation; valid assets pass only the validated URL to the factory; and native sound resources are unloaded. Lifecycle tests exercise native status callbacks across play, pause, resume, completion and decoder failure, verifying that playback generations reset to neutral and consumer-visible errors are reported without allowing callback exceptions to escape. CI typechecking caught a mock-call typing issue in the new tests; the test double was corrected before the latest validation run. This is adapter-level automated coverage, not Android hardware acceptance.


## Integrity-verified private audio cache

The native playback adapter now resolves the server-issued HTTPS audio URL into an app-private cache file before opening Expo AV. The cache layer bounds downloads to 25 MiB, validates the HTTPS source and SHA-256 envelope, downloads to a temporary file, verifies the exact downloaded bytes with SHA-256, and only then promotes the file into the cache. Existing cache entries are re-hashed before reuse; corrupt entries are removed and fetched again. Temporary downloads are cleaned on failure, and the adapter refuses playback unless the cache result's digest matches the server-issued audio digest. Tests cover SHA-256 standard vectors, verified promotion, tampered-byte rejection, corrupt-cache repair, invalid sources and size limits. This verifies byte integrity against the server-issued digest; it does not independently verify codec/container validity or measured media duration. Native Android device and network-interruption acceptance remain outstanding.


## Asset expiry and native media-duration checks

The local cache filename now includes the server-issued asset expiry timestamp. Before a cache fetch, the Expo bridge scans only Gabroo cache entries, removes files whose signed expiry has elapsed, and leaves unrelated cache files untouched. The playback adapter passes the expiry from the same validated asset envelope used for its URI, audio hash and alignment.

The native Expo playback status is also checked against the server-measured duration. A native duration differing by more than 50 ms is rejected before an avatar frame is accepted; this tolerance accounts for small container/decoder duration rounding while rejecting a different or truncated media asset. Unit tests cover the boundary and expiry cleanup. Android device-level validation remains required.


## Cancellation and lifecycle hardening

The secure cache downloader accepts an AbortSignal, checks it before cache access, after asynchronous filesystem operations, and immediately before/after cache promotion. The Expo resumable download bridge cancels the native transfer on abort and removes its listener when the transfer settles. Partial files are removed on cancellation, and a valid existing cache file is preserved if cancellation races its integrity check.

The playback adapter passes the same cancellation signal through cache preparation and native player creation. If cancellation occurs while the native player is being created, the newly returned sound is unloaded before it can be used; cancellation after creation unloads the active sound and closes the avatar clock. Tests cover abort-before-download, abort-during-transfer, preservation of verified cached audio, cancellation during cache preparation, and cancellation racing native player creation.


## Native buffering and interruption behavior

The Expo AV adapter now treats native buffering as an interruption even if the platform still reports `isPlaying: true`. It neutralizes the avatar and closes the current playback generation while buffering; animation resumes only after a fresh native status tick reports playback without buffering. This avoids driving visemes and gestures from a stale playhead during Android decoder starvation, network stalls, or audio-route changes.

A rejected native `playAsync()` now reports a normalized error to the consumer, invalidates any active animation generation, and rethrows so the screen can present an appropriate recovery action. Tests cover buffering/resume and playback-route failure. Device-specific validation is still required for calls, Bluetooth/headset changes, app background/foreground transitions, and vendor-specific Android audio focus behavior.


## App background and microphone cleanup

The Gabroo screen now stops device TTS as soon as the app leaves the active state, invalidating the current speech run so late segment callbacks cannot continue a reply in the background. Unsubmitted transcription recordings and locally captured microphone-test files are stopped and deleted when the app backgrounds. If the app backgrounds while a native recording start/stop operation is still in flight, the operation's completion path performs the same cleanup. Capture entry points also refuse to start while the app is not active, and the audio mode is restored after transcription capture is discarded.

This is application-level lifecycle handling. Validate on physical Android devices for notification shade, lock screen, incoming calls, Bluetooth route changes, process recreation and OEM-specific audio focus behavior before release.


Screen navigation blur is handled separately from OS backgrounding: leaving the Gabroo route stops device TTS, discards temporary transcription audio, and blocks new microphone capture until the route is focused again. Pending native recording operations check both app-active and screen-focused state when they settle, so a recording created during a navigation/background race is discarded rather than retained.


## Abandoned cache-download cleanup

A process kill can leave a temporary `.part` file even though normal cancellation and failure paths already delete it. Temporary filenames now include their creation timestamp. The opportunistic private-cache sweep removes only recognized Gabroo partial downloads older than 24 hours, alongside expired signed `.audio` entries. Fresh in-progress downloads, malformed names and unrelated cache files are preserved. Unit tests cover the age boundary and isolation from unrelated files.


## Transcription interruption safety

A transcription request may already be in flight when the learner backgrounds the app or navigates away. Gabroo now invalidates that request's UI generation on either interruption, resets the busy state, and ignores any late transcript response. The pending local recording is discarded by the existing lifecycle cleanup. This prevents a late response from repopulating a transcript after the learner has left the screen; it does not claim to cancel a network upload that the platform has already started.


## Bounded transcription uploads

Before uploading a learner-approved recording for transcription, the mobile client now verifies that the URI is an app-local `file:///` URI, the file still exists, its byte size is known and non-zero, and the file is no larger than 10 MiB. This fails closed before authentication refresh or network upload if the recording is missing, unverifiable, remote, empty or oversized. Unit tests cover accepted local files, URI isolation, missing metadata, the size ceiling and invalid limits.


## Microphone capture lifecycle race protection

The Gabroo transcription recorder now captures a monotonically increasing lifecycle generation before configuring the native audio session. Leaving the Gabroo screen or moving the app out of the active state invalidates that generation. The start flow checks the generation after audio-mode setup and again after native recorder creation; if it became stale, it does not publish a recording into UI state, and any recorder/file created by the late completion is stopped, unloaded and deleted. This also handles the app backgrounding and returning to the foreground before a pending native start promise resolves. This is client-side lifecycle protection; it does not claim cancellation of a transcription upload already in progress.


## Unexpected native microphone stop handling

While transcription capture is active, the Expo AV recording-status callback now checks that the callback still belongs to the active recorder and the same app/screen lifecycle generation. If the native recorder unexpectedly reports that it is no longer recording (without reporting a completed recording), the client removes the listener, stops/unloads the recorder, deletes the partial local file and tells the learner to retry. Normal user-initiated stop removes the listener before calling the native stop method, so it is not treated as an interruption. Maximum-duration auto-stop remains unchanged.


## Server-side transcription quota

The authenticated recognition route now consumes an atomic per-learner fixed-window quota stored in PostgreSQL: 20 requests per hour across all API instances. Requests over the allowance return HTTP 429 and `Retry-After`; quota-store failures fail closed with HTTP 503. The quota table stores counters only and no audio or transcript data. The 20/hour ceiling is an initial abuse/cost control and must be reviewed against real provider economics before production launch.
