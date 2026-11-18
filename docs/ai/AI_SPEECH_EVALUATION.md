# AI and Speech Evaluation Plan

Version 1.2 — provider-neutral benchmark.

## 1. Objective
Select AI and speech services using measured performance for Malayalam-speaking English learners, not marketing claims alone.

## 2. Required capabilities
### Language model
Natural Kerala Malayalam explanations; Malayalam-English code-switching; accurate English correction; natural rather than literal translation; valid alternative acceptance; correctness/naturalness distinction; level adaptation; structured output; respectful humour.

### Speech recognition
Malayalam, mixed Malayalam-English, Malayalam-accented English, hesitant beginner speech, varied speed and realistic noise.

### Speech synthesis
Male voice direction; friendly, energetic expressive delivery; clear Malayalam and English; speed control; conversational latency; suitable commercial terms/licensing.

## 3. Learner-facing recognition workflow
The learner explicitly chooses the recognition mode before recording:
- Malayalam + English (mixed/code-switching; app/API mode `ml-en`).
- Malayalam only (`ml-IN`).
- English only (`en-IN`).

Important: `ml-en` is Gabenglish's internal mixed-language mode, not a claim that a provider exposes a locale with that exact code. Each provider adapter must map this mode to the provider's documented multilingual or language-identification capability. If a provider only accepts one locale, the adapter must not silently pretend it supports robust code-switching; benchmark results must decide whether mixed speech requires a different model or a two-pass strategy.

The selected mode is sent with the audio request; it is not merely a display preference. The recognition result may report detected language as Malayalam, English, mixed, or unknown. Detection is informative and must not silently overwrite the learner's selected mode.

The workflow requires separate microphone permission and transcription consent. The learner initiates recording and transcription, then sees an editable transcript and detected-language label. The transcript is not sent to Gabroo until the learner explicitly confirms it. If the learner edits the text, the confirmed request must preserve the edited text and the server must determine whether it differs from the original transcript. Audio should be deleted from the app's temporary local location after the transcription attempt and cleanup must also run on cancellation, navigation away, and failures.

Provider availability is distinct from local recording capability. If no server-side recognition provider is configured, the UI must clearly report that transcription is unavailable; it must not imply that local/device speech recognition is the production recognition service.

## 4. Initial provider research shortlist (not a selection)
Official language-support documentation currently identifies Malayalam (`ml-IN`) support for these services:
- **Google Cloud Speech-to-Text**: the official V1/V2 language tables list Malayalam (`ml-IN`), including V2 model/region entries. Candidate for the first controlled batch-recognition benchmark. Confirm the exact model, region, audio constraints and current pricing before implementation.
- **Microsoft Azure AI Speech**: the official language-support table lists Malayalam (`ml-IN`). Candidate for a second controlled benchmark. Confirm which speech-to-text feature tier and audio modes are actually supported for Malayalam; language presence alone does not establish streaming or mixed-language support.
- **Amazon Transcribe**: the official supported-language table lists Malayalam (`ml-IN`) and shows capability differences by feature/operation. Candidate only after confirming the exact streaming/batch path and region supported for the intended product flow.

These public language tables establish language availability only. They do not establish Kerala-dialect accuracy, Malayalam-English code-switch quality, Malayalam-accented English performance, latency in India, privacy suitability, or price competitiveness. No provider is approved or configured by this shortlist. Run the same consented corpus through at least three eligible candidates and blind-review results before choosing. Keep the adapter provider-neutral so the selected service can be replaced without changing the mobile contract.

Reference documentation:
- Google Cloud Speech-to-Text supported languages: https://cloud.google.com/speech-to-text/docs/speech-to-text-supported-languages
- Microsoft Azure Speech language support: https://learn.microsoft.com/azure/ai-services/speech-service/language-support
- Amazon Transcribe supported languages: https://docs.aws.amazon.com/transcribe/latest/dg/supported-languages.html

