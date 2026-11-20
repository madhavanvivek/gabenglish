# Gabroo Screen-Free Conversation Mode

Status: Phase 1 Dark Screen Mode UI implemented on `foundation/gabroo-live-avatar-runtime`; physical-device QA and CI verification remain outstanding. No background microphone service or screen-off capability is claimed to exist.

## 1. Product goal

Let a learner practise spoken English with Gabroo without needing to watch or interact with the phone screen. This is especially useful for parents who want children to learn through conversation while reducing recreational screen exposure.

The experience is audio-first, not a hidden or unattended recording feature. The learner deliberately starts a session, sees and hears that the microphone is active, and can stop it immediately.

## 2. Learner experience — Dark Screen Mode

The first version is deliberately simple: it is a dark overlay on the existing Gabroo conversation screen, not a new background service or a simulated phone lock.

### Entry and display
- Add a **Dark Screen** action to an active Gabroo conversation.
- Activating it covers the conversation UI with a pure black, full-screen view.
- Keep only two visible controls: a single audio toggle (speaker on/off) and **Return to normal mode**.
- Do not show lesson content, transcript, character animation, rewards, navigation or other distracting UI while dark mode is active.
- The audio toggle controls Gabroo's audible output only while Dark Screen Mode is active. Turning audio off immediately stops current playback and blocks further playback while the overlay remains active. Turning it back on permits the next playback but does not restart interrupted speech. Returning to normal mode restores audio to on.
- **Return to normal mode** removes the overlay and restores the exact conversation screen and scroll position without resetting or losing the conversation.
- The mode must not silently end, restart or duplicate the active conversation.

### Important behaviour
- The app remains in the foreground while the black overlay is displayed. This is not the same as turning off or locking the physical display.
- On OLED displays, black pixels use very little display power; LCD devices may still illuminate the backlight. Do not promise zero screen power or guaranteed screen-time policy bypass.
- The learner can still use the device's physical power button normally. Actual lock-screen audio continuation is a separate future capability and is not part of this first version.
- If the app backgrounds or loses focus, follow the existing app lifecycle/audio cancellation behaviour; do not claim the conversation continues invisibly.
- The audio toggle is not a microphone mute control. Microphone capture, when a real conversational voice session is implemented, must have its own explicit and truthful listening/paused indicator and stop behaviour.

## 3. Scope boundary

1. **Dark Screen Mode (first release):** Full-black overlay, audio output toggle and return-to-normal control. Preserve the existing conversation state and underlying screen.
2. **True screen-off / locked-phone mode (future, optional):** Consider only after real-time voice conversation and a compliant Android foreground audio/microphone service exist. It requires separate platform feasibility, permission, privacy and physical-device QA.

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

### Phase 1 — Dark Screen Mode UI
- Add a Dark Screen action to the active Gabroo conversation.
- Implement the full-black overlay with only an audio output toggle and Return to normal mode.
- Preserve conversation state, scroll position and audio lifecycle across entry and exit.
- Ensure audio-off immediately stops/blocks Gabroo playback and audio-on permits playback again.
- Test accessible labels, touch targets, OLED/LCD behaviour and app background/foreground transitions.

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
- The current mobile voice-input flow is a consent-gated local recording (maximum 15 seconds), explicit learner-triggered transcription upload, transcript review/edit, and a separate confirmation before text is sent to Gabroo. It is not a live streaming or full-duplex voice session.
- Voice recording files are temporary. Leaving the tutor screen invalidates pending recognition results; recognition responses received after the app backgrounds or the screen loses focus are discarded rather than surfaced as a transcript.
- Recognition upload operations use an in-flight guard, and discard cleanup clears the transcription busy state. Learner text and recordings are not sent to Gabroo without the separate confirmation step.
- Existing MP3 response validation, speech readiness parser and conversation state reducer are reusable foundations.
- Existing backend conversation endpoint is authenticated and entitlement-aware; speech endpoints issue short-lived playback tickets.
- Existing Gabroo production voice, streaming Malayalam recognition and live 3D avatar remain separate delivery gates. Screen-Free mode must not imply those unfinished capabilities are complete.

## 10. Key product decision

Ship **Dark Screen Mode first**: a pure-black overlay with one audio toggle and one Return to normal mode control. Keep true screen-off/locked-phone audio as a separate optional future project.
