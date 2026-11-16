# Gabenglish UX and Screen Specification

Version 1.0 — information architecture baseline.

## 1. UX objectives
Make the next learning action obvious; make Malayalam-supported beginners comfortable; make speaking low-pressure; keep screens readable and accessible; preserve lesson position; and provide loading, empty, offline and error states. A childlike mascot must not make the overall interface childish or cluttered.

## 2. Primary navigation
1. Home — daily plan, continue learning, progress snapshot and Gabroo prompt.
2. Learn — five-stage path, grammar, vocabulary and listening.
3. Speak — conversation, roleplay and pronunciation.
4. Practice — translation, revision, quizzes and challenges.
5. Profile — learner profile, reports, subscription, preferences and privacy.

## 3. Screen inventory
### Onboarding
Splash/welcome; registration/login/recovery; support-language preference; goals and available practice time; microphone explanation and permission at point of need; placement assessment; recommended starting stage with explanation.

### Home
Priority order: greeting and short Gabroo message; current stage and next milestone; Continue Learning; Speak with Gabroo; daily target; vocabulary revision; daily challenge; weekly skill snapshot. Avoid dense statistics and excessive streak pressure.

### Learn
Stage overview and unlock criteria; course/module list; objectives and duration; completion state and resume position; revision of previous stages; explanation of locked stages.

### Grammar
Objective; level-appropriate Malayalam explanation; English examples; audio where useful; common mistakes; guided practice; feedback and completion.

### Vocabulary
Word and part of speech; Malayalam meaning; audio; examples and collocations; common confusion; save/revise; recall exercise.

### Translation
Malayalam prompt; text or voice answer; valid alternative evaluation; separate grammar/naturalness feedback; hints and retry.

### Listening
Audio player, replay and speed; transcript when appropriate; comprehension questions; explanation/review; captions and accessible controls.

### Speaking with Gabroo
Character and state; session objective; transcript; large microphone control; replay/slower speech/repeat prompt; transcript toggle; Malayalam explanation; correction preference; end-session summary.

### Feedback
Original sentence; corrected version; natural alternative; error category; Malayalam explanation; retry; save useful expression.

### Progress
Skill-specific history, evidence-based strengths and improvement areas, recommended next activity. No unsupported fluency or certification labels.

### Profile and subscription
Account/preferences; support language; notification settings; voice settings when available; subscription/renewal/cancellation; privacy, recording consent and account deletion.

## 4. Speaking states
Idle, listening, processing, speaking, feedback, paused, permission denied, network failure and provider failure. Always show whether microphone capture is active. Prevent duplicate submissions and preserve safe retry context.

## 5. Correction modes
Gentle (important errors or end-of-session); Balanced (meaningful errors after learner finishes); Detailed (more complete feedback). Default Balanced. Do not interrupt every sentence during free conversation.

## 6. Design direction
Ocean/deep blue primary, sky blue secondary, warm orange accent, soft neutral backgrounds, high-contrast text, readable rounded sans-serif, clean cards, restrained shadows, large touch targets, consistent icons and original 3D Gabroo artwork. Avoid excessive gradients, glass effects and tiny text.

## 7. Reusable components
Buttons; inputs; navigation; lesson/stage cards; progress indicators; conversation bubbles; audio player; microphone control; vocabulary card; feedback panel; quiz controls; dialogs/bottom sheets; empty/loading/error states; inline feedback; subscription cards.

## 8. Accessibility
System text scaling; captions/transcripts where appropriate; adequate contrast; status not conveyed by colour alone; reduced-motion support; comfortable touch targets; common Android and lower-end device testing; shared iOS design considerations.

## 9. Screen acceptance
Every screen specification must define purpose, primary action, navigation entry/exit, loading/empty/error states, validation, accessibility and analytics events.

## 10. First meaningful learner experience — Gabroo placement conversation

The placement assessment is a guided, adaptive conversation with Gabroo and should precede the conventional learner dashboard. Gabroo explains the purpose and process in the learner's selected support language, begins with approachable conversation, and raises or lowers prompt difficulty based on demonstrated ability. It is not a fixed multiple-choice test. Strong learners should not be made to repeat unnecessary beginner questions.

After the assessment, show a detailed, revisitable learner report separately from Gabroo's personal explanation. The report contains evidence-based skill findings, strengths, improvement areas, recommended stage and assessment limitations. Gabroo then explains the findings in a personalised spoken message and transcript, using examples from the learner's responses. The learner can accept the recommendation, start from the beginning, choose another stage or continue with a harder challenge.

Text-only assessment must not claim to measure pronunciation or verified speaking fluency. Voice capture requires clear explanation and consent. See `docs/learning/GABROO_CONVERSATIONAL_PLACEMENT.md` for assessment behaviour and stopping criteria.

## 11. Respectful companion communication

Gabroo must be friendly without being overfamiliar. Use the learner's chosen name or respectful neutral phrasing by default. Avoid “eda/edi” and similar intimate address terms unless the learner explicitly welcomes them. Age can guide an initial style but does not determine preference; offer communication-style preferences and respect changes. Apply the full policy in `docs/brand/GABROO_COMMUNICATION_POLICY.md` across all learner touchpoints.


## 12. All-day Gabroo companion and daily plan

The paid learner home must make **Talk to Gabroo** a primary action. A learner can start an open conversation on a chosen topic or simply say they want to talk; they do not need to enter a lesson first. Provide conversation modes for free-flow chat, gentle corrections and detailed corrections. Allow the learner to continue previous conversations and save useful phrases.

Show a separate optional daily activity plan with suggested morning, midday, afternoon and evening activities. Learners can skip, reschedule or disable reminders without penalty. The plan must never block open conversation. See `docs/product/DAILY_ENGAGEMENT_AND_OPEN_CONVERSATION.md`.

Text chat is the initial implementation target. Do not present voice chat as live until consent, STT/TTS, audio controls and representative-device QA are complete.
