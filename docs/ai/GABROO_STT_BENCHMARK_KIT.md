# Gabroo Speech Recognition Benchmark Kit

Version 1.0 — evaluation design only; no provider is configured by this document.

## Purpose
Provide one repeatable, privacy-conscious test set and scoring procedure for comparing speech-to-text adapters before any provider is enabled for learners.

## Dataset record format
Store one JSON object per utterance in a local, access-controlled JSONL file. Do not commit raw learner audio or personal data to Git.

```json
{
  "sample_id": "ml_0001",
  "split": "held_out",
  "mode": "ml-IN",
  "audio_file": "restricted-audio/ml_0001.wav",
  "mime_type": "audio/wav",
  "duration_ms": 4200,
  "speaker_id": "speaker_anon_001",
  "speech_profile": "adult_beginner",
  "environment": "quiet",
  "reference_text": "എനിക്ക് ഇംഗ്ലീഷ് പഠിക്കണം",
  "reference_language_spans": [
    {"start_char": 0, "end_char": 26, "language": "ml"}
  ],
  "notes": "Consent recorded; no direct identifiers"
}
```

The example matches the executable manifest schema and is not a real learner sample. Keep audio outside the repository. If speaker pseudonyms, consent records or language-span annotations are needed for research, maintain them in a separate restricted metadata file; they are not accepted manifest fields. Speaker IDs must be random pseudonyms, not account IDs, phone numbers or names. Keep the identity/consent key separately with restricted access.

## Required corpus coverage
- At least 100 Malayalam utterances, 100 Malayalam-English code-switched utterances and 100 Malayalam-accented English utterances before making a selection.
- Include beginner and intermediate speakers, varied speaking rates, hesitation, pauses, self-correction, numbers, names, borrowed English words and realistic mobile-microphone conditions.
- Capture quiet and moderate-noise conditions. Record device/microphone class without collecting unnecessary device identifiers.
- Obtain informed consent and document permitted evaluation use, retention period, deletion contact and access controls.
- Do not collect minors' voice data in the initial benchmark.
- Use speaker-disjoint train/tuning and held-out evaluation splits. Do not tune prompts/settings against the held-out split.

## Candidate result format
The executable JSONL parser in `packages/contracts/src/gabroo-speech-benchmark-input.ts` accepts one record per candidate/sample using this exact shape:

```json
{
  "candidateId": "candidate_a",
  "sampleId": "ml_0001",
  "mode": "ml-IN",
  "environment": "quiet",
  "status": "success",
  "referenceText": "എനിക്ക് ഇംഗ്ലീഷ് പഠിക്കണം",
  "transcript": "എനിക്ക് ഇംഗ്ലീഷ് പഠിക്കണം",
  "latencyMs": 1840,
  "audioSeconds": 4.2,
  "estimatedCost": 0.0
}
```

For failed requests, set `status` to `failure` and omit `transcript` and `latencyMs`. `estimatedCost` may be omitted when unavailable. Keep provider version, region, request IDs and configuration in a separate non-secret experiment manifest; never include API keys, auth headers or personal identifiers in result files. The parser rejects unknown fields and reports malformed lines without discarding valid neighbouring records.

## Scoring
Calculate results separately for each learner-selected mode and each environment:
1. Malayalam: character error rate (CER), plus human-rated meaning preservation.
2. English: word error rate (WER), plus intelligibility of learner intent.
3. Mixed speech: WER and CER overall, plus language-span error and code-switch preservation.
4. Operations: success rate, median and p95 latency, timeout rate and measured cost per audio minute.
5. Human review: two Malayalam-fluent reviewers independently rate transcript meaning preservation and code-switch handling; adjudicate material disagreements.

Normalise Unicode consistently before calculating CER. Do not transliterate Malayalam into Latin script to make scoring easier. Document tokenisation rules for Malayalam and English separately. Report empty outputs and failed requests as failures; do not silently omit them from accuracy denominators.

