# AI and Speech Evaluation Plan

Version 1.1 — provider-neutral benchmark; final Gabroo voice not yet selected.

## 1. Objective
Select AI and speech services using measured performance for Malayalam-speaking English learners, not marketing claims alone. The earlier basic synthesized welcome sample is a rejected quality reference, not the final Gabroo voice.

## 2. Required capabilities
### Language model
Natural Kerala Malayalam explanations; Malayalam-English code-switching; accurate English correction; natural rather than literal translation; valid alternative acceptance; correctness/naturalness distinction; level adaptation; structured output; respectful humour; conversational context retention; natural follow-up questions.

### Speech recognition
Malayalam, mixed Malayalam-English, Malayalam-accented English, hesitant beginner speech, varied speed and realistic noise; streaming/partial transcripts; end-of-turn detection; interruption handling.

### Speech synthesis
Male voice direction; youthful-adult sounding; warm, energetic, friendly, curious and patient; natural Kerala Malayalam pronunciation and rhythm; clear English; expressive prosody; speed control; streaming audio; low latency; suitable commercial terms/licensing. Reject robotic, formal/bookish, caricatured or generic assistant-like delivery.

### Speech-to-animation
Timestamped phoneme/viseme events or equivalent alignment; stable timing with streamed audio; provider-neutral event mapping; support for co-articulation and silence; low-latency interruption/cancellation.

## 3. Benchmark corpus
Build a consented or appropriately licensed set with at least 100 Malayalam utterances, 100 mixed-language utterances, 100 Malayalam-accented English utterances, beginner/intermediate attempts, common grammar errors, multiple valid translations and varied device/noise/speed conditions. Document consent, collection source, variety, device and annotation rules.

Include the same Gabroo audition script for every candidate:
1. Warm name-based greeting in casual Kerala Malayalam.
2. Short self-introduction.
3. One natural Malayalam-English code-switch.
4. A clear English phrase followed by Malayalam explanation.
5. Encouragement after a learner mistake.
6. A gentle situational joke.
7. A calm, patient response to a hesitant learner.
8. A natural follow-up question.

## 4. Metrics
STT: word error rate where suitable, Malayalam character error rate, semantic preservation, code-switch recognition, end-of-turn accuracy and subgroup failure rate.
Tutor: grammar accuracy, Malayalam explanation quality, naturalness, alternative acceptance, level fit, personality consistency, safe humour, context retention and structured-output validity.
TTS: blind human-rated naturalness, Kerala Malayalam authenticity, pronunciation, English intelligibility, warmth, energy, emotional range, prosody, speed control, long-session comfort, latency and reliability.
Animation: phoneme/viseme timing error, visible closure for M/B/P, F/V contact, vowel distinction, sync drift, interruption response and facial identity consistency.
Operations: median/p95 latency, availability, streaming support, mobile integration, cost per speaking minute/session and data-processing terms.

## 5. Suggested weighted comparison
Malayalam/code-switch recognition 20%; English learner speech recognition 10%; tutor accuracy/explanation 15%; TTS voice quality 25%; lip-sync/streaming capability 10%; latency/reliability 10%; cost 5%; integration/privacy fit 5%. Apply minimum quality, safety, privacy and licensing gates; price cannot compensate for failure. Kerala Malayalam-fluent evaluators must review samples. Voice quality is deliberately weighted highly because Gabroo's voice is a core product identity.

## 6. Voice selection and approval
- Benchmark at least three genuinely distinct male voice candidates with equivalent scripts/settings.
- Use blind review where practical and multiple Kerala Malayalam-fluent listeners.
- Score naturalness, Kerala accent authenticity, clarity, warmth, energy, humour, emotional range, code-switching, English pronunciation and long-session comfort.
- Reject candidates that sound robotic, overly formal, bookish, exaggerated, synthetic or tiring.
- Verify commercial usage rights, voice cloning rights if applicable, retention and model-training terms.
- Select one canonical Gabroo voice ID/provider/model/version/settings only after the owner approves the benchmark report.
- Keep provider adapters so the app can change vendors without changing Gabroo's personality or application contracts.
- Do not silently change the approved voice identity after selection.

## 7. Tutor scenario tests
Stage 1 Malayalam-first; Stage 2 mixed; Stage 3 English-first with support; Stage 4/5 advanced; Malayalam help on demand; correction modes; frustrated learner; insult/stereotype bait; multiple valid answers; context retention; interruption; learner hesitation; unexpected answer; session recovery; learner asks Gabroo to slow down.

## 8. Process
Freeze examples and reference annotations; run candidates with equivalent settings; blind-review where practical; record metrics/cost/failures; repeat regression tests; select with documented trade-offs; retain provider adapters. Keep raw samples only as permitted by consent and provider terms.

## 9. Privacy
Obtain recording consent; use synthetic/consented data; minimise raw audio retention; do not permit provider training without separate explicit authorisation; review processing/retention terms; do not infer sensitive traits from voice; never treat accent similarity as intelligence or learner worth.

## 10. Current status
Voice direction is approved; exact provider and voice identity remain open pending audition, benchmark and owner approval. Production-grade live conversation, streaming speech and lip-sync are specified in `docs/ai/GABROO_LIVE_CONVERSATION_SPEC.md`; this plan does not claim those components are implemented.
