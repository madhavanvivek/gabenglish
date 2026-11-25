# Gabroo benchmark runner

The API benchmark runner sends ten versioned seed cases to an OpenAI-compatible chat-completions endpoint and stores raw text responses, per-case latency, provider usage and evaluator placeholders as JSONL. Crucially, it imports the same `buildGabrooTeachingPolicy` function used by the live conversation API, so candidate models receive the current production teaching policy. It does not automatically grade language quality.

## Run

Set environment variables GABROO_EVAL_API_KEY (or OPENAI_API_KEY), GABROO_EVAL_MODEL and optionally GABROO_EVAL_BASE_URL, then run:

    pnpm --filter @gabenglish/api benchmark:gabroo

For OpenAI, the default endpoint is https://api.openai.com/v1. The API key is read only from the environment and is never written to results. Do not commit provider keys.

Optional variables: GABROO_BENCHMARK_CASES (fixture path), GABROO_BENCHMARK_OUTPUT (JSONL output path; default artifacts/gabroo-benchmark-results.jsonl), GABROO_BENCHMARK_REPEATS (1–10; default 3).

Each response records case ID, repetition, model ID, endpoint, live policy version marker, latency, output, provider-reported token usage when available, expected checks and critical checks. Requests have a 90-second timeout. Provider errors are recorded without stopping remaining cases. Output is append-only; choose a new path for a clean run.

## Evaluation workflow

1. Run the exact same cases against each candidate provider/model.
2. Have fluent Kerala Malayalam reviewers score Malayalam naturalness and code-switching; have an English educator review grammar and correction quality.
3. Score each dimension 0–4 and record critical failures and notes alongside the JSONL results.
4. Compare quality, p50/p95 latency, error rate and cost per completed case. Calculate cost from provider usage/billing data; this runner does not guess token prices.
5. Retain model ID, endpoint, date, case-file version and teaching-policy version for reproducibility.

The runner imports the live policy builder, but still calls the provider endpoint directly rather than the production provider adapter. It does not yet support streaming/audio or prove production adapter equivalence. Outputs are untrusted model text and require human review. Never use learner personal data in these fixtures.