## 5. Repeatable benchmark kit\nUse [Gabroo STT Benchmark Kit](./GABROO_STT_BENCHMARK_KIT.md) for the dataset record format, consent and speaker-disjoint split rules, provider result schema, metrics, decision gates and release checklist. Keep raw audio outside Git and never place API credentials or identifying learner data in benchmark artifacts.\n\n## 6. Benchmark corpus
Build a consented or appropriately licensed set with at least 100 Malayalam utterances, 100 mixed-language utterances, 100 Malayalam-accented English utterances, beginner/intermediate attempts, common grammar errors, multiple valid translations and varied device/noise/speed conditions. Document consent, collection source, variety, device and annotation rules.

Split the corpus by speaker, not randomly by utterance, so a speaker's voice does not appear in both tuning and evaluation sets. Keep a held-out test set untouched until candidate settings are frozen. Include short phrases, longer turns, hesitation, self-correction, proper nouns, numbers, borrowed English terms and realistic conversational interruptions. Annotate reference transcripts with language spans for code-switched utterances.

## 7. Metrics
STT: word error rate where suitable, Malayalam character error rate, semantic preservation, code-switch recognition, subgroup failure rate.
Tutor: grammar accuracy, Malayalam explanation quality, naturalness, alternative acceptance, level fit, personality consistency, safe humour and structured-output validity.
TTS: human-rated naturalness, clarity, Malayalam pronunciation, English intelligibility, prosody, speed control, latency and reliability.
Operations: median/p95 latency, availability, cost per speaking minute/session, streaming support, mobile integration and data-processing terms.

For mixed-language samples, report both whole-utterance error and language-span error. A low aggregate error score must not hide a provider that drops English words embedded in Malayalam or transliterates Malayalam inconsistently. Report results separately for all three learner-selected modes and for noisy/quiet conditions.

## 8. Suggested weighted comparison
Malayalam/code-switch recognition 25%; English learner speech recognition 15%; tutor accuracy/explanation 20%; TTS quality 15%; latency/reliability 10%; cost 10%; integration/privacy fit 5%. Apply minimum quality, safety, privacy and licensing gates; price cannot compensate for failure. Review weights after pilot scoring. Kerala Malayalam-fluent evaluators must review samples.

## 9. Provider decision gates
Before connecting a provider to the learner-facing API, record:
1. Exact model/service name, version and region.
2. Commercial-use rights and any voice/audio licensing restrictions.
3. Data-processing agreement, subprocessors, processing region, retention/deletion controls and whether customer audio can be used for provider training.
4. Supported MIME types, maximum payload, duration limits, language hints, code-switch behaviour and confidence semantics.
5. Streaming/batch support, cancellation behaviour, timeout limits, rate limits and documented service availability.
6. Measured cost per minute at expected usage, including retries and any minimum charges.
7. Benchmark results on the same held-out corpus, with examples of material failures.

Reject a candidate if it fails privacy, security, commercial-rights or minimum intelligibility gates, regardless of weighted score. Do not enable provider-side model training on learner audio. Do not send raw learner audio to a candidate until the applicable consent and provider terms have been reviewed.

## 10. Voice selection
Benchmark several male candidates using actual samples. Assess warmth, energy, clarity, Malayalam quality, English pronunciation and long-session comfort. The male/funny/energetic/friendly direction is locked; exact provider and voice identity are not.

## 11. Tutor scenario tests
Stage 1 Malayalam-first; Stage 2 mixed; Stage 3 English-first with support; Stage 4/5 advanced; Malayalam help on demand; correction modes; frustrated learner; insult/stereotype bait; multiple valid answers; context retention and session recovery.

## 12. Process
Freeze examples and reference annotations; run candidates with equivalent settings; blind-review where practical; record metrics/cost/failures; repeat regression tests; select with documented trade-offs; retain provider adapters.

## 13. Privacy
Obtain recording consent; use synthetic/consented data; minimise raw audio retention; do not permit provider training without separate explicit authorisation; review processing/retention terms; do not infer sensitive traits from voice; never treat accent similarity as intelligence or learner worth. Do not create speaker embeddings or voiceprints for learner identification.
