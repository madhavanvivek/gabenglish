# Gabroo benchmark runner

The API benchmark runner sends twelve versioned seed cases through the same OpenAI-compatible provider adapter used by the live API and stores raw text responses, per-case latency, a ten-dimension human scoring rubric and evaluator placeholders as JSONL. It imports the same `buildGabrooTeachingPolicy` function used by live conversations. It does not automatically grade language quality.

## Run

Set environment variables GABROO_EVAL_API_KEY (or OPENAI_API_KEY), GABROO_EVAL_MODEL and optionally GABROO_EVAL_BASE_URL, then run:

    pnpm --filter @gabenglish/api benchmark:gabroo

For OpenAI, the default endpoint is https://api.openai.com/v1. The API key is read only from the environment and is never written to results. Do not commit provider keys.

Optional variables: GABROO_BENCHMARK_CASES (fixture path), GABROO_BENCHMARK_OUTPUT (JSONL output path; default artifacts/gabroo-benchmark-results.jsonl), GABROO_BENCHMARK_REPEATS (1–10; default 3).

Each response records case ID, repetition, model ID, endpoint, provider-adapter version, SHA-256 fingerprint of the fixture file and live policy configuration, latency, output, expected checks, critical checks and ten blank 0–4 evaluator dimensions. The provider adapter normalizes provider-reported model IDs and prompt/completion/total token counts when available; unsupported or malformed usage fields are omitted. The run summary reports error rate and successful-response p50/p95 latency. Requests have a 90-second timeout. Provider errors are recorded without stopping remaining cases. Output is append-only; choose a new path for a clean run.

## Evaluation workflow

1. Run the exact same cases against each candidate provider/model.
2. Have fluent Kerala Malayalam reviewers score Malayalam naturalness and code-switching; have an English educator review grammar and correction quality.
3. Score each dimension 0–4 and record critical failures and notes alongside the JSONL results.
4. Compare quality, p50/p95 latency, error rate and cost per completed case. Calculate cost from provider usage/billing data; this runner does not guess token prices.
5. Retain model ID, endpoint, date, case-file version and teaching-policy version for reproducibility.

The production adapter bounds each provider request to the newest 16 conversation messages and 24,000 characters, retaining the latest learner turn. This protects inference latency and cost while keeping recent conversational context. Older history is currently omitted rather than summarized. The runner uses the production provider adapter and live policy builder, but it does not yet support streaming/audio. The adapter is OpenAI-compatible; select a provider endpoint and model that support the chat-completions contract.

## Production API configuration

The API server now wires the same adapter into live conversations when both `GABROO_API_KEY` and `GABROO_API_MODEL` are set. `GABROO_API_BASE_URL` defaults to `https://api.openai.com/v1` and can point to a compatible gateway. Set these as Render environment secrets/configuration; never commit the key. Configure key and model together or startup configuration validation fails. Without both values the API intentionally leaves the provider unavailable and conversation routes return the existing 503 response. Outputs are untrusted model text and require human review. Never use learner personal data in these fixtures.