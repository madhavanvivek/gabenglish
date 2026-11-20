# Gabroo Audio Device QA Checklist

Status: Test plan only. No physical-device results are recorded by this document.

## Purpose

Validate the native audio lifecycle on real iOS and Android devices after the shared Expo AV audio-mode queue and generation-guarded speech teardown changes. Passing unit tests or emulator checks does not satisfy this checklist.

## Test setup

Record for every run:

- Device model and OS version
- Gabenglish app build / commit SHA
- Audio output: speaker, wired headset, Bluetooth device
- Microphone permission state
- Test date and tester
- Result, observed behaviour, and evidence for each case

Use a test account and non-sensitive spoken content. Do not use real personal conversations as test recordings.

## Playback and recording transitions

| ID | Scenario | Expected result |
|---|---|---|
| AUD-01 | Start Gabroo playback, then immediately request a microphone recording | Speech teardown completes before recording mode is requested; playback and capture do not overlap |
| AUD-02 | Start a microphone recording, then attempt to play a Gabroo reply | Playback is blocked with a clear instruction to finish or discard recording |
| AUD-03 | Rapidly tap Listen on two different replies | Only the newest playback request may continue; stale cleanup must not stop or unload the newer sound |
| AUD-04 | Rapidly start and stop recording | At most one native recording is active; temporary files are removed after stop/discard |
| AUD-05 | Trigger navigation away while native recording creation is pending | A late-created recording is stopped and its local file deleted; no recording UI is published on the departed screen |
| AUD-06 | Cause an audio-mode transition to reject (using a controlled test build or mock) | The caller receives the failure; later queued mode transitions still execute in FIFO order |

## Interruptions and output routing

| ID | Scenario | Expected result |
|---|---|---|
| AUD-07 | Receive a phone call or system audio interruption during playback | Playback stops or is safely interrupted; no stale audio restarts automatically |
| AUD-08 | Receive a phone call or system audio interruption during microphone capture | Capture is stopped or safely invalidated; no unreviewed recording is uploaded |
| AUD-09 | Connect/disconnect Bluetooth during playback | App does not crash, duplicate playback, or leave the audio UI stuck; record the actual route behaviour |
| AUD-10 | Connect/disconnect Bluetooth during recording | Capture fails safely or continues only if the platform route is valid; microphone state remains truthful |
| AUD-11 | Switch between speaker and wired headset during playback | Playback remains controllable and cleanup completes |
| AUD-12 | Background the app during playback or recording, then foreground it | Playback is cancelled; active temporary captures are discarded; no automatic replay or upload occurs |

## Platform-specific checks

### iOS

- Verify playback with the silent switch enabled.
- Verify microphone permission denial, later permission grant, and permission revocation in Settings.
- Test interruptions from calls, Siri, alarms and other audio apps.
- Test Bluetooth route changes and wired headset removal.
- Verify returning to Gabroo does not resume interrupted speech automatically.

### Android

- Verify playback with device media volume at zero and at normal levels.
- Verify audio ducking when another app requests audio focus.
- Test calls, alarms, assistant activation and audio-focus loss.
- Test Bluetooth route changes and headset removal.
- Verify app backgrounding discards temporary capture and does not leave the microphone active.

## Privacy and failure checks

- Confirm no microphone permission prompt appears before the learner gives in-app consent.
- Confirm local microphone test audio is never uploaded and is deleted after stop.
- Confirm transcription audio is uploaded only after the learner explicitly selects **Review & transcribe**.
- Confirm transcript text is not sent to Gabroo until the learner separately selects **Confirm & send to Gabroo**.
- Confirm app backgrounding invalidates pending transcription results and discards the local source file.
- Confirm a failed voice provider request never falls back to a generic device voice.
- Confirm no test is described as full-duplex or live streaming; the current voice-input workflow remains a short recording, explicit transcription, transcript review and separate confirmation.

## Release gate

Do not mark native audio interruption, Bluetooth routing, locked-screen operation, or screen-free live conversation as complete until the applicable physical-device cases have recorded passing evidence. This checklist does not establish support for a background microphone service or locked-screen capture.