## Decision gates
- No candidate passes on language-table support alone.
- A candidate must pass legal/commercial-use, security, data-processing, retention/deletion and region review before real learner audio is submitted.
- A candidate must meet a pre-agreed minimum quality threshold in every required speech mode; strong English results cannot hide poor Malayalam results.
- Blind-review held-out examples before selecting a default.
- Keep a provider-neutral adapter and allow provider/model replacement without changing mobile API contracts.
- Record limitations explicitly. If no candidate meets the mixed-language bar, keep mixed recognition unavailable or use a separately benchmarked strategy; never mislabel single-language recognition as code-switch capable.

## Release checklist
- [ ] Consent and collection protocol approved
- [ ] 300+ consented/appropriately licensed samples collected
- [ ] Speaker-disjoint split verified
- [ ] Reference transcripts and language spans double-reviewed
- [ ] Candidate versions, regions and settings frozen
- [ ] Held-out tests run with equivalent audio and settings
- [ ] CER/WER, code-switch, human review, latency and cost results published
- [ ] Privacy, security, retention and commercial terms approved
- [ ] Provider owner approval and production rollout plan recorded

## Current status
The application has a provider-neutral recognition contract, learner-facing language selector, offline WER/CER scoring, JSONL validation and report aggregation. The parser and report builder operate on text records only: they do not read audio, upload files or contact a provider. The configured API remains unavailable until a provider is deliberately selected and wired through the server configuration.


## Local execution boundary

The local execution contracts are implemented in:
- `packages/contracts/src/gabroo-speech-benchmark-manifest.ts`: strict JSONL manifest validation, unique sample IDs, relative audio paths, MIME/duration checks and 10 MB audio-buffer limit.
- `packages/contracts/src/gabroo-speech-benchmark-executor.ts`: sequential execution of explicitly enabled adapters, caller-supplied local audio loading, held-out-only default, per-request timeout/cancellation and JSONL result output.

The executor has no filesystem or network access. The caller supplies `loadAudio`; audio paths are validated as relative paths without traversal, but the application that resolves those paths must still enforce an approved benchmark root and must not follow symlinks outside it. Adapter implementations are injected by the caller. A mock adapter is used in automated tests; no production provider is configured.

The executor copies audio bytes for each adapter so one adapter cannot mutate the buffer observed by another. Adapter errors are reduced to failure records and are not copied into benchmark output. Do not place secrets, request headers or raw audio in logs. Cost estimates must be finite and non-negative. Tuning samples are excluded unless the caller explicitly opts in.

## Execution status

Manifest validation and the provider-neutral executor are code-level capabilities. They have not yet run against a real audio corpus or a real speech provider. The executor must only be invoked with approved, consented, licensed local samples and an explicitly enabled candidate configuration after the decision gates above are satisfied.


### Local manifest validation command

The API workspace provides a validation-only CLI:

```bash
pnpm --filter @gabenglish/api benchmark:validate -- ./benchmark/manifest.jsonl ./benchmark/audio
```

The manifest's `audioFile` values are resolved relative to the supplied audio root. The validator resolves real paths, rejects symlinks that escape that root, requires regular non-empty files and enforces the 10 MB per-file limit. It prints a JSON summary and exits non-zero if any manifest or file validation issue is found.

This command does not open audio contents, run recognition, contact providers or create benchmark results. The actual execution engine remains an injected library API; the CLI intentionally does not invent or silently enable a provider.


### Local aggregate report command

After a benchmark adapter has produced the documented JSONL result format, generate the aggregate report locally:

```bash
pnpm --filter @gabenglish/api benchmark:report -- ./benchmark/results.jsonl ./benchmark/report.md
```

The report includes aggregate success rate, WER, CER, latency, audio duration and cost where available. It does not include raw transcripts. Malformed lines are reported by line number and cause a non-zero exit status. This command does not invoke recognition or contact a provider.


### End-to-end local orchestration API

`apps/api/src/scripts/gabroo-speech-benchmark-local-run.ts` now joins the approved-root file loader, manifest parser, explicitly supplied adapters, execution engine and aggregate report builder.

