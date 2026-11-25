# Gabenglish Android Device QA Checklist

Status: ready for manual execution; no physical-device run is claimed by this document.
Target: Android-first learner application.
Scope: registration, authentication, learner experience, Gabroo conversation, audio permissions, playback controls, offline/recovery behaviour and release evidence.

## 1. Test record

Complete one record per physical device and build. Do not mark a case passed from an emulator-only run.

| Field | Value |
|---|---|
| Build / commit SHA | Record exact installed build |
| Device model | Record |
| Android version / API | Record |
| App version | Record |
| API environment | Local LAN / staging / production (identify exact origin) |
| Network | Wi-Fi / mobile data; note quality |
| Tester / date | Record |
| Result | Not run until executed |

## 2. Entry criteria

- [ ] Install a build generated from the intended Gabenglish branch and record its commit SHA.
- [ ] Confirm the API base URL points only to the dedicated Gabenglish environment.
- [ ] Confirm the API health and readiness endpoints; readiness must reflect database availability.
- [ ] Confirm the test account and database are disposable/test data, not a real learner account.
- [ ] Confirm OTP delivery is configured for the target environment. A local development OTP shortcut is not valid production OTP evidence.
- [ ] Confirm no credentials, provider secrets or private tokens are embedded in the mobile bundle.
- [ ] Confirm the app uses the approved Gabroo artwork or a clearly labelled neutral loading/placeholder state; do not accept an alternate avatar.
- [ ] Confirm current production voice is not claimed as approved until the owner has approved the blind audition result.

## 3. Registration and authentication

| ID | Test | Expected result | Result / evidence |
|---|---|---|---|
| AUTH-01 | Fresh email registration with valid email | OTP request succeeds and clear verification state appears | Pending |
| AUTH-02 | Verify correct, unexpired OTP | Account is created exactly once and learner reaches authenticated app | Pending |
| AUTH-03 | Incorrect OTP | Clear error; account is not created | Pending |
| AUTH-04 | Expired or replayed OTP | Rejected safely; user can request a new code | Pending |
| AUTH-05 | Resend OTP / rate limit | Cooldown and server rate limits are respected | Pending |
| AUTH-06 | App closed and reopened after login | Valid session is restored securely | Pending |
| AUTH-07 | Logout and relaunch | Protected screens require authentication | Pending |
| AUTH-08 | Expired access token | Refresh or re-authentication is handled without losing unrelated local data | Pending |
| AUTH-09 | Network loss during registration | No duplicate account; actionable retry message | Pending |
| AUTH-10 | Email and phone linked to same learner | One account is maintained; no accidental duplicate | Pending |

## 4. First-session and learner experience

- [ ] First meaningful learning experience is a welcoming conversation, not a rigid multiple-choice exam.
- [ ] Learner can choose or change preferred name and communication style.
- [ ] Default address is respectful and neutral; “എടാ/എടീ” is not used by default.
- [ ] Malayalam explanations remain available at every learning stage.
- [ ] Placement questions adapt to the learner's actual response; do not repeat fixed prompts mechanically.
- [ ] Text-only assessment does not claim verified pronunciation or speaking fluency.
- [ ] Placement report identifies evidence coverage and limitations; no unvalidated numerical score or CEFR equivalence is shown.
- [ ] Learner can accept the recommendation, start at the beginning, choose another stage or request a harder challenge.

## 5. Gabroo conversation and speech

| ID | Test | Expected result | Result / evidence |
|---|---|---|---|
| TALK-01 | Start a new conversation | Correct conversation mode and language support load | Pending |
| TALK-02 | Send text turn | Reply belongs to the active conversation and appears once | Pending |
| TALK-03 | Rapidly switch conversations while a reply is pending | Stale response cannot overwrite the newly active conversation | Pending |
| TALK-04 | Stop speech during playback | Playback stops and UI leaves speaking state | Pending |
| TALK-05 | Replay a response | Segments play in order; no overlapping audio | Pending |
| TALK-06 | Change speed from minimum to maximum | Allowed range is respected; selected rate persists | Pending |
| TALK-07 | Malayalam response without installed Malayalam TTS | Clear explanation; no silent substitution presented as Gabroo's approved voice | Pending |
| TALK-08 | Malayalam-English mixed response | Language segments are understandable and in the intended order | Pending |
| TALK-09 | App backgrounds during playback | Audio is stopped or safely managed; no orphaned playback | Pending |
| TALK-10 | Network drops during a turn | Clear recoverable state; no false claim that a reply was received | Pending |

