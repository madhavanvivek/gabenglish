# Gabroo speech and alignment provider research

Research snapshot: 2026-11-25

Status: **research only; no provider selected, integrated, or approved**.

## Product requirement

Gabroo needs natural Kerala Malayalam, fluent Malayalam-English code-switching, a consistent approved voice identity, low-latency streaming, and trustworthy timing tied to the exact audio bytes. The current API synthesis adapter is OpenAI-compatible and returns MP3 only. The avatar contract consumes IPA phoneme intervals; character/word timing is not interchangeable with phoneme timing.

## Findings

### Soniox Malayalam TTS — promising voice/streaming candidate, not a phoneme-alignment solution

Public product documentation advertises Malayalam TTS, one voice across Malayalam and 60+ languages, real-time WebSocket and REST synthesis, language mixing, voice cloning, and character-level timestamps. The page advertises $0.70 per generated audio hour. These are vendor claims and must be verified with live trials and current pricing before procurement.

- Strength: directly targets Malayalam and mixed-language generation; character timestamps could support synchronized subtitles/highlighting.
- Gap: character-level timing does not provide IPA phoneme labels or validated viseme timing. It cannot be fed into the existing phoneme-to-viseme bridge as-is.
- Open checks: exact API schema and output audio format; male Kerala voice quality; voice consistency; code-switching quality; character timestamp semantics; commercial rights; retention/training terms; region; measured latency and cost.
- Decision: include in blind voice audition shortlist only after confirming a suitable male voice and legal/privacy terms. Do not enable as Gabroo's canonical voice from marketing claims alone.

Reference: https://soniox.com/text-to-speech/malayalam

### Bournemouth Forced Aligner (BFA) — phoneme-level output, but Malayalam support is caveated

BFA documents word- and phoneme-level IPA timestamps. Its default standard phoneme set lists 82 languages but does not list Malayalam. Its alternate `ph66` path lists Malayalam (`ml`) through espeak-ng, but the non-English model is trained on German, Spanish, French, Italian, Dutch, Polish and Portuguese; the docs explicitly say other languages are aligned to nearest sounds with a warning. The project is GPLv3.

- Strength: explicit phoneme intervals and confidence values; can be run locally/offline after model download.
- Gap: Malayalam is not in the default trained language list; `ph66` Malayalam is a cross-language approximation and therefore needs real Malayalam corpus evaluation. GPLv3 is a material licensing constraint for product deployment and requires legal review before any use.
- Decision: research/evaluation sandbox only. Do not ship or use in production until Malayalam benchmark results and licensing architecture are reviewed.

References:
- https://github.com/speech-industry/bournemouth-forced-aligner
- https://speech-industry.github.io/bournemouth-forced-aligner/language-support/

### sadda alignment — technically interesting, provisional

The sadda project documents transcript-conditioned word and phone alignment with IPA labels, using espeak-ng G2P and a wav2vec2/CTC acoustic model. Its alignment feature is explicitly labelled PROVISIONAL. Its examples show multilingual language selection, but the documentation does not establish a validated Malayalam acoustic model or Malayalam code-switch performance.

- Strength: clean separation of G2P, acoustic model and alignment; returns timed phones.
- Gap: provisional tier; Malayalam coverage and acoustic-model suitability are not proven by the available documentation.
- Decision: evaluation candidate only, not production dependency.

References:
- https://sadda-speech.github.io/sadda/align/
- https://sadda-speech.github.io/sadda/api/align/

## Engineering decision

1. Keep the existing provider-neutral IPA alignment contract.
2. Do not convert character timestamps or word timestamps into invented phoneme timestamps.
3. If a speech provider returns character timings, treat them as a separate subtitle/highlighting capability, with their own schema and exact-audio identity checks.
4. A phoneme aligner must return real phone labels and measured start/end times for the exact synthesized audio. Preserve confidence scores and reject unsupported/low-confidence spans rather than fabricating mouth motion.
5. Keep the live avatar bridge disabled until exact audio SHA-256, stable audio ID, measured duration, cancellation/stale-response guards, and physical-device playback-clock tests all pass.
6. Evaluate at least three voice candidates using the existing blind audition protocol. Provider marketing claims are not evidence of Kerala Malayalam naturalness or a selected Gabroo identity.

## Required benchmark before provider decision

Use the same standard audition script and test set for each candidate:
- Malayalam-only utterances with native Kerala vocabulary and natural intonation.
- English-only teaching examples.
- Sentence-level Malayalam-English code-switching, including borrowed technical terms.
- Names, numbers, dates and punctuation.
- 0.75x, 0.85x and 1.0x playback; distinguish client playback-rate control from re-synthesis.
- Streaming first-audio latency, complete-response latency, interruption/cancellation recovery and repeated-session stability.
- Native-speaker blind ratings, commercial rights, retention, model-training terms and processing region.

For alignment, create a manually reviewed gold set of Malayalam, English and mixed-language audio. Report phone boundary error, phone-label error, coverage, confidence calibration and failure rate by language segment. A model that only works on English portions is not acceptable for a Malayalam-first tutor.

## Current conclusion

No provider has been selected. Soniox is a promising candidate for Malayalam voice generation and character timing, while BFA and sadda are research candidates for phone alignment with important Malayalam validation and/or licensing gaps. These tools solve different parts of the pipeline; none currently proves that Gabroo's production lip-sync is ready.
