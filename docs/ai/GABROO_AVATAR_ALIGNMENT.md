# Gabroo audio-to-viseme alignment contract

## Purpose

Gabroo's canonical avatar runtime samples mouth and expression controls from the actual audio playback clock. The phoneme-alignment contract in `packages/contracts/src/gabroo-phoneme-alignment.ts` is the adapter boundary between a speech provider/forced aligner and that renderer-neutral runtime.

## Data flow

1. Synthesis produces an audio asset, stable `audio_id`, SHA-256 fingerprint of the exact audio bytes and measured duration.
2. A provider or phoneme aligner supplies IPA phoneme events with start/end timestamps measured against that exact audio asset.
3. `isGabrooPhonemeAlignmentForAudio` checks the audio ID, SHA-256 fingerprint and duration (within 1 ms). `gabrooPhonemeAlignmentToTimelineForAudio` fails closed on a mismatch before mapping known IPA classes to the canonical viseme vocabulary.
4. The avatar runtime samples the resulting timeline using the native player's actual `positionMillis`.
5. Paused, buffering, stopped or completed playback remains neutral; no synthetic talking loop is permitted.

## Important constraints

- Never estimate phoneme timing from character count, word length, sentence duration or a generic animation timer.
- Alignment timestamps must refer to the exact synthesized audio bytes. Every alignment carries a SHA-256 fingerprint and stable audio ID; a timeline from a different voice, text revision, playback segment or audio asset must be rejected.
- Unknown phonemes map to a neutral viseme. The mapper must not invent mouth movement for unknown symbols.
- Common long-vowel IPA tokens are mapped to the same coarse viseme class as their short-vowel counterparts (for example, `aː`, `iː`, `uː`, and `eː`). This preserves a usable jaw/lip target without pretending vowel duration or coarticulation is validated.
- Malayalam retroflex consonants such as `ʈ` and `ɳ` intentionally remain neutral until the approved rig has a validated visual pose for them; do not collapse them into dental visemes.
- The current IPA-to-viseme mapping is a coarse starting point for the shared rig, not a validated Malayalam phonetics model. Native Malayalam phoneme coverage, coarticulation, timing offsets and visual quality still require native-speaker and device review.
- Expression and gesture tracks are intentionally empty in this adapter. They must be driven by separately authored/validated conversational cues, not inferred from phonemes.
- The current TTS response path returns MP3 audio only. It does not yet provide phoneme alignment, so this contract alone does not make production lip-sync operational.
- No production 3D renderer or owner-approved character asset is present. Do not describe the current build as a completed live avatar.

## Release gates

Before enabling the bridge in the learner app:

- Select a commercially permitted speech provider/aligner and verify retention and model-training terms.
- Confirm the provider can align Malayalam and English code-switching against the exact generated audio.
- Compute SHA-256 over the exact audio bytes and enforce audio ID, hash and duration equality across synthesis, alignment, playback and cancellation.
- Validate viseme timing and coarticulation with native Malayalam speakers, including slow playback.
- Integrate the owner-approved character rig and test on physical Android devices; repeat on iOS when that platform is brought online.


## Character timing for synchronized text highlighting

Character timestamps are a separate capability from phoneme alignment. The contract in `packages/contracts/src/gabroo-character-alignment.ts` accepts provider-supplied source-text spans and audio timestamps, then produces caption/highlight cues only.

- Offsets count Unicode code points, so Malayalam combining sequences and supplementary characters are not sliced using UTF-16 code-unit positions.
- Every record binds the exact audio SHA-256, source-text SHA-256, audio ID and duration. The consumer must calculate the hashes over the exact audio bytes and UTF-8 text before accepting cues.
- Events must be ordered in source-text and audio time, remain inside the source text and audio duration, and respect bounded payload sizes.
- This adapter emits no visemes, mouth poses, or phoneme labels. Do not use character timestamps to drive lip-sync.
- Provider offset semantics must be verified against real samples. If a provider reports byte offsets, UTF-16 offsets, word timings or token timings, an explicit verified conversion adapter is required; never reinterpret them as code-point indices.

