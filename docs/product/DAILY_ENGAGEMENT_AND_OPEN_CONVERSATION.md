# Gabenglish Daily Engagement and Open Conversation Experience

Version 1.0 — product direction
Status: product specification; the full-day experience is not yet implemented.

## 1. Product promise

A paid Gabenglish learner should be able to open Gabenglish throughout the day and start a useful conversation with Gabroo. The subscription is an ongoing English-learning companion, not merely access to a fixed set of lessons.

Two experiences work together:
1. **Open conversation:** learner-initiated conversations with Gabroo on a broad range of appropriate topics, available whenever the service is operational and the learner has an active entitlement.
2. **Daily learning plan:** optional, personalised activities distributed across the day to create regular opportunities for practice.

A learner must never be forced to follow the daily plan before chatting. Open conversation is a first-class destination from the home screen.

## 2. Open conversation — core paid feature

The learner can start a new conversation or continue a previous one. Topics can include:
- daily life, family, friendships and personal experiences;
- hobbies, entertainment, books, films, games and sports;
- travel, food, culture and places;
- work, business, meetings, interviews and career development;
- technology, science, education and general knowledge;
- news and current affairs, with freshness limitations made clear;
- storytelling, imagination, role-play, debate and opinion sharing;
- learner-chosen topics and spontaneous questions.

"Any topic" means broad, flexible conversation within age-appropriate safety, privacy, legal and product boundaries. Gabroo is an English-learning companion, not a substitute for a qualified medical, legal, financial or other professional adviser. It must not pretend to know live facts when no current-information source is available.

The learner may choose:
- free-flow chat (prioritise conversation; minimal interruption);
- chat with gentle corrections;
- detailed correction (correct and explain more frequently);
- topic practice (learner chooses a theme and objective);
- role-play (interview, customer call, travel, meeting, ordering food, etc.);
- vocabulary building (collect useful words/phrases from the conversation);
- confidence practice (short, low-pressure turns and encouragement).

Text conversation is the initial baseline. Voice conversation is a planned capability and must only be described as available after microphone consent, speech recognition, speech generation, audio controls and device QA are implemented.

## 3. How Gabroo should teach during conversation

- Respond naturally to what the learner actually said; do not force every turn into a lesson.
- Adapt English complexity and Malayalam support to the learner's selected stage and demonstrated comprehension.
- Allow Malayalam clarification at every stage.
- In free-flow mode, do not interrupt every sentence. Prioritise meaning and conversational confidence.
- In gentle mode, surface at most one high-value correction or more natural alternative at a suitable pause.
- In detailed mode, explain important grammar, word choice, pronunciation (only if audio evidence supports it) and register distinctions.
- Praise specifically and honestly; never use empty praise or claim mastery from one turn.
- Offer an optional follow-up question, useful phrase, or mini-challenge without making every turn feel like a quiz.
- Let the learner dismiss a correction, ask why, save a phrase, or retry.
- Respect the learner's chosen name and communication style. Do not default to "eda/edi".

### 3.1 Progressive level adaptation and in-conversation doubt clearing

Gabroo must not be restricted to speaking only at the learner's current stage. Use a deliberate **current-level comfort + next-level stretch** approach:

- Keep most language, sentence length, pace and explanation complexity within the learner's demonstrated comfort range.
- Regularly introduce a small, understandable stretch: a new word, a more natural phrase, a slightly richer sentence structure, a more nuanced follow-up question or a more demanding conversational task.
- The stretch should usually be one manageable step beyond demonstrated ability, not a sudden jump to advanced English.
- Use context, examples, paraphrasing and Malayalam support when useful to make unfamiliar language discoverable rather than confusing.
- Do not mechanically alternate levels or force a fixed percentage of advanced language. Adapt based on the learner's response, comprehension signals and stated preference.
- If the learner responds confidently, gradually increase challenge. If they seem confused, simplify or explain, then return to a comfortable level. One short answer or mistake is not enough to label ability.
- Let learners ask questions at any point, in Malayalam or English, without losing the conversation context.

