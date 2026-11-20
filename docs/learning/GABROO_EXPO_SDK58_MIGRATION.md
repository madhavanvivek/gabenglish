# Gabroo Expo SDK 58 and native audio migration

Status: migration spike / implementation plan  
Branch: `chore/expo-sdk58-audio-migration`  
Baseline: `foundation/gabroo-live-avatar-runtime`

## Goal

Move the mobile app from Expo SDK 53 to a supported SDK that provides the native PCM microphone stream required by Gabroo's realtime voice transport. Keep the existing record-review-confirm voice input working throughout the migration.

This branch is intentionally isolated from the realtime lifecycle hardening branch. Do not merge it until the full mobile CI suite, Android export, native device checks and voice privacy checks pass.

## Verified target compatibility

The official Expo SDK 58 reference currently lists:

| Component | SDK 58 target |
|---|---|
| Expo SDK | 58 |
| React Native | 0.88 |
| React | 19.3.0 |
| Node.js minimum | 22.13.x |
| `expo-audio` | `~58.0.12` |

Use `pnpm exec expo install --fix` after changing the Expo SDK package to let Expo resolve the matching versions of Expo-managed dependencies. Do not hand-guess the versions of Expo Router, SecureStore, Speech, FileSystem, SQLite, Linking or Constants.

Sources:
- https://expo.dev/sdk/58
- https://docs.expo.dev/versions/v58.0.0/sdk/audio/
- https://expo.dev/changelog/sdk-58
- https://expo.dev/blog/how-to-upgrade-to-sdk-58
- https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/

## Known migration surface

The current mobile app uses Expo SDK 53, React Native 0.79.2 and React 19.0. Its current audio implementation imports `Audio` from `expo-av` and uses:

- `Audio.Sound.createAsync`, playback status callbacks, playback rate, play/stop/unload.
- `Audio.Recording.createAsync`, recording status, stop/unload and local file URI.
- `Audio.requestPermissionsAsync` and `Audio.setAudioModeAsync`.

The current app config uses the `expo-av` config plugin for the microphone usage description. The realtime stream adapter is deliberately structural and has no direct `expo-audio` import yet, so SDK 53 CI remains buildable.

SDK 58 provides `useAudioStream(options)` for real-time PCM microphone capture. The returned stream exposes `start()`, `stop()`, actual `sampleRate`, `channels`, and streaming state. Permission must be granted using `requestRecordingPermissionsAsync()` before starting the stream. AudioStream's actual format metadata must be forwarded to the PCM normalizer; never assume the requested sample rate was delivered.

## Migration sequence

### 0. Preserve the known-good baseline

- Keep the existing feature branch and its realtime capture/turn tests unchanged.
- Keep the current transcript-review flow available as the fallback.
- Keep local microphone testing device-only.
- Never upload audio merely because microphone permission was granted.
- Do not enable background microphone capture.

### 1. Upgrade SDK dependencies

- Set the Expo package to SDK 58.
- Run `pnpm exec expo install --fix` from `apps/mobile`.
- Replace `expo-av` with SDK 58's `expo-audio`; remove the old config plugin only after all old Expo AV use has been migrated.
- Run `pnpm exec expo-doctor`.
- Run mobile typecheck, unit tests and Android export before changing voice screen behavior.
- Address React Native 0.87/0.88 strict type changes and removed APIs. Do not silence type errors with broad casts or disable strict checks.
- Review the SDK 58 Expo Router migration notes for this app's existing router usage.
- Verify the CI Node runtime is at least 22.13.

### 2. Migrate existing playback and recording

- Replace Expo AV playback with `expo-audio` player APIs behind a small adapter.
- Preserve playback cancellation generations, the process-wide audio-mode queue, playback-rate control, AppState cleanup and local-file deletion.
- Replace the current file-recording calls with the matching `expo-audio` recorder APIs.
- Keep the 15-second local recording limit and the explicit review/upload/confirm boundaries.
- Add unit tests for playback interruption, stop failures, file cleanup and foreground/background transitions before deleting the Expo AV implementation.

### 3. Bind the real native PCM stream

- Use `requestRecordingPermissionsAsync()` only after the learner's explicit voice action and consent.
- Create `useAudioStream` only while the Gabroo screen is focused and the app is foregrounded.
- Configure mono Float32 input and a requested 48 kHz rate, but inspect the actual stream metadata after start.
- Pass every native buffer's data, encoding, sample rate and channel count to `attachGabrooExpoAudioStream`.
- Attach the real stream to the existing fail-closed native capture controller.
- Ensure cleanup stops the native stream before draining the bounded WebSocket sender.
- On native stop failure, do not send `turn.end`; interrupt and close the realtime turn.
- Do not connect the microphone to the realtime socket until a separate learner action starts a consented realtime turn.

### 4. Connect the realtime coordinator to the screen

- Obtain a single-use authenticated session ticket only after the learner chooses realtime voice.
- Open the WebSocket and wait for `session.connected` before native capture starts.
- Wire the existing turn coordinator to the SDK stream, socket sender and visible start/stop/interrupt controls.
- Keep the existing text conversation and transcript-review route as a fallback if realtime setup, permission or network connection fails.
- Never automatically send recognized transcript text to the conversation; learner review and confirmation remain required until the product explicitly approves a different interaction contract.

### 5. Device acceptance

Test on physical Android and iOS devices:

- permission granted, denied and revoked in system settings;
- start/stop repeatedly and double-tap stop;
- screen navigation and app backgrounding during permission, capture and drain;
- incoming phone call, Siri/assistant interruption and audio focus loss;
- wired headset and Bluetooth connect/disconnect;
- poor network, WebSocket close, server timeout and sender backpressure;
- native stream stop rejection;
- no audio upload before explicit realtime start;
- no audio persisted or logged;
- no late `turn.end` after interruption;
- verify actual delivered sample rate, channel count, frame cadence and speech quality.

Do not claim lip-sync, full-duplex conversation or device compatibility until the relevant physical-device tests pass.

## Merge gates

- `pnpm --filter @gabenglish/mobile typecheck` passes.
- `pnpm --filter @gabenglish/mobile test` passes.
- `pnpm --filter @gabenglish/contracts typecheck` and tests pass.
- `pnpm --filter @gabenglish/api typecheck` and tests pass.
- Expo Doctor reports no unresolved compatibility issues.
- Android production bundle export passes.
- iOS and Android native builds pass on the supported build infrastructure.
- Device acceptance checklist is completed and recorded.
- Existing text chat, speech playback and transcript-review workflows remain usable.

## Current decision

SDK 58 is the target for the migration spike because it is the current stable Expo SDK and documents the PCM `useAudioStream` API needed by Gabroo. This document does not claim that the migration or native integration has already been implemented. Dependency changes and app wiring will be made incrementally on this branch, with each stage gated by CI.
