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
