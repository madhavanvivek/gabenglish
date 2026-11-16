# Gabenglish Android MVP Screen and Flow Specification

Version 1.0 — foundation for wireframes and implementation.

## Primary learner journey
1. Welcome and value proposition.
2. Language selection and Malayalam support preference.
3. Account creation/sign-in and consent.
4. Goal selection (work, study, travel, everyday confidence or other).
5. Short placement assessment with skip/retry option.
6. Personalised starting level and explanation of the learning path.
7. Dashboard with one clear next lesson, revision due and speaking practice entry.
8. Lesson: explain, demonstrate, practise, feedback and recap.
9. Progress summary and next recommended activity.

## Core screens

### Welcome and onboarding
Explain that Gabenglish teaches English through Malayalam and gradually builds English-first confidence. Show canonical Gabroo art. Avoid promising fluency in a fixed number of days.

### Learner profile
Collect only necessary details: display name, preferred explanation language, learning goal, experience estimate and optional reminder preference. Explain why microphone permission is needed before requesting it.

### Placement assessment
Use short, varied tasks covering vocabulary, grammar, listening and optional speaking. Allow learners to skip speaking. Assessment output is an estimated starting point, not a permanent label; learners can retake it.

### Home dashboard
Show current stage, next recommended lesson, revision queue, speaking practice, recent progress and a modest daily goal. Avoid clutter and avoid making streak preservation the primary success measure.

### Lesson player
Keep one learning objective visible. Support Malayalam explanation, English examples, audio replay, contextual usage, short practice and a recap. Preserve learner position when navigating away and returning.

### Vocabulary and revision
Show word, meaning, pronunciation/audio, example sentence and learner-created example. Schedule revision using performance and recall history; provide a clear review action.

### Speaking tutor
Show microphone state, recording consent/context, live or post-turn transcript, replay, response and correction preference. Provide Gentle, Balanced and Detailed feedback modes. Do not interrupt every utterance by default.

### Progress
Show demonstrated skills, completed objectives, areas to practise and next recommendations. Separate confidence/self-report from measured performance.

### Settings and privacy
Manage language, correction style, audio playback, reminders, voice-data retention choices, permissions, subscription, data export and account deletion.

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
This is a screen/flow specification, not a finished wireframe or implemented UI. Validate through learner usability testing before finalising interaction details.