A local harness can call `runGabrooSpeechBenchmarkFromFiles` with:
- `manifestPath` and `audioRoot` for the local, consented corpus
- `candidates` containing adapters explicitly marked `enabled: true`
- Optional timeout, cancellation signal and explicit tuning-sample opt-in

Before any adapter is called, the harness preflights every manifest audio path, resolves real paths, rejects symlinks outside the approved root, requires regular non-empty files and enforces the 10 MB limit. It opens the resolved final file with `O_NOFOLLOW` and validates the opened file handle before reading, reducing final-component symlink swap risk. This does not make a concurrently writable corpus root safe against hostile replacement of parent directories; keep the approved root and its parent directories writable only by trusted operators during a run. It then returns aggregate Markdown and JSONL. JSONL contains transcripts and must be stored only in an approved local location with appropriate access controls.

This is a local orchestration API, not a provider CLI or production endpoint. No adapter is supplied by default. The automated tests use a mock adapter. A real adapter must not be configured until legal, commercial, privacy and security review is complete and the user approves the selected candidate.


## Experiment metadata and fair comparison

`packages/contracts/src/gabroo-speech-benchmark-experiment.ts` defines a strict experiment record. It captures:
- experiment ID and offset-aware start timestamp
- corpus version, SHA-256 corpus identity, sample count and tuning/held-out split
- non-identifying operator label
- each candidate's provider name, model version, region and allow-listed non-secret settings

The metadata parser rejects unknown fields, duplicate candidate IDs/settings, credential-like setting names and common credential patterns in string values. Do not use this as a substitute for secret scanning or privacy review. Keep provider request IDs, learner identities, consent keys and raw audio outside the experiment metadata.

`assertComparableSpeechBenchmarkResults` checks that candidates being compared within the same language mode and noise environment were evaluated on exactly the same sample IDs. A mismatch blocks comparison instead of producing misleading rankings. It does not assert that a corpus is consented or that candidate settings are semantically equivalent; those remain human-reviewed decision gates.

Example metadata is deliberately not committed with real provider details or learner data. Generate a corpus SHA-256 from the approved local manifest/corpus package and record the exact model/version and region returned by the provider at execution time.


## Candidate comparison report

`packages/contracts/src/gabroo-speech-benchmark-comparison.ts` renders a candidate-by-candidate Markdown report from validated experiment metadata and benchmark results. It includes provider/model and region labels, sample count, success rate, WER, CER, median/P95 latency and cost per audio minute where complete cost data is available.

The comparison renderer requires the result candidate IDs to exactly match the experiment candidate list. Within each language mode and environment, it requires every candidate to have the same sample IDs. A mismatch blocks the report rather than silently comparing unlike corpora.

The report deliberately does not rank candidates or declare a winner. It calls out that blind Malayalam-fluent human review, meaning preservation, code-switch adjudication, and legal/security/privacy/commercial approval remain separate release gates. Use held-out results for final evaluation; do not tune against them.


### Local candidate comparison command

After a completed local benchmark, generate the candidate comparison using the result JSONL and the experiment metadata JSON:

```bash
pnpm --filter @gabenglish/api benchmark:compare -- ./benchmark/results.jsonl ./benchmark/experiment.json ./benchmark/comparison.md
```

The command rejects malformed result lines, invalid experiment metadata, candidate mismatches and non-comparable sample sets. It writes a metrics comparison without raw transcripts and does not call any provider. Keep both input files and the generated report in approved local storage; benchmark result JSONL contains transcripts.


## Human transcript review scoring

`packages/contracts/src/gabroo-speech-benchmark-human-review.ts` defines structured blind-review ratings separate from automated WER/CER. Each review records a non-identifying reviewer label, candidate/sample, language mode, environment, meaning preservation, content completeness, language fidelity, readability and learner comprehension on a 1–5 scale. Mixed Malayalam-English samples additionally require a code-switch handling rating. Critical error tags are recorded separately from numeric scores. Code-switch ratings are rejected for single-language samples.

