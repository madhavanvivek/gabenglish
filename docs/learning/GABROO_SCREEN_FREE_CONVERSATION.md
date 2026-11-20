# Gabroo Screen-Free Conversation Mode

Status: proposed product feature; specification committed for implementation planning. No background microphone service or screen-off capability is claimed to exist yet.

## 1. Product goal

Let a learner practise spoken English with Gabroo without needing to watch or interact with the phone screen. This is especially useful for parents who want children to learn through conversation while reducing recreational screen exposure.

The experience is audio-first, not a hidden or unattended recording feature. The learner deliberately starts a session, sees and hears that the microphone is active, and can stop it immediately.

## 2. Learner experience

### Entry
- Add **Screen-Free Conversation** beside the normal Talk to Gabroo entry.
- Explain that Gabroo will listen and reply by voice, and that the screen may dim or be turned off.
- Request microphone permission in context, only when the learner starts voice mode.
- Check speech service readiness, audio output and network before starting.
- Offer a short sound check and speaker/headphone choice.

### During the session
- Gabroo asks one question at a time and waits for the learner.
- Use voice activity detection (VAD) or explicit push-to-talk as the initial turn boundary. Prefer push-to-talk as a fallback where continuous listening is unreliable.
- Play Gabroo's response, then return to listening. Stop capture while Gabroo is speaking unless barge-in is intentionally enabled and tested.
- Keep the screen-free state visually quiet: dark screen, no animation, no scrolling transcript and no reward/streak prompts.
- Provide optional spoken reminders and a subtle visual state before dimming: "Gabroo is listening", "Gabroo is speaking", "Paused".
- The learner can pause, resume or end at any time using a large on-screen control before display dimming, headset/media controls where supported, or the persistent Android notification.
- Never imply Gabroo can hear while microphone permission is denied, the session is paused, or the OS has suspended capture.

### Session end
- End on the configured duration, parent limit, explicit learner stop, entitlement expiry, repeated network/audio failure or safety escalation.
- Give a brief spoken recap and save only the learning data permitted by the learner/parent privacy settings.
- Return to the regular app with a concise summary, not an incentive to extend screen time.

## 3. Two operating modes

1. **Audio-only / display-dim mode (first release):** Keep the session visible only as a minimal dark interface. Let Android dim the display naturally; support the user's normal power-button behaviour only after the background service is implemented and device-tested.
2. **Screen-off / locked-phone mode (Android follow-up):** A properly declared foreground service owns the active microphone/audio session. The service must show a persistent, truthful notification with a stop action. The app must handle lock/unlock, task switching, audio focus, route changes, process death and permission revocation.

Do not use a black overlay as a fake screen lock, use accessibility APIs to bypass device controls, or claim the app can force the display off. The user controls the device's actual lock and display state.

## 4. Architecture

Keep the learning domain provider-neutral and reuse the existing Gabroo conversation state machine and speech contracts.

- **Session coordinator:** Owns explicit session start/stop, phase, elapsed time, learner turn and cancellation.
- **Audio capture adapter:** Android microphone capture, permission checks, audio focus and route changes. Capture only during an active, user-started session.
- **Turn detection:** VAD/end-of-turn with a configurable silence threshold; push-to-talk fallback. Do not send an always-open raw microphone stream to the backend when no turn is being captured.
- **Speech recognition adapter:** Stream or upload the learner's turn to the backend; do not put provider credentials in the app.
- **Conversation adapter:** Reuse existing authenticated conversation endpoint, history, entitlement and concurrency protections.
- **Speech playback adapter:** Reuse the existing MP3 response validation and playback pipeline; support cancellation and audio-focus recovery.
- **Background session service:** Native Android foreground service with microphone/media playback service types and notification controls, implemented in a custom development/production build. Verify exact permissions and service declarations against the target Android SDK and current Play policy before release.
- **Mobile UI:** Screen-free setup, session state, permissions, parent-controlled limits and recovery.
- **iOS adapter:** Separate later implementation using iOS background audio session capabilities and Apple's background execution rules; do not promise arbitrary continuous microphone use when locked.

The current Expo app uses Expo SDK 53 / React Native 0.79. A production-grade locked-screen microphone workflow may require a custom Expo native module/config plugin or a native Android module and a development build. Expo Go is not a valid acceptance environment for this feature.

## 5. Child and family safeguards

