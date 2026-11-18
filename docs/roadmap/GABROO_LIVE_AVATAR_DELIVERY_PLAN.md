# Gabroo Live Avatar Delivery Plan

Status: approved direction; staged delivery in progress. A specification or typed animation contract is not evidence of a rendered production avatar.

## 1. Identity lock

The sole character is **Concept C — Signature Gabroo** from Gabenglish Branding Kit V2, governed by `docs/brand/GABROO_LIVE_CHARACTER_IDENTITY_LOCK.md`.

- Preserve the exact approved face, head shape, eye spacing, nose, mouth, hair/curls, skin tone, proportions, silhouette, cap, hoodie, headphones, outfit and G marks.
- Never generate, redesign, remix, substitute, approximate or use a provider/demo avatar.
- All modelling, rigging, expressions, gestures and animation must be faithful technical extensions of the same approved source.
- Expression and pose may change; identity may not.
- Until the approved master is imported, use only the approved artwork or a clearly labelled placeholder. Do not invent a replacement.
- Any identity change is out of scope unless the owner explicitly approves a versioned brand revision.

## 2. Workstreams

### A. Master asset and provenance
1. Use the exact approved PNG recorded in `docs/brand/GABROO_APPROVED_ASSET_MANIFEST.md`; its original bytes have been inspected and SHA-256 verified.
2. Import the PNG byte-for-byte into the repository. After upload, recompute SHA-256 from the committed bytes and compare with the manifest.
3. Keep the master read-only; all derived files must reference its checksum and version.
4. Treat the sheet as a composite character reference, not as a transparent mascot export, layered source project, mesh, rig or animation package.
5. Produce front, side, back and three-quarter production-model comparisons against the approved reference.
6. Obtain owner approval of the production model before rigging/animation is accepted.

**Gate A:** byte-identical repository import, provenance recorded and model visually approved. No alternate character assets.

### B. Canonical voice
1. Use one identical audition script for every candidate: name greeting, self-introduction, Malayalam-English code-switch, English teaching phrase, encouragement after a mistake, gentle joke, patient response and follow-up question.
2. Benchmark at least three commercially usable male candidates with identical script/settings.
3. Have multiple Kerala Malayalam-fluent listeners blind-score naturalness, Kerala authenticity, pronunciation, warmth, energy, emotional range, code-switching, English clarity and long-session comfort.
4. Measure streaming latency, reliability, speed control and cost; review commercial rights, retention and model-training terms.
5. Reject robotic, formal/bookish, exaggerated, caricatured or tiring voices irrespective of price.
6. Present samples and a scorecard to the owner. Lock one provider/voice/model/version/settings only after explicit owner approval.
7. Keep provider adapters so vendor changes cannot silently change Gabroo's voice identity.

**Gate B:** benchmark report reviewed and one canonical voice explicitly approved. All audition samples remain non-production.

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
| Identity | Owner confirms all model views/expressions match approved Concept C |
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
1. Import the exact approved reference PNG byte-for-byte and verify its checksum in Git.
2. Create the production model comparison directly from that source and obtain owner sign-off.
3. Create the audition script, candidate scorecard and owner-review packet.
4. Run contract typecheck/tests and integrate the renderer against the approved rig.
5. Build registration-to-Meet-Gabroo state flow using approved artwork only.
6. Integrate the voice only after owner approval.
7. Connect streaming audio timing and interruptible live conversation.
8. Run identity, conversation, lip-sync, accessibility and Android performance tests.

## 6. Verified implementation status
- Concept C identity and personality direction: approved and locked.
- Binding identity-lock document: present.
- Exact approved reference sheet: located, inspected and SHA-256 verified; manifest recorded.
- Reference PNG committed byte-for-byte to repository: pending.
- Voice direction: approved; exact voice: pending benchmark and owner approval.
- Production 3D model, rig and animation: not verified as present.
- Provider-neutral audio-timed viseme/expression/gesture contract and expanded unit tests: added in this delivery branch; CI and renderer integration pending.
- Streaming Malayalam voice, precise lip-sync and live interruptible avatar: not verified as implemented.
- Registration-to-live-Gabroo onboarding: specified; end-to-end implementation and QA pending.

Documentation and contracts do not imply production rendering or voice capabilities are complete.
