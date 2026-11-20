# Gabroo Progressive Audio Playback — Architecture Decision

Status: native remote playback bridge implemented; end-to-end streaming validation pending.
Date: 2026-11-20

## Context

The original mobile speech path sent a POST request, read the complete MP3 response into a JavaScript byte array, converted it to base64, wrote a temporary file, and only then created an Expo AV player. The current implementation now creates a short-lived playback ticket with an authenticated POST and passes its opaque GET URL directly to Expo AV, avoiding the JavaScript byte-array/base64/temp-file path. Sentence chunking remains in place.

The API provider currently reads the complete provider response into a bounded `Uint8Array` before the route sends it. The provider still buffers the complete response before the GET route sends it. Native remote playback can consume the resulting HTTP response without a JavaScript copy, but provider synthesis-to-device delivery is not yet end-to-end streaming.

## Evidence from the current stack

The app currently uses Expo SDK 53, React Native 0.79.2 and `expo-av ~15.1.7`.

Expo AV's playback source supports a remote `uri` and request `headers`. The current implementation uses a short-lived opaque URL capability instead of putting the learner's bearer token in the media URL or needing a custom native request header. See the Expo AV API documentation: https://docs.expo.dev/versions/v53.0.0/sdk/av/

This is a better first native playback spike than assuming React Native Fetch exposes a usable `ReadableStream.getReader()` on every supported device.

The current app's speech endpoint is POST-only and accepts text plus speed in a JSON body. A native media player loads a media URI with GET, so the current endpoint cannot simply be passed to Expo AV. Do not put learner text in a query string: it may leak into proxy, server, analytics and crash logs.

## Decision

1. Keep provider credentials and synthesis calls on the server.
2. Prototype native progressive download/playback using Expo AV's remote URI plus authorization headers, on the existing SDK 53 dependency set first.
3. Design a short-lived, opaque playback ticket created by an authenticated POST. The ticket must not contain readable learner text and must be scoped to the learner, requested speech, expiry and a bounded number of uses.
4. The native player will use a GET media endpoint with the ticket. The GET endpoint must re-check ticket validity and subscription/ownership policy, then stream MP3 bytes with correct content type and cancellation propagation.
5. Avoid storing ticket state only in process memory: Render restarts and multiple instances make in-memory tickets unreliable. Prefer a durable shared store with expiry and atomic consume semantics, or a cryptographically signed opaque ticket with an explicitly accepted replay window and no claim of single-use.
6. Change the provider adapter to expose a cancellable byte stream only after the route has incremental byte-limit enforcement, disconnect propagation and tests. Do not first remove the existing 12 MiB cap.
7. Keep the current complete-buffer implementation as a fallback until physical Android and iOS device tests prove the native path.

## Required spike and acceptance criteria

- Confirm the exact `expo-av ~15.1.7` installed type definition accepts `{ uri, headers }`; do not infer solely from newer documentation.
- Verify that Android ExoPlayer and iOS AVPlayer begin playback before the full response is downloaded for a chunked MP3 response.
- Verify the opaque ticket GET reaches the server on both platforms and ticket URLs are not retained in proxy/analytics logs.
- Verify HTTP status failures are surfaced; do not allow an HTML/JSON error body to be played as audio.
- Verify cancellation on Stop, navigation, app backgrounding, conversation switch and component unmount closes the native request and provider stream. The POST ticket-creation request is abortable; the Expo AV GET request's cancellation behaviour still needs physical-device verification.
- Verify 0.75–1.5x rate changes, pitch correction and the actual audio clock remain usable for viseme scheduling.
- Measure time-to-first-audio, buffering, bytes received before playback, peak JS memory and interruption latency on low-, mid- and high-range Android devices.
- Test expired, replayed, wrong-learner and revoked tickets.
- Do not call the system end-to-end streaming until provider-to-client streaming is verified on physical devices.

## Explicit non-goals

- No switch to `expo-audio` or `react-native-audio-api` is approved by this decision.
- No new provider voice or voice ID is selected.
- No change to the approved Concept C Gabroo identity.
- No replacement of the existing playback path before the spike passes.
- No merge or production deployment is authorized.

## Current status

- Server provider response is still fully buffered (bounded to 12 MiB).
- Mobile response is still fully read and written to a temporary MP3 file.
- Mobile and API cancellation handling has been strengthened and regression-tested.
- Authenticated ticket issuance, durable one-time ticket consumption, server GET media route and native remote URI playback are implemented.\n- The API still buffers provider MP3 output before returning it; provider-to-device streaming and first-audio latency improvement are not yet achieved.\n- Physical Android/iOS playback, cancellation, memory and audio-clock validation remain pending.\n- Expired-ticket cleanup scheduling remains pending.
