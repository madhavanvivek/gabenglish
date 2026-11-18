# Gabroo Production Character Specification

Version 1.1 — production brief for the approved Concept C identity.

## Scope
Translate the approved Concept C character into production 3D modelling, rigging, animation and app integration. The visual identity is locked; production work must not redesign it.

## Source of truth and identity lock
Use `docs/brand/GABROO_CHARACTER_GUIDE.md` and the owner-approved Concept C character sheet/source assets. The same exact Gabroo must appear in onboarding, live conversations, placement, lessons, daily activities and all marketing/app surfaces.

- Never substitute, regenerate, remix or reinterpret the character.
- Preserve face, head shape, eye spacing, nose, mouth, hairline/curls, skin tone, silhouette, proportions, outfit, cap, headphones and G marks.
- If the approved source model is unavailable, use the approved static reference or a clearly labelled placeholder. Do not use generic/provider demo avatars.
- Any identity change requires explicit owner approval and a versioned brand revision.

## Required design deliverables
- Orthographic front, side, back and three-quarter views matching the approved sheet.
- Neutral A-pose/T-pose, face close-ups, eight canonical expressions.
- Material swatches and accessory/logo placement details.

## Required 3D deliverables
- Editable source scene and runtime export; clean topology and UVs.
- PBR textures with documented dimensions/compression.
- Body rig, facial rig, eye aim, eyelids, brows, jaw and mouth controls.
- Stable attachment points for cap and headphones; backpack where shown.
- Reduced-complexity/LOD option for lower-end Android devices.

## Required animation library
Idle/breathing, blink, listen, think, explain, teach, chat, encourage, celebrate and transitions. Clips should be reusable, blend through neutral states and remain lively without distracting learners. Provide static/low-motion mode and short restrained celebrations. Every clip must preserve the approved identity and pass a face/proportion review.

## Speech/lip-sync contract
Keep speech and animation providers replaceable. Accept timestamped phoneme/viseme events where supported and map them through an adapter to canonical rig controls. If timing is unavailable, use an approximate talking loop; do not claim accurate lip-sync. Do not hard-code a single TTS provider's viseme names into the rig.

The rig must visibly support M/B/P closure, F/V contact, L/tongue placement, vowel shapes, jaw motion, cheek/brow/eye controls and smooth co-articulation. Listening/silence must return to neutral mouth state. Interruptions must stop speaking animation with audio.

## Live tutor integration
The avatar is the visual presence for the live conversation runtime described in `docs/ai/GABROO_LIVE_CONVERSATION_SPEC.md`. Drive speaking animation from actual audio timing, not a fixed mouth loop. Drive listening, thinking, encouragement and playful expressions from conversation state and context. Never play a fixed clip as if it were reacting to a learner's response.

## Mobile integration and acceptance
- Avatar loads without blocking lesson navigation.
- Idle and speaking animation remain responsive during audio playback.
- No mesh collapse, accessory clipping or face drift in approved clips.
- Validate texture/model memory and frame performance on lower-end, mid-range and current Android devices.
- Reduced-motion and static-avatar fallbacks work.
- Record source ownership/licences, versions, texture maps, rig controls, clips and exports.

Set numeric performance budgets after choosing the runtime/rendering technology and profiling the target device matrix.

## Acceptance checklist
- [ ] All views preserve the approved face, hair, silhouette, proportions and outfit.
- [ ] Eight expressions remain recognisable and supportive.
- [ ] Teaching, listening and celebration poses are complete.
- [ ] Facial rig supports required mouth shapes and smooth blending.
- [ ] Speech-synced animation tracks actual audio events.
- [ ] Body rig supports the animation library.
- [ ] Source, textures, licences and exports are versioned.
- [ ] Android performance and reduced-motion behaviour are tested.
- [ ] Owner approves final production model before release.

## Status
Identity is approved and locked. Modelling, rigging, animation, speech timing integration and device validation remain pending implementation.
