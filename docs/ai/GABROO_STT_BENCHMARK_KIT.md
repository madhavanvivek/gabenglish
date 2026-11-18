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
