# Gabroo learner playback-rate benchmark

## Purpose and guardrails

This benchmark evaluates whether learner-selected playback speed remains understandable and natural across the supported range. The shared contract currently allows 0.75× to 1.50× in 0.05× increments; the representative test points are 0.75×, 0.85×, 1.00×, 1.15×, 1.30× and 1.50×.

Record the requested and actually applied rate, playback method, device, network profile, blind voice code, 1–5 intelligibility and naturalness ratings, audible artifact tags, completion and optional reviewer notes. The contract rejects mismatched requested/applied rates and duplicate trial IDs.

Client-side rate adjustment and provider re-synthesis must remain separate. A slower re-synthesized recording is not proof that the learner can change the playback rate of an already-generated response. The report is descriptive and does not rank candidates, define a pass threshold, or approve the canonical Gabroo voice.

## Input and report

Provide a JSON array of trial records conforming to `gabrooPlaybackRateTrialSchema`. Generate a Markdown report with:

```sh
pnpm --filter @gabenglish/api benchmark:playback-rate -- ./playback-rate-trials.json ./playback-rate-report.md
```

The report groups results by blind candidate and applied rate, showing trial/completion counts, mean intelligibility and naturalness, artifact-tag count, and separate client-adjustment/re-synthesis counts. Review individual notes and audition audio alongside aggregate figures; do not infer quality from averages alone.

## Interpretation and privacy

- Use comparable devices, network conditions and synthesis settings, and document unavoidable differences.
- Preserve anonymised blind codes during review.
- Keep audio samples and provider identities in restricted storage; do not commit raw audio, personal learner recordings, credentials or provider request payloads.
- Ratings are human judgments, not WER/CER or objective pronunciation scores.
- A benchmark report is evidence for review only. Canonical voice approval still requires the separate audition protocol and explicit product-owner decision.
