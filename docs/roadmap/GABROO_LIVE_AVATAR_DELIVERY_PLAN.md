# Gabroo Live Avatar Delivery Plan

Status: approved direction; delivery work is staged. This plan does not claim that a production 3D avatar, final voice, or realtime lip-sync has been delivered.

## 1. Non-negotiable identity lock

The sole character is **Concept C — Signature Gabroo**, as defined by `docs/brand/GABROO_CHARACTER_GUIDE.md` and the owner-approved source artwork.

- Use the exact approved face, head shape, eye spacing, nose, mouth, hairline/curls, skin tone, body proportions, silhouette, cap, hoodie, headphones, outfit and G marks.
- Never generate, redesign, remix, substitute, stylise into another identity, or use a provider/demo avatar.
- All 3D modelling, rigging, expressions, gestures and animation must be built on the approved source identity.
- A facial expression or pose may change; the character's identity may not.
- Until the production model is available, use only the approved static artwork or a clearly labelled placeholder. Do not create a lookalike to fill the gap.
- Any proposed identity change requires explicit owner approval and a versioned brand revision. No such change is in scope.

## 2. Delivery workstreams

### A. Approved asset intake and provenance
1. Locate the original owner-approved Concept C source artwork and any editable source files already supplied.
2. Record canonical asset filenames, versions, dimensions, licence/ownership and checksums.
3. Keep source artwork read-only; create derived production files without altering the reference.
4. Commission or build the production 3D model strictly from that source, with front/side/back/three-quarter review against the reference.
5. Obtain owner approval of the model before facial rigging or animation is accepted.

**Gate A:** source provenance is recorded and the model visibly matches the approved reference. No alternate character assets are accepted.

### B. Canonical Gabroo voice
1. Prepare one identical audition script for every candidate: name greeting, self-introduction, Malayalam-English code-switch, English teaching phrase, correction encouragement, gentle joke, patient response and follow-up question.
2. Benchmark at least three commercially usable male voice candidates with the same settings and script.
3. Have multiple Kerala Malayalam-fluent listeners blind-score naturalness, Kerala accent authenticity, pronunciation, warmth, energy, emotional range, code-switching, English clarity and long-session comfort.
4. Measure streaming latency, reliability, speaking-rate control and cost; review commercial rights, retention and model-training terms.
5. Reject robotic, formal/bookish, exaggerated, caricatured or tiring voices even if inexpensive.
6. Present the samples and scorecard to the owner. Lock one canonical provider/voice/model/version/settings only after explicit owner approval.
7. Keep a provider adapter so a vendor change cannot silently change Gabroo's voice identity.

**Gate B:** owner approves the benchmark report and one canonical voice identity. Until then, all voices are audition-only and must be labelled as such.

### C. Production rig and lively animation
- Build a facial rig on the approved model: jaw, lip width/rounding, M/B/P closure, F/V contact, L/tongue placement, vowel shapes, cheeks, brows, eyelids, eye aim and blinks.
- Build body controls and reusable idle/breathing, greeting, listening, thinking, explain, teach, encourage and celebrate motions.
- Blend poses smoothly through neutral states; avoid repetitive gestures and exaggerated face deformation.
- Include reduced-motion and approved static-artwork fallbacks.
- Test on low-, mid- and high-range Android devices before setting final performance budgets.

### D. Speech-to-animation synchronisation
Use a provider-neutral animation contract. Prefer timestamped phoneme/viseme events from the speech provider or alignment service; use calibrated audio-driven estimation only if timestamped events are unavailable. A restrained mouth loop is a labelled fallback, never represented as accurate lip-sync.

The runtime must:
- schedule mouth shapes against the actual audio clock;
- smooth co-articulation and compensate for playback latency;
- keep the mouth neutral during silence/listening;
- stop audio and speaking animation together on barge-in;
- blend expression and gesture cues without losing phoneme timing;
- recover cleanly from interrupted, failed or cancelled audio.

### E. Live tutor and onboarding
1. After registration/verification, load the learner's preferred profile name.
2. Show the approved Gabroo artwork/model full-screen.
3. Play a short personalized opening using the owner-approved voice.
4. Ask one simple question and wait for the learner's real voice or text response.
5. Stream recognition and a context-aware response; do not play a prewritten response as if it heard the learner.
6. Drive mouth animation from the response's actual speech timing and facial/body cues from conversation context.
7. Support barge-in, captions/transcript, replay, mute, speed adjustment, skip and Meet Gabroo later.
8. Move to conversational placement only after rapport is established; finish with a spoken personalized level, strengths and first goal.
9. Reuse the same live tutor runtime for Talk to Gabroo anytime, lessons, practice and daily activities.

## 3. Provider-neutral runtime boundaries

Keep separate adapters/contracts for:
- speech capture and permissions;
- voice activity/end-of-turn detection;
- streaming speech recognition;
- conversation orchestration and learner context;
- response text plus structured emotion/gesture cues;
- streaming speech synthesis;
- phoneme/viseme alignment;
- canonical Gabroo rig controls and animation playback.

Provider-specific event names must not leak into the character rig or learning domain. No provider secret may be shipped in the mobile app.

## 4. Quality and release gates

| Gate | Pass condition |
|---|---|
| Identity | Owner confirms model matches approved Concept C in every tested view and expression |
| Voice | Kerala Malayalam reviewers pass the blind benchmark; owner approves one canonical voice |
| Speech | Malayalam/code-switching and teachable English are clear, natural and consistent |
| Lip-sync | M/B/P closure, F/V contact, vowels, silence and interruption are visibly correct; no obvious drift |
| Liveness | Unscripted learner replies change Gabroo's response and expression appropriately |
| Interruption | Learner can barge in; audio and speaking animation stop promptly |
| Accessibility | Text input, captions, mute, replay, speed control and reduced motion work |
| Android | Device matrix passes frame, memory, latency, battery and network-recovery checks |
| Privacy | Microphone consent, data minimisation, retention and provider terms are reviewed |

Do not call any gate passed without recorded test evidence. A generated storyboard or static image is not a video, voice, rig, or live conversation implementation.

## 5. Immediate execution order

1. Remove all character-exploration tasks and freeze Concept C as the sole source of truth.
2. Audit repository and supplied files for the original approved source artwork/model; record exact asset provenance.
3. Create the audition script, candidate scorecard and owner-review packet.
4. Define typed provider-neutral speech, viseme, expression and interruption contracts.
5. Build the registration-to-Meet-Gabroo state flow with the approved static asset as the temporary visual.
6. Integrate the selected voice only after the owner approves the benchmark.
7. Integrate the approved 3D model/rig and timestamped speech animation.
8. Run end-to-end conversation, identity, lip-sync, accessibility and Android performance tests.

## 6. Current verified state

- Concept C identity and personality direction: approved and locked.
- Character guide and production specification: present.
- Live tutor and onboarding requirements: documented.
- Voice direction: approved; exact voice identity: pending audition and owner approval.
- Approved concept artwork: identity reference only; not a production-ready 3D model.
- Production 3D model/rig/animation: not verified as present.
- Streaming Malayalam voice and phoneme-level lip-sync: not verified as implemented.
- Registration-to-live-Gabroo onboarding: specified; end-to-end implementation must be verified before release.