- Parent-controlled daily maximum and per-session duration; sensible defaults should be selected with educator/parent research before release.
- Clear start, pause and stop actions; no hidden or remotely activated microphone.
- Persistent microphone-active indicator and Android foreground notification while capture is active.
- No background listening before explicit session start or after session stop.
- No advertising, external links, purchases or social interaction in the child session.
- Age-appropriate topics and responses; no requests for home address, school, phone number, passwords, precise location or private family details.
- If a child volunteers sensitive personal information, do not probe for more; give a simple safety-oriented response and follow the approved data-handling policy.
- Parent settings protected from casual child changes, without obstructing the child's ability to stop immediately.
- Minimal retention: store only the transcript/progress needed for learning and only under the approved child privacy/consent policy. Raw audio should not be retained by default.
- Do not treat speech recognition as proof of identity or age.
- Network loss, microphone revocation, headphone disconnect and service termination must stop capture safely and explain the state.

## 6. Parent settings

Initial settings:
- Enable/disable Screen-Free Conversation.
- Maximum session length.
- Daily time allowance.
- Learning stage / difficulty.
- Preferred language support and correction style.
- Speaker/headphone preference.
- Whether a short end-of-session learning summary is saved.

The child-facing session must not display subscription upsells or prompt to extend the daily allowance.

## 7. Implementation phases

### Phase 1 — Audio-only MVP
- Build a dedicated screen-free setup and session UI.
- Reuse authenticated conversation and speech endpoints.
- Implement turn-based capture, VAD or push-to-talk fallback, audio playback and cancellation.
- Add visible mic/listening/speaking/paused states, a session timer and a stop control.
- Add parent-configured session duration and daily limits.
- Test foreground operation and natural screen dimming; do not yet claim locked-screen microphone support.

### Phase 2 — Android locked-screen audio
- Add native foreground service and persistent notification actions.
- Declare and request only the necessary microphone/audio permissions.
- Implement audio focus, Bluetooth/wired headset routing, phone-call interruption, lock/unlock, task removal and service lifecycle handling.
- Verify the microphone can continue only while the user-started foreground session is legitimately active under Android platform rules.
- Run physical-device tests across supported Android versions and manufacturers; verify battery use, thermal behaviour and network recovery.
- Review Google Play foreground-service and child/family policy requirements before distribution.

### Phase 3 — Quality and iOS
- Improve streaming latency, VAD tuning, reconnect and graceful fallback.
- Add iOS-specific background audio implementation only after a separate platform feasibility review.
- Run child usability, parent comprehension, privacy and accessibility reviews.

## 8. Acceptance criteria

- Learner can start and end a voice-only session without needing to read the screen.
- Gabroo responds to actual learner turns; no prerecorded or pretend conversation.
- Microphone is never active before explicit start, while paused, or after stop.
- Microphone-active state is clearly communicated, including when screen is locked.
- Gabroo audio can be interrupted and cancelled without stale playback restarting.
- Screen dimming does not terminate an active session on supported devices.
- In Android locked-screen mode, foreground notification remains visible and its stop action ends capture promptly.
- Parent duration and daily limits are enforced server-side or by tamper-resistant session accounting, not only by a client timer.
- Phone calls, audio route changes, Bluetooth disconnects, network loss, permission revocation and app/service termination fail safely.
- No raw audio retention by default; transcript retention follows explicit privacy settings.
- Physical-device QA evidence is recorded per Android device/OS. Emulator and CI success alone are insufficient.

## 9. Current repository baseline and gaps

- Mobile app: Expo SDK 53, React Native 0.79.
- Android manifest configuration currently declares RECORD_AUDIO only.
- Existing app configuration uses expo-av; there is no verified foreground microphone service, media-session notification, VAD capture pipeline or locked-screen QA in the current implementation.
- Existing MP3 response validation, speech readiness parser and conversation state reducer are reusable foundations.
- Existing backend conversation endpoint is authenticated and entitlement-aware; speech endpoints issue short-lived playback tickets.
- Existing Gabroo production voice, streaming Malayalam recognition and live 3D avatar remain separate delivery gates. Screen-Free mode must not imply those unfinished capabilities are complete.

## 10. Key product decision

Ship **Audio-only MVP first**, then add Android locked-screen support after native service implementation and physical-device validation. This delivers the screen-time benefit early without making an unsafe promise about background microphone behaviour.