**Voice-preview disclosure:** Current device-installed TTS is only a development preview. It is not the final Gabroo voice. Do not approve or advertise it as the distinctive, natural, energetic male Kerala Malayalam voice until at least three candidates have been benchmarked and the owner has explicitly selected one.

## 6. Microphone, consent and transcript review

- [ ] Explain why microphone access is requested before the OS permission prompt.
- [ ] No microphone prompt appears before the learner chooses a voice feature.
- [ ] Denying permission leaves text conversation usable.
- [ ] Recording indicator is visible for the entire capture.
- [ ] Learner can cancel recording; temporary audio is deleted on cancellation.
- [ ] Transcription consent is distinct from microphone permission.
- [ ] Learner can review and edit the transcript before it is submitted for evaluation.
- [ ] Recognition uncertainty is not treated as a learner language error.
- [ ] Audio is not retained unless the learner has explicitly consented to the stated purpose.
- [ ] App backgrounding, interruption and permission revocation stop capture safely.

## 7. Subscription and access

- [ ] Free account can complete the free analysis/placement flow and see the free report.
- [ ] Paid features remain locked until the server confirms an active entitlement.
- [ ] Monthly offer is ₹79 for 30 days; standard price ₹99.
- [ ] Yearly offer is ₹799 for 360 days; standard price ₹1,188.
- [ ] Prices shown by the client match server-calculated quotes.
- [ ] Expired subscription removes paid access at the server-defined paid-through time.
- [ ] A client-side clock change cannot extend access.
- [ ] No payment is simulated as successful unless a verified provider webhook confirms it.

## 8. Accessibility, performance and resilience

- [ ] Text remains readable at Android font scaling settings.
- [ ] Buttons have meaningful accessibility labels and adequate touch targets.
- [ ] Keyboard does not cover the message composer or verification fields.
- [ ] Screen rotation / app resume does not duplicate requests or lose the active learner unexpectedly.
- [ ] Low-memory background/foreground cycle does not crash.
- [ ] Slow network, airplane mode and reconnect states are understandable.
- [ ] Repeated taps do not create duplicate OTPs, conversations or learner turns.
- [ ] No raw OTP, access token, refresh token, audio transcript or provider secret appears in logs.
- [ ] Verify battery and memory behaviour during a 15-minute conversation session.

## 9. Gabroo identity and live-avatar release gate

These are separate production gates; a passing app smoke test does not satisfy them.

- [ ] Exact Concept C — Signature Gabroo artwork matches the approved Branding Kit V2 source.
- [ ] Repository source asset checksum matches the owner-provided master.
- [ ] Production 3D model has owner visual sign-off before animation work is accepted.
- [ ] Same canonical face, cap, hoodie, headphones, proportions and palette appear in all screens.
- [ ] Renderer drives visemes from actual audio playback timing; silence returns mouth to neutral.
- [ ] Listening, thinking, speaking, interruption and reconnect states are distinct.
- [ ] Learner barge-in stops both audio and speaking animation promptly.
- [ ] Expressions and gestures respond to the actual learner turn; no fixed prerecorded welcome is used as the interactive tutor.
- [ ] Android low-, mid- and high-range device checks cover frame pacing, memory and thermal behaviour.

## 10. Defect record and sign-off

For each failure record: test ID, device/build, exact reproduction steps, expected versus actual behaviour, timestamp, redacted logs, screenshot/video where appropriate, severity, owner and retest commit.

Release sign-off requires:
- all P0/P1 defects closed;
- authentication and entitlement tests passed against the intended environment;
- privacy/consent checks passed;
- Android device matrix evidence attached;
- owner approval of canonical Gabroo artwork/model and voice;
- real-time audio/lip-sync and interruption evidence attached.

**Current status:** checklist prepared; all manual device cases remain Pending until executed. Hosted CI and Expo Android bundle smoke tests are not substitutes for physical-device QA.
