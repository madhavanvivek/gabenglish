# Gabroo Live Tutor Experience

Status: implementation specification — approved direction, production implementation pending.
Owner: Gabenglish product and engineering.

## 1. Product decision

Gabroo is the learner's persistent, live conversational tutor. He is not a slideshow, a sequence of prerecorded clips, a talking-head template, or a generic assistant with a character skin.

After successful registration, the learner meets Gabroo in a short, personalized, voice-led introduction. The introduction transitions directly into a real conversation. Gabroo addresses the learner by their verified profile first name when available, asks a simple question, listens, reacts to the actual response, and adapts the next turn. The first interaction may be guided, but must not pretend a prerecorded sequence is a live response.

The same conversational experience is the foundation of Talk to Gabroo anytime, placement, lessons, practice, and daily activities.

## 2. Non-negotiable character identity

Use only the approved **Concept C — Signature Gabroo** identity documented in `docs/brand/GABROO_CHARACTER_GUIDE.md` and its approved concept sheet.

- Do not generate, substitute, redesign, reinterpret, or mix in another character.
- Do not change the face, head shape, eye spacing, nose, mouth, hairline/curls, skin tone, body proportions, silhouette, cap, hoodie, headphones, outfit, or G marks.
- Do not use generic stock avatars, alternate AI-generated character images, or provider demo avatars in the product.
- All expression, body, facial, and phoneme animation must be rigged onto the same approved model.
- Expression changes must preserve identity. No exaggerated deformation that makes Gabroo look like a different person.
- If the approved production 3D source/model is not available to the build, show a clearly labelled integration placeholder or the approved static artwork. Never silently substitute a new character.
- A character/asset change requires explicit owner approval and a versioned brand revision.

The approved concept sheet is a visual identity reference, not a production-ready 3D model. Production model, rig, animation clips and Android exports must be delivered and reviewed before claiming the avatar is complete.

## 3. Voice identity and selection

### Locked voice direction
- Male, youthful-adult sounding.
- Natural Kerala Malayalam pronunciation and rhythm.
- Warm, energetic, friendly, curious, talkative and patient.
- Casual, understandable Kerala Malayalam; natural Malayalam-English code-switching.
- Gentle situational humour; never insulting, humiliating, stereotyping or mocking a learner.
- Clear English pronunciation suitable for teaching.
- Emotionally responsive: reduce energy and humour when the learner is confused, upset, hesitant or requests serious help.

### Not yet locked
The exact voice actor/provider/voice ID is not selected until a blind benchmark is completed. Do not treat a generic demo voice or the earlier basic synthesized sample as the final Gabroo voice.

### Voice selection process
1. Prepare the same short script for every candidate, including conversational Malayalam, code-switching, English teaching, a question, encouragement, and a gentle joke.
2. Obtain commercially usable candidate samples and document consent, ownership/licence, cloning rights if applicable, permitted use, retention, and provider training terms.
3. Have Kerala Malayalam-fluent reviewers score candidates without provider names where practical.
4. Score naturalness, Kerala authenticity, pronunciation, warmth, energy, emotional range, English clarity, long-session comfort, latency, reliability, speed control and cost.
5. Reject candidates that sound robotic, formal/bookish, synthetic, caricatured, or inconsistent in Malayalam-English switching, regardless of price.
6. Select and approve one canonical Gabroo voice identity; record provider, voice ID, model/version, settings, licence and fallback. Keep a replaceable provider adapter.
7. Re-run the benchmark after provider/model changes. Do not change the canonical voice without owner approval.

## 4. Live conversation architecture

Use a streaming, turn-based or realtime voice pipeline with replaceable adapters:

- Microphone capture and permission lifecycle.
- Voice activity detection / end-of-turn detection.
- Streaming speech recognition that handles Kerala Malayalam, Malayalam-English code-switching and Malayalam-accented English.
- Conversation orchestrator with learner profile, current learning level, session history and teaching policy.
- Response generation that produces both spoken text and structured intent/emotion/animation cues.
- Streaming speech synthesis using the approved Gabroo voice.
- Timestamped phoneme/viseme or equivalent speech-alignment events where supported.
- Avatar animation adapter mapping provider-neutral cues to the canonical Gabroo rig.
- Playback, barge-in/interruption, cancellation and recovery.

Do not hard-code one vendor's viseme names or audio event schema into the character rig. Normalize them through adapters. Preserve a fallback path when precise timing is unavailable, but label it approximate and never claim accurate lip-sync.

## 5. Speech-to-animation synchronization

Priority order:
1. Timestamped phoneme/viseme alignment from the selected speech provider or a dedicated alignment service.
2. Audio-driven phoneme estimation with calibrated timestamps.
3. Restrained approximate talking loop only as a fallback.

The rig must support at least:
- Closed lips: M/B/P.
- Lip/teeth contact: F/V.
- Tongue placement: L and relevant dental/alveolar shapes.
- Open vowels and rounded vowels: A/AA, E/EE, I, O, U.
- Jaw opening/closing, mouth width/rounding, cheek movement.
- Neutral-to-smile transitions, brows, eyelids, eye aim and blinks.

Requirements:
- Co-articulation and smooth interpolation; avoid snapping between mouth shapes.
- Account for audio output latency and animation clock drift.
- Keep the jaw and lips aligned to the audible phoneme, not merely a generic speaking state.
- Blend face animation with listening/thinking/emotional expression without breaking speech sync.
- No repetitive open-close mouth loop during silence.
- On interruption, stop speech promptly and transition naturally to listening.
- On network/audio failure, return to a calm idle/listening state and explain briefly.

