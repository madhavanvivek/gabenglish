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
