# Gabenglish Android MVP Screen and Flow Specification

Version 1.1 — Android-first learner journey with live Gabroo introduction.

## Primary learner journey
1. Welcome and value proposition.
2. Language selection and Malayalam support preference.
3. Account creation/sign-in and consent.
4. Learner profile: display name, goal and optional practice time.
5. Registration succeeds; transition directly to **Meet Gabroo** using the approved Concept C character.
6. Gabroo greets the learner by name when available, introduces himself briefly in natural Kerala Malayalam and invites a response.
7. Learner responds by voice or text; Gabroo reacts to the actual response in a live, context-aware exchange.
8. Short conversational placement assessment.
9. Personalized starting level and spoken explanation from Gabroo.
10. Dashboard with one clear next lesson, revision due and Talk to Gabroo entry.
11. Lesson: explain, demonstrate, practise, feedback and recap.
12. Progress summary and next recommended activity.

## Core screens

### Welcome and onboarding
Explain that Gabenglish teaches English through Malayalam and gradually builds English-first confidence. Show only canonical approved Gabroo art. Avoid promising fluency in a fixed number of days.

### Learner profile
Collect only necessary details: display name, preferred explanation language, learning goal, experience estimate and optional reminder preference. Explain why microphone permission is needed before requesting it. Use the display name for personalization; do not repeatedly force it into every response.

### Meet Gabroo — required post-registration experience
- Show the exact approved Concept C Gabroo character. Never generate or substitute another character.
- Play a short personalized spoken introduction using the canonical Gabroo voice after it has been selected and approved.
- Ask one simple question and wait for the learner's real answer.
- Use streaming voice interaction where available; provide text fallback and captions.
- Drive mouth animation from actual audio phoneme/viseme timing. A generic mouth loop is only a disclosed fallback and must not be presented as accurate lip-sync.
- Support natural listening, thinking, speaking, interruption, replay, mute and skip/later states.
- Continue with a context-aware follow-up. Do not play a fixed scripted video as if it were reacting live.
- If production 3D model/voice is not ready, use approved static Gabroo artwork with functional voice/text interaction and a clear implementation fallback. Do not use a different avatar.

### Placement assessment
Use short, varied tasks covering vocabulary, grammar, listening and optional speaking. Allow learners to skip speaking. Assessment output is an estimated starting point, not a permanent label; learners can retake it. Prefer a conversation with Gabroo after rapport has been established.

### Home dashboard
Show current stage, next recommended lesson, revision queue, speaking practice, recent progress and a modest daily goal. Make Talk to Gabroo prominent. Avoid clutter and avoid making streak preservation the primary success measure.

### Lesson player
Keep one learning objective visible. Support Malayalam explanation, English examples, audio replay, contextual usage, short practice and a recap. Preserve learner position when navigating away and returning.

### Vocabulary and revision
Show word, meaning, pronunciation/audio, example sentence and learner-created example. Schedule revision using performance and recall history; provide a clear review action.

### Speaking tutor
Use the approved Gabroo identity; show microphone state, recording consent/context, live or post-turn transcript, replay, response and correction preference. Support interruption and speaking-speed adjustment. Do not interrupt every utterance by default.

### Progress
Show demonstrated skills, completed objectives, areas to practise and next recommendations. Separate confidence/self-report from measured performance.

### Settings and privacy
Manage language, correction style, audio playback/speed, reminders, voice-data retention choices, permissions, subscription, data export and account deletion.

## Learning stage progression
1. Malayalam Mode — beginner.
2. Malayalam + English Mix — elementary.
3. English Practice Mode — intermediate.
4. English Immersion — upper intermediate.
5. Expert Communication — advanced.

Language ratios are adaptive guidance, not rigid quotas. Advancement depends on demonstrated proficiency and confidence. Learners may request Malayalam support at any stage.

## Navigation principles
Keep the primary navigation small: Home, Learn, Speak, Progress and Profile. Use contextual sub-navigation for vocabulary, grammar and listening rather than crowding the global tab bar.

## Empty, loading and error states
Every data-driven screen needs loading, empty, offline, retry and permission-denied states. Preserve drafts and lesson position when safe. Never silently discard an in-progress answer or recording.

## Status
This is a screen/flow specification, not a finished wireframe or implemented UI. The current mobile app directory contains only a not-found route. Implement the post-registration Meet Gabroo flow against `docs/ai/GABROO_LIVE_CONVERSATION_SPEC.md` after approved model/source assets and the voice benchmark are available.