## 6. Responsive, lively behaviour

Conversation states: greeting, listening, thinking, responding, speaking, interrupted, recovering and ended.

Each state has subtle animation:
- Greeting: direct eye contact, natural smile, small wave.
- Listening: mouth relaxed, attentive gaze, occasional nod/blink; no speaking mouth loop.
- Thinking: brief gaze shift and restrained thinking expression; avoid long theatrical delay.
- Responding: speech-synced lips plus context-appropriate brows, head and hand gestures.
- Encouraging: warm smile and supportive nod.
- Playful: brief, gentle expression/gesture only when context is appropriate.
- Frustration/help: lower energy, patient expression, no teasing.
- Interrupted: immediately stop speaking, settle mouth to neutral and listen.

Animation cues must be generated from conversation context and speech timing, not played as one fixed animation for every sentence. Avoid random gestures that distract from learning.

## 7. Registration and first-session flow

1. Registration and required verification complete.
2. Load the learner's preferred display name; use it naturally, do not repeat it unnaturally.
3. Present the approved Gabroo character in a full-screen, voice-led welcome.
4. Gabroo introduces himself briefly in natural Kerala Malayalam and explains that mistakes are welcome.
5. Ask one easy, open question and wait for the learner's actual response.
6. Listen by voice; offer text input as an accessible alternative.
7. Respond to the learner's actual answer and continue a short, natural exchange.
8. Transition into the conversational placement assessment only after rapport is established.
9. Finish with a spoken, personalized level/strength/first-goal explanation.
10. Enter the app with Talk to Gabroo anytime as the central experience.

A short intro line may be pre-authored, but subsequent turns must be generated from the learner's actual input. Do not autoplay a long fixed script or falsely imply that a prerecorded video is responding live. Allow skip/replay and a later "Meet Gabroo" entry point.

## 8. Learner controls and accessibility

- Microphone permission is requested in context and can be revoked.
- Visible listening, thinking, speaking and muted states.
- Learner can interrupt Gabroo at any time.
- Text fallback for voice input and transcript/captions for spoken output.
- Speaking speed control must affect Gabroo's playback without changing pitch unnaturally where provider support permits.
- Replay last response.
- Mute audio and use captions.
- Reduced-motion mode and approved static-avatar fallback.
- Clear network, microphone and audio error recovery.
- Do not store raw voice recordings by default; apply consent, minimisation and retention policy.

## 9. Privacy and safety

- Explain microphone use before first capture.
- Obtain explicit consent for any recording retention or voice data reuse.
- Do not use learner audio to train a provider model without separate explicit authorisation.
- Do not infer sensitive traits from voice or accent.
- Keep humour respectful and age-aware. Avoid overfamiliar forms of address unless the learner has indicated they like them.
- Protect profile name, transcripts and learning memories; provide correction/deletion controls.
- Treat speech recognition uncertainty explicitly; ask for clarification rather than inventing what the learner said.

## 10. Quality gates

### Voice gate
- Kerala Malayalam reviewers approve pronunciation, rhythm and naturalness.
- English pronunciation is clear and teachable.
- No robotic/formal/bookish delivery in the core script.
- Emotion and speed remain comfortable across a longer session.
- Commercial rights and privacy terms are approved.

### Lip-sync gate
- Closed-mouth consonants visibly close.
- F/V and vowel shapes are distinguishable.
- Mouth timing tracks the audible speech; no obvious drift.
- Silence does not animate as speech.
- Interruptions stop audio and speaking animation promptly.
- Face remains recognizably the approved Gabroo identity.

### Conversation gate
- Learner's name is used naturally.
- Follow-up reflects the learner's actual response.
- Unscripted answers, hesitation, code-switching and interruptions are handled.
- Learner can switch to text, replay, slow speech and leave the session.
- No fixed sequence masquerades as a live conversation.

### Android gate
- Validate on representative low-, mid- and high-range Android devices.
- Measure time to first audio, end-of-turn latency, interruption latency, A/V sync drift, frame rate, memory, battery and network recovery.
- Define numeric budgets only after measuring the chosen stack on the device matrix.
- Keep the approved static-avatar fallback available for unsupported devices.

## 11. Benchmark and delivery checklist

- [ ] Approved Concept C model/source asset located and version-pinned.
- [ ] Production 3D model and source ownership/licence verified.
- [ ] Canonical rig and animation library delivered.
- [ ] Candidate voice samples recorded/generated under appropriate rights.
- [ ] Kerala Malayalam blind voice benchmark completed.
- [ ] One Gabroo voice identity approved and version-pinned.
- [ ] STT and streaming conversation benchmark completed.
- [ ] Provider-neutral speech/viseme adapter implemented.
- [ ] Phoneme/viseme timing calibrated against actual audio.
- [ ] Barge-in, listening, thinking and error recovery implemented.
- [ ] Registration-to-first-conversation flow implemented.
- [ ] Android device matrix and accessibility tests passed.
- [ ] Product owner accepts voice, animation and complete experience.

## 12. Current implementation truth

This document defines the approved target experience. It does not claim that production voice, 3D model, rig, real-time lip-sync or live conversation are already implemented. The current repository's mobile app directory contains only the not-found route; a runnable onboarding screen and avatar runtime are not yet present. Build those after the approved model/source asset and voice benchmark inputs are available.