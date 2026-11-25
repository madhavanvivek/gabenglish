# AI and Speech Evaluation Plan

Version 1.0 — provider-neutral benchmark.

## 1. Objective
Select AI and speech services using measured performance for Malayalam-speaking English learners, not marketing claims alone.

## 2. Required capabilities
### Language model
Natural Kerala Malayalam explanations; Malayalam-English code-switching; accurate English correction; natural rather than literal translation; valid alternative acceptance; correctness/naturalness distinction; level adaptation; structured output; respectful humour.

### Speech recognition
Malayalam, mixed Malayalam-English, Malayalam-accented English, hesitant beginner speech, varied speed and realistic noise.

### Speech synthesis
Male voice direction; friendly, energetic expressive delivery; clear Malayalam and English; speed control; conversational latency; suitable commercial terms/licensing.

## 3. Benchmark corpus
Build a consented or appropriately licensed set with at least 100 Malayalam utterances, 100 mixed-language utterances, 100 Malayalam-accented English utterances, beginner/intermediate attempts, common grammar errors, multiple valid translations and varied device/noise/speed conditions. Document consent, collection source, variety, device and annotation rules.

## 4. Metrics
STT: word error rate where suitable, Malayalam character error rate, semantic preservation, code-switch recognition, subgroup failure rate.
Tutor: grammar accuracy, Malayalam explanation quality, naturalness, alternative acceptance, level fit, personality consistency, safe humour and structured-output validity.
TTS: human-rated naturalness, clarity, Malayalam pronunciation, English intelligibility, prosody, speed control, latency and reliability.
Operations: median/p95 latency, availability, cost per speaking minute/session, streaming support, mobile integration and data-processing terms.

## 5. Suggested weighted comparison
Malayalam/code-switch recognition 25%; English learner speech recognition 15%; tutor accuracy/explanation 20%; TTS quality 15%; latency/reliability 10%; cost 10%; integration/privacy fit 5%. Apply minimum quality, safety, privacy and licensing gates; price cannot compensate for failure. Review weights after pilot scoring. Kerala Malayalam-fluent evaluators must review samples.

## 6. Voice selection
Benchmark several male candidates using actual samples. Assess warmth, energy, clarity, Malayalam quality, English pronunciation and long-session comfort. The male/funny/energetic/friendly direction is locked; exact provider and voice identity are not.

## 7. Tutor scenario tests
Stage 1 Malayalam-first; Stage 2 mixed; Stage 3 English-first with support; Stage 4/5 advanced; Malayalam help on demand; correction modes; frustrated learner; insult/stereotype bait; multiple valid answers; context retention and session recovery.

## 8. Process
Freeze examples and reference annotations; run candidates with equivalent settings; blind-review where practical; record metrics/cost/failures; repeat regression tests; select with documented trade-offs; retain provider adapters.

## 9. Privacy
Obtain recording consent; use synthetic/consented data; minimise raw audio retention; do not permit provider training without separate explicit authorisation; review processing/retention terms; do not infer sensitive traits from voice; never treat accent similarity as intelligence or learner worth.

## 10. Learner-facing transcript review

The mobile transcript review displays the provider's detected language and, when supplied, its recognition-confidence value. This value is only an estimate of transcription certainty. It is not a pronunciation score, accent score, fluency rating or measure of English ability. If the provider omits confidence, the UI says so and asks the learner to check the text carefully.

Learners must be able to edit the recognised words before an explicit confirmation sends text to Gabroo. Raw audio remains transient and is discarded after transcription or cancellation. Do not present phoneme-level, word-level pronunciation feedback until a separately benchmarked alignment/evaluation capability exists and has been validated for Malayalam-accented English.