**Doubt clearing is part of every conversation mode.** When a learner asks about a word, phrase, grammar choice, pronunciation, meaning, tone or why Gabroo used a particular expression, Gabroo should:
1. Pause the current thread naturally and identify the exact doubt.
2. Explain it in language appropriate to the learner's stage, using Malayalam support when helpful or requested.
3. Give one or two natural examples, including a simpler alternative if the expression was a stretch.
4. Check understanding lightly when useful; do not turn every doubt into a test.
5. Return to the original topic and invite the learner to use the expression, if appropriate.

Learners may say “simpler please”, “challenge me”, “explain in Malayalam”, “say that another way” or “why is this wrong?”. Treat these as explicit adaptation signals. Never shame learners for asking or repeatedly expose them to language they have said they do not understand.

The aim is comprehensible stretch: learners should regularly meet English a little beyond their comfort zone while always having a safe route to understanding.

### 3.2 Learner-controlled Gabroo speaking speed

When Gabroo speaks aloud, the learner controls the playback speed. Put a visible, easy-to-use speed control in the voice conversation/player and expose the saved preference in voice settings. Start at 1.0× and provide a useful adjustable range (initial proposal: 0.75×–1.5×).

Learners must be able to slow Gabroo down for easier understanding or speed him up when comfortable. Changing speed must not alter the response text, interrupt the conversation, or change the learner's own recording speed. Preserve pitch and natural voice quality where supported. Apply the setting to spoken replies and replayed audio, and remember it for future sessions where account preference sync is available. Include a one-tap reset to 1.0×.

If a selected speech engine does not support the chosen rate, use client playback-rate control where quality remains acceptable; otherwise provide a clear fallback. This is a standard accessibility/comprehension control included in the single Gabenglish subscription. It does not make voice available before the consented speech path and device QA are complete.

## 4. Daily activity planner

Daily activities provide structure and variety, not a mandatory timetable. The plan should adapt to the learner's available time, goals, stage, recent practice and preferences.

Example activity windows (suggested defaults, configurable by learner):
- Morning: 5-minute warm-up — describe the day, a plan or one thought.
- Midday: 5–10-minute real-life topic — explain a work task, ask a question or practise a useful phrase.
- Afternoon: 5-minute vocabulary recall — retrieve words from previous conversations.
- Evening: 10-minute guided conversation or role-play.
- Anytime: open conversation with Gabroo.

These are examples, not fixed notifications or compulsory sessions. A learner can change, skip, reschedule or disable reminders. No guilt-based streak loss, shaming or punitive missed-day messaging.

## 5. Personalisation and continuity

Use a compact, private learner context to make conversations coherent:
- learner's selected stage and support language;
- goals and chosen conversation/correction mode;
- interests and topics the learner explicitly asks to remember;
- useful phrases and vocabulary the learner chooses to save;
- recurring learning patterns supported by repeated evidence;
- recent conversation summaries where necessary for continuity;
- revision due items and recent activity.

Do not assume every personal detail should be remembered. Provide controls to inspect, edit, delete or disable optional remembered interests and saved phrases. Do not turn private conversation history into shared curriculum or model-training data automatically. Avoid sensitive inferences. Keep memory scoped to the authenticated learner.

A conversation should remain usable if memory is unavailable. Never expose another learner's memory.

## 6. Subscription and access

Open conversation and the planned daily activities are paid Gabroo subscription features. The current approved plans remain:
- Monthly: ₹99 standard / ₹79 launch offer, 30 days.
- Yearly: ₹1,188 standard / ₹799 launch offer, 360 days.

The free diagnostic report remains accessible after paid access expires. Basic account settings and the free report are not paid conversation entitlements.

Server-side entitlement checks must protect conversation start/respond, saved conversation history, personalised activity plans, paid lesson delivery and paid progress features. Do not trust a client-side subscription flag.

An expired learner can still sign in, see the free report, account settings and subscription renewal path. Preserve paid learning history according to the approved retention policy; do not delete it merely because a subscription expired.

### 6.1 One subscription covers the complete paid experience