The aggregator reports mean ratings and flags a sample for adjudication when fewer than two independent reviews exist or reviewers differ by at least two points on any core rating, or either reviewer records a critical meaning/content error. It does not select a provider, infer a winner or replace human adjudication. Reviewer labels must be pseudonymous and must not contain names, email addresses or account identifiers. Keep blind-review candidate identities hidden from reviewers until scoring is complete.

Suggested rubric (score every applicable dimension independently; do not collapse them into one overall score):

| Dimension | What reviewers judge | 1 — Poor | 2 — Weak | 3 — Adequate | 4 — Strong | 5 — Excellent |
|---|---|---|---|---|---|---|
| Meaning preservation | Whether the transcript communicates the same intent as the audio | Meaning reversed, materially changed or unusable | Main intent partly wrong | General intent retained, meaningful nuance lost | Meaning correct with only minor nuance loss | Intent and nuance faithfully preserved |
| Content completeness | Retention of key words, facts, numbers, names, negation and function words | Multiple critical details missing or invented | One critical detail or several smaller details wrong | Main content present; a notable omission/error remains | All key details retained; only trivial omission | All meaningful content retained without additions |
| Language fidelity | Correct language identity and script for each spoken span | Languages/scripts frequently misidentified | Repeated language or script errors | Mostly correct with noticeable errors | Correct apart from isolated minor error | Correct language and expected script throughout |
| Malayalam-English code-switch handling (mixed only) | Preservation of switches, borrowed terms and boundaries between Malayalam and English | Switches erased or meaning broken | Frequent switches lost/misassigned | Main switches retained but several errors | Nearly all switches and boundaries correct | Natural, accurate preservation of every meaningful switch |
| Transcript readability | Segmentation, spacing, punctuation and ease of scanning without changing meaning | Very difficult to parse | Frequent disruptive formatting | Readable with effort; inconsistent segmentation | Clear with minor formatting issues | Clear, consistently segmented and easy to scan |
| Learner comprehension | Whether a Malayalam-speaking learner can understand the intended message from the transcript | Learner cannot recover the intended message | Requires substantial guessing or help | Main message recoverable, but confusion remains | Clear with minor ambiguity | Immediately clear and unambiguous |

Use integer scores only. A 2 or 4 means the result falls between the adjacent anchors. Do not award a high readability or comprehension score to a fluent-looking transcript that changes meaning or omits a critical detail. A score of 5 is not a claim of perfect transcription; it means no meaningful issue was observed for that dimension.

**Critical error flags (record independently of ratings):** meaning changed, key content/function word omitted, hallucinated content, number/name error, Malayalam script error, English-span error, unnecessary transliteration, code-switch lost, language-boundary error, punctuation/segmentation error, unintelligible span, other. Add a concise note for every critical error. A single critical error can require adjudication even when the average rating is high.

**Review protocol:**
- Reviewers listen to the source audio and inspect the transcript; do not judge from transcript text alone.
- Score each dimension independently, then add issue tags. Do not infer pronunciation quality or learner ability from STT output.
- Code-switch handling is mandatory only for mixed-language samples.
- If the audio itself is unclear, mark the relevant issue and note it; do not automatically blame the recognizer for unintelligible source audio.
- Use two independent Malayalam-fluent reviewers per sample. Adjudicate if fewer than two reviews exist, any core dimension differs by 2 or more points, or either reviewer flags a critical meaning/content error.
- Keep reviewer labels pseudonymous and blind candidate identity until both initial reviews are submitted.

Ratings are structured evidence, not an objective measure of accent quality. Do not penalize a learner for a regional accent when their intended meaning is intelligible.


The local comparison command accepts an optional fourth input, a JSON array of structured human-review records:

```bash
pnpm --filter @gabenglish/api benchmark:compare -- ./benchmark/results.jsonl ./benchmark/experiment.json ./benchmark/comparison.md ./benchmark/human-reviews.json
```

When supplied, each record is validated against the human-review schema and the report adds a separate human-review summary table. Automated WER/CER and human ratings remain distinct. The summary flags samples requiring adjudication; it never ranks providers. The optional file contains reviewer annotations and must be stored in access-controlled local storage. Use pseudonymous reviewer labels and do not include learner or reviewer identifiers.
