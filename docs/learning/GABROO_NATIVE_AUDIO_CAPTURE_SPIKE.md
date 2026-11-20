# Gabroo Native PCM Capture Spike

Status: Native PCM normalization and transport framing utilities implemented and unit-testable. Native microphone capture is **not yet connected**.

## Findings

- Gabenglish currently uses Expo SDK 53, React Native 0.79, and `expo-av`.
- Expo SDK 53 made `expo-audio` stable and recommends migration away from `expo-av`; Expo's SDK 53 release notes state that the `expo-av` audio API was replaced by `expo-audio` and would no longer be maintained for SDK 54 onward.
- The current Expo Audio documentation exposes `useAudioStream` for real-time native PCM microphone buffers, but this API was introduced in Expo SDK 56 (see SDK 56 release notes). It must not be assumed available in the app's current SDK 53 dependency set.
- Therefore, adding a current `expo-audio` package to SDK 53 or importing `useAudioStream` now would be an unsafe compatibility assumption.

References:
- Expo SDK 53 release notes: https://expo.dev/changelog/sdk-53
- Expo SDK 56 release notes: https://expo.dev/changelog/sdk-56
- Expo Audio API: https://docs.expo.dev/versions/latest/sdk/audio/

## Implementation decision

Do not change the native audio dependency in this step. Keep the existing record/review/confirm path stable while preparing a tested, provider-neutral PCM boundary.

The transport contract expects signed 16-bit little-endian PCM, 16 kHz, mono. The new `gabroo-pcm.ts` module:
- accepts native interleaved float32 or int16 buffers;
- validates sample rate, channel count, complete sample frames and finite values;
- downmixes mono/stereo input;
- linearly resamples to 16 kHz;
- encodes signed int16 little-endian samples;
- splits normalized audio into 100 ms frames (3,200 bytes) for the WebSocket transport.

## Next native integration gate

Before using `useAudioStream` in production:
1. Plan an Expo SDK upgrade to at least SDK 56 (prefer the current supported stable SDK after reviewing all breaking changes), including the `expo-av` to `expo-audio` migration. SDK 54+ no longer includes `expo-av` in Expo Go, and the app currently relies on Expo AV in the tutor screen.
2. Build an isolated capture adapter around the SDK's `AudioStream` API. Request permission only after explicit learner action; configure foreground-only capture; stop immediately on screen blur, app background, interruption, session stop, or permission loss.
3. Verify actual sample rate and channel count from the stream at runtime; normalize every buffer through `normalizeGabrooPcm16Mono`; chunk through `chunkGabrooPcm16`; send only while a server-accepted turn is active.
4. Verify Android and iOS development builds on physical devices, including Bluetooth/headset route changes, phone-call interruptions, app backgrounding, permission revocation, and WebSocket backpressure.
5. Keep transcript review/confirmation until partial and final recognition behaviour is tested and the product explicitly approves the transcript submission policy.

No background microphone, always-on listening, automatic transcript submission, or full-duplex claim is introduced by this spike.

## Follow-on: bounded mobile frame sender

The mobile layer now also has a provider/native-module independent PCM sender:
- normalizes each native callback and splits it into 100 ms PCM frames;
- preserves strict monotonically increasing sequence numbers;
- serializes frame sends through one pump;
- monitors WebSocket `bufferedAmount` with high/low watermarks;
- bounds pending microphone audio to 256 KiB by default;
- fails closed on queue overflow, socket loss, or sustained congestion rather than silently dropping audio.

This sender is a tested transport utility, not a microphone integration. The future native adapter must stop capture when its enqueue promise rejects, and the session coordinator must send `turn.end` only after all accepted buffers have drained. Device testing remains mandatory.

## Follow-on: foreground capture lifecycle controller

A platform-independent capture lifecycle controller now defines the boundary expected from the future Expo AudioStream hook:
- requires explicit consent and foreground tutor-screen state;
- requests microphone permission only after the learner starts capture;
- validates actual stream sample rate and channel count after native start;
- ignores PCM callbacks unless capture is active and foregrounded;
- stops native capture on explicit stop or sender/backpressure failure;
- treats a failed or cancelled startup as terminal because its sender is closed; a retry must create a fresh controller and sender, preventing capture from restarting against a permanently closed transport;
- closes the sender on all failed-start and stop paths.

The controller accepts an injected native stream port. It does not import `expo-audio`, request real device permission itself, or claim microphone capture works on the current SDK 53 app. The React integration and physical-device QA remain gated on the Expo SDK upgrade.

## Follow-on: Expo AudioStream adapter seam

A dependency-free adapter now maps the documented `expo-audio` stream shape into the tested capture controller:
- delegates native `start()` and `stop()`;
- forwards each `onBuffer` payload with its actual sample rate, channel count and encoding;
- deliberately does not trust the requested stream format as the actual device format;
- leaves normalization, bounded queueing, consent and foreground policy to the existing tested modules.

This bridge can be used by a component calling `useAudioStream({ channels: 1, encoding: 'float32', sampleRate: 48000, onBuffer })` after the SDK migration. It intentionally has no direct `expo-audio` import yet, so the SDK 53 production app remains buildable and its existing Expo AV voice flows remain untouched.
