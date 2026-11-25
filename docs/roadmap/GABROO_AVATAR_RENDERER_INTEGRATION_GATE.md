# Gabroo Avatar Renderer Integration Gate

Status: implementation contract; renderer and production rig are not yet certified.

This document defines the next integration boundary after the audio-bound phoneme timeline parser and native-clock sampling bridge. It does not claim that a 3D renderer, approved production rig, phoneme aligner, or canonical voice is configured.

## Non-negotiable inputs

The renderer may animate only when all of the following are true:
1. The active conversation belongs to the signed-in learner and is allowed by the existing subscription gate.
2. The active native playback ticket matches the audio asset currently playing.
3. The MP3 metadata is measured and content-addressed (audio ID, SHA-256 and duration).
4. The phoneme alignment has passed schema validation and is bound to that exact audio ID, hash and duration.
5. The native player is loaded, playing, and reports a finite playhead in the open interval [0, duration).
6. The renderer has loaded the single owner-approved Gabroo model and reports the expected rig version.

If any input is missing, stale, paused, malformed, unsupported or mismatched, render the approved neutral/listening pose. Never estimate phoneme timing from text, infer alignment from elapsed wall-clock time, or start an approximate mouth loop while describing it as lip-sync.

## Renderer adapter boundary

Keep the application independent of a specific 3D engine. The adapter should expose these responsibilities:
- load(modelManifest): load a versioned model and return capabilities plus rig identity.
- applyFrame(frame): apply a complete immutable frame, not a partial patch that can leave old mouth shapes active.
- resetToNeutral(): synchronously clear mouth, expression and gesture controls.
- dispose(): release model, textures, animation resources and native/GPU handles.

A frame contains one validated viseme (or neutral), bounded viseme blend weight, one allow-listed expression cue (or neutral), one allow-listed gesture cue (or idle), and a monotonically increasing playback generation and sample timestamp.

The renderer must not receive provider-specific event objects, learner transcripts, credentials, or arbitrary model instructions. Map the shared `GabrooAvatarFrame` contract into the renderer gate's allow-listed controls through `apps/mobile/src/gabroo/avatar-frame-mapper.ts`. Keep this mapping explicit, exhaustive and unit-tested; it is a semantic bridge only, not a replacement for phoneme alignment or a claim that a production rig supports every cue.

## Playback lifecycle

Treat every audio asset as a generation:
1. On new playback, increment the generation and reset the rig before accepting samples.
2. On each native playback tick, verify the generation, ticket ID, measured duration and player state before sampling.
3. Apply a complete frame only when the sample belongs to the active generation.
4. On pause, completion, unload, screen blur, app background, interruption, error or cancellation, reset to neutral immediately.
5. Ignore late callbacks from earlier generations.
6. On alignment failure or provider unavailability, keep the mouth neutral and expose the capability as unavailable; do not silently fall back to guessed timing.

Expression and gesture cues must be time-bounded and blended independently of phoneme sampling. They must never override jaw/lip controls during speech. Listening and thinking poses must use a neutral mouth.

## Performance and accessibility

- Keep the approved static artwork as the fallback when model loading fails or the device is below the tested capability floor.
- Support reduced motion by disabling non-essential gestures and easing while retaining captions and controls.
- Avoid re-creating geometry, materials or animation resources on each playback tick.
- Bound texture/model memory and release resources on screen disposal.
- Test low-, mid- and high-range Android devices; do not infer device readiness from an Expo bundle build.

## Required tests before enabling the renderer

### Adapter unit tests
- Model manifest with wrong character identity or rig version is rejected.
- Missing rig capability produces a neutral frame, not a guessed mapping.
- Every applied frame clears stale mouth/expression/gesture state.
- Unknown viseme, expression or gesture is rejected to neutral.
- Blend weights and timestamps outside contract bounds are rejected.
- Dispose is idempotent and prevents subsequent frame application.

### Playback integration tests
- Correct ticket + exact audio hash + measured duration + playing native clock produces the expected sampled viseme.
- Wrong ticket, wrong hash, wrong duration, absent alignment, unmeasured audio, paused/unloaded player and completed playhead all produce neutral.
- A stale callback from the previous generation cannot animate the next audio asset.
- Pause, interruption, screen blur, app background and cancellation reset the mouth in the same lifecycle turn.
- Alignment timeout/failure leaves the conversation usable with captions and neutral artwork.

### Device acceptance
Record device model, Android version, renderer/rig version, frame-time percentiles, peak memory, thermal behaviour, battery impact, and results for interruption/recovery. Include Malayalam-English code-switch samples and M/B/P, F/V, L/tongue, vowel, silence and rapid-turn cases reviewed by Malayalam-fluent evaluators.

## Release gates

Do not set live_avatar_renderer=true until the owner-approved Concept C source asset and provenance are recorded; the production model and rig have explicit owner approval; adapter and playback integration tests pass; a real phoneme-alignment provider is configured and its output is validated against exact audio; Android device acceptance is recorded; and captions, mute, replay, speed control, reduced motion and static fallback pass.

Voice approval is a separate gate. The renderer must not select or lock a voice provider. No merge or production deployment is implied by this contract.