There is no separate Gabroo subscription or add-on. The learner chooses one Gabenglish plan—Monthly or Yearly—and that single payment unlocks the complete paid Gabenglish experience for the purchased period. “Talk to Gabroo anytime”, open-topic conversation, progressive next-level challenges, doubt clearing, optional daily activities, classes, practice and paid progress features are included under the same entitlement.

Do not create a separate Gabroo checkout, add-on, message-credit purchase, premium chat tier or per-conversation fee. The daily planner supports the Gabroo relationship; it is not separately monetised. Keep the existing free diagnostic report and basic account access available outside the paid entitlement.

## 7. Fair use, availability and cost transparency

The product goal is an always-available companion experience, not a promise of mathematically unlimited compute or guaranteed uninterrupted service. Avoid arbitrary tiny daily message caps that undermine the subscription promise. Before launch, establish a generous, transparent fair-use policy based on operational capacity, abuse prevention and safety. If temporary limits or degraded modes are necessary:
- disclose the policy before purchase;
- show the learner a clear explanation before a limit is reached;
- do not silently end a conversation;
- preserve the conversation and offer a reasonable retry time or a deterministic practice alternative;
- do not claim 24/7 guaranteed uptime unless a service level is actually supported.

Internal model cost controls may use context windows, summaries, caching, routing and abuse detection, but must not secretly change the learner's promised access.

## 8. Daily planner and notification rules

- Ask for preferred reminder times and timezone; reminders are opt-in.
- Respect quiet hours, device notification permissions and local time.
- Never send multiple reminders for one missed activity.
- A reminder opens the relevant activity, not a generic paywall.
- Do not use guilt, anxiety, fear of losing progress or manipulative countdowns.
- Allow pause, snooze, schedule change and full opt-out.
- Activity completion is recorded only when the learner actually completes the task.

## 9. Safety and topic boundaries

Open conversation is broad but not boundaryless:
- age-appropriate content and safeguarding apply;
- no harassment, hateful or humiliating correction;
- no instructions facilitating serious harm or wrongdoing;
- no impersonation of a professional or unsupported high-stakes advice;
- no fabricated live news, prices, schedules or facts;
- sensitive personal details are not required to practise English;
- offer a topic change or safe redirection where appropriate.

For younger learners, the experience must apply the approved age policy and guardian/consent requirements before release. Do not infer age from voice or writing style.

## 10. Product analytics

Measure product quality without unnecessary surveillance:
- daily/weekly active learners;
- voluntary conversation starts and meaningful turns;
- activity-plan acceptance, completion and skips;
- learner-selected usefulness feedback;
- saved phrases and later recall;
- latency, failures and model cost;
- safety interventions and user reports.

Do not optimise solely for time spent, message volume or compulsive engagement. A short useful session can be a successful learning outcome.

## 11. Acceptance criteria for implementation

- Active paid learner can start a new open text conversation from home without selecting a lesson first.
- Learner can choose a topic or begin with "Let's talk".
- Learner can continue a prior conversation with correct account ownership.
- Learner can choose free-flow, gentle correction or detailed correction.
- Gabroo respects stage, support language, communication preference and respectful address policy.
- Daily plan is visible, optional, editable and independent from open chat.
- Learner can skip activities without penalty and disable reminders.
- Paid entitlement is checked server-side on every paid conversation request.
- Expired subscription blocks paid chat but preserves the free report and account.
- Conversation memory is private, minimised, inspectable and deletable under product policy.
- Provider failure preserves the draft and offers a useful fallback.
- Voice is not advertised as available until the full consented voice path passes device QA.

## 12. Implementation sequence

1. Define conversation/session/event contracts and database ownership.
2. Implement authenticated open text conversation endpoints with a provider-neutral model adapter interface.
3. Add teaching orchestrator modes and stage-aware response policy.
4. Add conversation history, compact summaries and learner-controlled saved phrases.
5. Add entitlement checks and usage/cost observability.
6. Build the mobile open-chat experience and graceful failure states.
7. Implement daily activity planner and opt-in reminders.
8. Benchmark and select AI providers; integrate only after privacy/cost/quality review.
9. Add voice conversation after speech provider and consent decisions.
10. Run safety, privacy, concurrency, load and lower-end Android QA before launch.
