# Gabroo Live Avatar Delivery Plan

Status: character and voice selection pending; staged delivery in progress. Neither a final 3D avatar nor voice has owner approval. A specification or typed animation contract is not evidence of a rendered production avatar.

## 1. Identity lock

No character concept or production 3D avatar is approved. Prepare distinct visual concepts and obtain explicit owner selection; then develop the selected concept under `docs/brand/GABROO_LIVE_CHARACTER_IDENTITY_LOCK.md`.

- Preserve the exact approved face, head shape, eye spacing, nose, mouth, hair/curls, skin tone, proportions, silhouette, cap, hoodie, headphones, outfit and G marks.
- Never generate, redesign, remix, substitute, approximate or use a provider/demo avatar.
- All modelling, rigging, expressions, gestures and animation must be faithful technical extensions of the same approved source.
- Expression and pose may change; identity may not.
- Until a concept is selected, show only clearly labelled concept options or a neutral placeholder. Do not imply any option is approved.
- Any identity change is out of scope unless the owner explicitly approves a versioned brand revision.

## 2. Workstreams

### A. Master asset and provenance
1. Prepare multiple distinct Gabroo visual concepts, clearly label them as unapproved options, and obtain explicit owner selection.
2. Create a definitive model sheet for the selected concept and obtain explicit owner approval.
3. Import the selected, approved master asset byte-for-byte into the repository and verify its checksum.
4. Keep the master read-only; all derived files must reference its checksum and version.
5. Treat the sheet as a composite character reference, not as a transparent mascot export, layered source project, mesh, rig or animation package.
6. Produce front, side, back and three-quarter production-model comparisons against the approved reference.
7. Obtain owner approval of the production model before rigging/animation is accepted.

**Gate A:** owner selects a concept; model sheet and production 3D model are reviewed and explicitly approved; source provenance is recorded. Only then import the canonical asset and proceed to rigging.

### B. Canonical voice
1. Use one identical audition script for every candidate: name greeting, self-introduction, Malayalam-English code-switch, English teaching phrase, encouragement after a mistake, gentle joke, patient response and follow-up question.
2. Benchmark at least three commercially usable male candidates with identical script/settings.
3. Have multiple Kerala Malayalam-fluent listeners blind-score naturalness, Kerala authenticity, pronunciation, warmth, energy, emotional range, code-switching, English clarity and long-session comfort.
4. Measure streaming latency, reliability, speed control and cost; review commercial rights, retention and model-training terms.
5. Reject robotic, formal/bookish, exaggerated, caricatured or tiring voices irrespective of price.
6. Present samples and a scorecard to the owner. Lock one provider/voice/model/version/settings only after explicit owner approval.
7. Keep provider adapters so vendor changes cannot silently change Gabroo's voice identity.

**Gate B:** benchmark report reviewed and one voice explicitly approved by the owner. All audition samples remain non-production.

### C. Production model, rig and animation
- Build a 3D model only from the approved source; preserve facial landmarks and body proportions.
- Rig jaw, lips, M/B/P closure, F/V contact, L/tongue placement, vowel shapes, cheeks, brows, eyelids, eye aim and blinks.
- Build reusable idle/breathing, greeting, listening, thinking, explain, teach, encourage and celebrate motions.
- Blend through neutral states; avoid repetitive gestures and exaggerated facial deformation.
- Include reduced-motion and approved static-artwork fallbacks.
- Validate on low-, mid- and high-range Android devices.

### D. Speech-to-animation
Use the provider-neutral contract in `packages/contracts/src/gabroo-avatar.ts`. Prefer timestamped phoneme/viseme events from speech synthesis or a dedicated alignment service; use calibrated audio-driven estimation only when timestamps are unavailable. An approximate talking loop is a labelled fallback, never described as precise lip-sync.

The renderer must schedule mouth shapes on the actual audio clock, smooth co-articulation, compensate for playback latency, keep the mouth neutral during silence, stop speech animation with audio on interruption, and blend context-driven expressions/gestures without losing phoneme timing.

### E. Live tutor and onboarding
1. After registration and verification, load the learner's preferred profile name.
2. Present the approved Gabroo model/artwork full-screen.
3. Play a short personalized opening in the owner-approved voice.
4. Ask one easy question and wait for the learner's actual voice or text response.
5. Stream recognition and generate a context-aware response; never pretend a fixed response heard the learner.
6. Drive lips from actual speech timing and expressions/gestures from conversation context.
7. Support interruption/barge-in, captions/transcript, replay, mute, speech-speed adjustment, skip and Meet Gabroo later.
8. Move to conversational placement after rapport; finish with a spoken personalized level, strengths and first goal.
9. Reuse the same runtime for Talk to Gabroo anytime, lessons, practice and daily activities.

