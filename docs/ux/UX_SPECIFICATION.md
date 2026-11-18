# Gabenglish UX and Screen Specification

Version 1.1 — information architecture with live Gabroo-first onboarding.

## 1. UX objectives
Make the next learning action obvious; make Malayalam-supported beginners comfortable; make speaking low-pressure; keep screens readable and accessible; preserve lesson position; and provide loading, empty, offline and error states. Keep the interface mature, warm and uncluttered. The approved Gabroo character is a consistent tutor identity, not a reason to make the overall interface childish.

## 2. Primary navigation
1. Home — daily plan, continue learning, progress snapshot and live Gabroo prompt.
2. Learn — five-stage path, grammar, vocabulary and listening.
3. Speak — live conversation, roleplay and pronunciation with Gabroo.
4. Practice — translation, revision, quizzes and challenges.
5. Profile — learner profile, reports, subscription, preferences and privacy.

## 3. Screen inventory
### Onboarding
Splash/welcome; registration/login/recovery; support-language preference; goals and available practice time; microphone explanation and permission at point of need; **Meet Gabroo live introduction**; conversational placement assessment; recommended starting stage with explanation.

### Meet Gabroo (first successful registration)
- Full-screen presentation of the exact approved Concept C Gabroo character.
- Short personalized spoken welcome using the learner's profile name when available.
- Natural Kerala Malayalam delivery using the eventually approved canonical Gabroo voice.
- Actual microphone response and context-aware follow-up; not a long prerecorded video or fixed script pretending to be live.
- Visible listening, thinking and speaking states; synchronized mouth animation driven by actual speech timing when production rig/timing is available.
- Voice and text response options, captions, replay, mute, skip and "meet Gabroo later".
- Transition into conversational placement only after a short rapport-building exchange.
- If production avatar/voice is unavailable, use approved static Gabroo artwork and clearly functional voice/text controls; never substitute another character.

### Home
Priority order: greeting and short live Gabroo message; current stage and next milestone; Continue Learning; Talk to Gabroo; daily target; vocabulary revision; daily challenge; weekly skill snapshot. Avoid dense statistics and excessive streak pressure.

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
Approved character and state; live session objective; transcript; large microphone control; replay/slower speech/repeat prompt; transcript toggle; Malayalam explanation; correction preference; interrupt/barge-in; end-session summary.

### Feedback
Original sentence; corrected version; natural alternative; error category; Malayalam explanation; retry; save useful expression.

### Progress
Skill-specific history, evidence-based strengths and improvement areas, recommended next activity. No unsupported fluency or certification labels.

### Profile and subscription
Account/preferences; support language; notification settings; Gabroo speech speed; voice settings when available; subscription/renewal/cancellation; privacy, recording consent and account deletion.

## 4. Speaking states
Idle, greeting, listening, thinking/processing, speaking, interrupted, feedback, paused, permission denied, network failure and provider failure. Always show whether microphone capture is active. Prevent duplicate submissions and preserve safe retry context. Stop audio and speaking animation promptly when interrupted.

## 5. Correction modes
Gentle (important errors or end-of-session); Balanced (meaningful errors after learner finishes); Detailed (more complete feedback). Default Balanced. Do not interrupt every sentence during free conversation.

## 6. Design direction
Ocean/deep blue primary, sky blue secondary, warm orange accent, soft neutral backgrounds, high-contrast text, readable rounded sans-serif, clean cards, restrained shadows, large touch targets, consistent icons and only the approved original Gabroo artwork/model. Avoid excessive gradients, glass effects and tiny text.

## 7. Reusable components
Buttons; inputs; navigation; lesson/stage cards; progress indicators; conversation bubbles; audio player; microphone control; avatar state container; captions/transcript; vocabulary card; feedback panel; quiz controls; dialogs/bottom sheets; empty/loading/error states; inline feedback; subscription cards.

## 8. Accessibility
System text scaling; captions/transcripts where appropriate; adequate contrast; status not conveyed by colour alone; reduced-motion support; comfortable touch targets; common Android and lower-end device testing; shared iOS design considerations; text alternative to voice; visible microphone state.

## 9. Screen acceptance
Every screen specification must define purpose, primary action, navigation entry/exit, loading/empty/error states, validation, accessibility and analytics events. Meet Gabroo must additionally pass the voice, identity, conversation and lip-sync quality gates in `docs/ai/GABROO_LIVE_CONVERSATION_SPEC.md`.