This allows future providers with character-level timing to support karaoke-style highlighting while the phoneme-driven avatar remains independently gated.


### Playback-clock caption highlighting

The character-alignment module also exports `sampleGabrooCaptionAtPlayback`. Once a provider alignment has passed the audio/text identity checks and has been converted into caption cues, the mobile player can sample the active cue using the native audio player's current position. Paused playback and stale audio IDs clear the highlight. If provider spans overlap, the cue with the latest start time wins deterministically.

This sampler is a pure contract helper; the current mobile TTS response still does not return character timings, so the learner UI must not fabricate karaoke highlighting. Wire it only after a provider supplies verified offsets and the client has the matching audio identity.


### API-side exact audio identity helper

`apps/api/src/gabroo-audio-identity.ts` now provides `createGabrooSynthesizedAudioIdentity`. It computes SHA-256 over the exact completed audio bytes and exact UTF-8 synthesis text, counts source-text Unicode code points, validates the measured duration, and assigns a stable per-asset ID (or validates a supplied one). Tests cover Malayalam, supplementary emoji, byte-exact fingerprints and invalid inputs.

This helper is intentionally not called from the current streaming TTS route. The route streams MP3 bytes before the complete asset and measured duration are known, and the provider currently supplies neither measured duration nor character/phoneme alignment. Do not buffer every live response or invent a duration merely to expose an identity. A future alignment-capable provider path must produce a complete bounded audio asset and verified duration (or a carefully designed streaming hash/finalization protocol) before returning alignment metadata. Until then, speech playback remains MP3-only and the caption/avatar bridges remain disabled in the learner UI.


## Provider audio integrity gate

Both provider response modes now verify declared MP3 content length against the bytes actually received. The streaming transform checks the count at flush; the buffered synthesis path now applies the same check before returning the assembled audio asset. A mismatch fails synthesis instead of producing an asset whose fingerprint could later be mistaken for a complete provider response. This check is transport integrity only: it does not infer audio duration or supply phoneme/character timestamps.

The API identity helper also enforces the synthesis input boundary: non-blank source text is limited to 4,000 Unicode code points, and explicit audio IDs must already be trimmed and canonical. It rejects malformed identity inputs rather than silently normalizing values that could make alignment identity ambiguous.


## Provider-neutral alignment boundary

`apps/api/src/gabroo-speech-alignment-provider.ts` defines an optional provider capability separate from speech synthesis. It accepts the exact completed audio bytes, exact source text, language mode (`ml`, `en`, or `mixed`) and computed audio identity. Providers may return either genuine IPA phoneme events or character timing events; the discriminant is explicit, and word/token timings must not be relabelled as either capability.

The API validation boundary parses each result with the shared contracts and rejects mismatched audio ID, audio hash, duration, or (for character timing) source-text hash and Unicode code-point length. This is an interface and validation layer only: no vendor is selected, no provider is called by the current TTS route, and no alignment data is exposed to the learner app until a provider passes Malayalam/code-switching, latency, rights and retention evaluation.


### Exact input identity verification

Before an alignment provider receives an alignment request, callers can use `assertGabrooSpeechAlignmentInputIdentity` to recompute the SHA-256 fingerprints from the exact supplied MP3 bytes and source text, then compare them with the audio identity record. This prevents a caller from pairing a legitimate identity object with a different byte buffer or transcript. Regression tests include a Malayalam/English/emoji source string and altered audio/text cases.


### Guarded provider execution and cancellation

`runGabrooSpeechAlignment` now wraps the provider lifecycle: it checks cancellation before work, recomputes audio/text identity before calling the provider, validates the returned alignment against the same identity, and checks cancellation again before exposing the result. A provider response that completes after the caller has cancelled is discarded. This helper is still an opt-in backend boundary and is not connected to the learner-facing TTS route.


### Alignment request bounds

The provider boundary rejects audio assets larger than 12 MiB and language tags outside the explicit `ml`, `en`, and `mixed` set before recomputing fingerprints or invoking a provider. This mirrors the bounded synthesis payload and prevents unbounded audio buffers or silently unsupported language modes from crossing the provider boundary.