## 3. Provider-neutral runtime boundaries
Keep separate adapters for microphone capture/permissions, VAD/end-of-turn, streaming STT, conversation orchestration, response text plus structured emotion/gesture cues, streaming TTS, phoneme/viseme alignment and canonical rig controls. Provider SDK event names must not leak into the learning domain or rig. Provider secrets must never ship in the mobile app.

## 4. Release gates

| Gate | Required evidence |
|---|---|
| Identity | Owner selects a concept and confirms the production model, views and expressions match the selected approved master |
| Voice | Kerala Malayalam reviewers pass blind benchmark; owner approves canonical voice |
| Speech | Malayalam/code-switching and teachable English are natural and clear |
| Lip-sync | M/B/P, F/V, vowels, silence and interruption visibly correct; no obvious drift |
| Liveness | Unscripted learner replies change the next response and expression |
| Interruption | Audio and speaking animation stop promptly on barge-in |
| Accessibility | Text input, captions, mute, replay, speed and reduced motion work |
| Android | Device matrix passes frame, memory, latency, battery and network recovery |
| Privacy | Consent, data minimisation, retention and provider terms reviewed |

No gate is passed without recorded test evidence. A storyboard/static image is not a video, rig or live conversation.

## 5. Immediate execution order
1. Prepare several distinct character concepts and obtain owner selection.
2. Create the selected concept's production model sheet and 3D model; obtain owner sign-off.
3. Use `docs/ai/GABROO_VOICE_AUDITION_PROTOCOL.md` to run the identical audition script and blind scorecard for at least three candidates.
4. Run contract typecheck/tests and integrate the renderer against the approved rig.
5. Extend the connected native playback lifecycle into the full live conversation session, then test barge-in, stale completion events and reconnect recovery.
6. Build registration-to-Meet-Gabroo state flow using approved artwork only.
7. Integrate the voice only after owner approval.
8. Connect streaming audio timing and interruptible live conversation.
9. Run identity, conversation, lip-sync, accessibility and Android performance tests.

## 6. Verified implementation status
- Gabroo personality direction: documented; character concept and visual identity: not yet selected or approved.
- Binding identity-lock document: present.
- Existing reference material: exploratory only; no canonical owner-approved avatar source.
- Reference PNG committed byte-for-byte to repository: pending; binary upload path required.
- Voice direction: audition brief only; no exact voice approved. Candidate benchmark and explicit owner approval pending.
- Production 3D model, rig and animation: not verified as present.
- Provider-neutral audio-timed viseme/expression/gesture contract and expanded timeline validation tests: added in this delivery branch; CI and renderer integration pending.
- Provider-neutral live conversation state machine and interruption/recovery tests: added in this delivery branch; full live-session orchestration and speech-alignment integration remain pending.
- Mobile speech playback lifecycle: connected to the native Expo AV playback callbacks. The app now promotes the playback reducer to `speaking` only after the native player reports the current audio item playing, counts segments only after native completion, and handles interruption/failure/stale callbacks through the same reducer. A live status is exposed to assistive technology. This is playback-state integration, not phoneme alignment or a rendered avatar.
- Conversation-to-renderer bridge and regression tests: added; samples canonical rig controls only while the conversation owns the current speaking audio ID, uses the caller's real playback clock, and returns a neutral mouth during silence, interruption and recovery.
- Standard male Kerala Malayalam voice audition script and blind scorecard: documented; candidate testing and owner approval pending.
- Streaming Malayalam voice, precise lip-sync and live interruptible avatar: not verified as implemented.
- Registration-to-live-Gabroo onboarding: specified; end-to-end implementation and QA pending.

Documentation and contracts do not imply production rendering or voice capabilities are complete.

## 7. Android device verification

Execute `docs/roadmap/GABROO_ANDROID_DEVICE_QA_CHECKLIST.md` on physical Android devices before public beta. Record build SHA, device/OS, environment and evidence for every test. CI and Expo bundle export are automated checks only; they do not substitute for physical-device authentication, microphone, playback, lifecycle, entitlement, accessibility, privacy or performance QA. All manual cases remain pending until a tester records results.
