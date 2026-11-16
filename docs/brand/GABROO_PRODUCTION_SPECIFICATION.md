# Gabroo Production Character Specification

Version 1.0 — implementation brief for the selected Concept C identity.

## Scope
This brief translates the selected concept into 3D modelling, rigging, animation and app-integration requirements. It does not claim production assets already exist.

## Source of truth
Use docs/brand/GABROO_CHARACTER_GUIDE.md and the selected Concept C character sheet. If a render conflicts with the guide, preserve the written identity and request review.

## Required design deliverables
- Orthographic front, side, back and three-quarter views.
- Neutral A-pose/T-pose, face close-ups, eight canonical expressions.
- Material swatches and accessory/logo placement details.

## Required 3D deliverables
- Editable source scene and runtime export; clean topology and UVs.
- PBR textures with documented dimensions/compression.
- Body rig, facial rig, eye aim, eyelids, brows, jaw and mouth controls.
- Stable attachment points for cap, headphones and backpack.
- Reduced-complexity/LOD option for lower-end Android devices.

## Required animation library
Idle/breathing, blink, listen, think, explain, teach, chat, encourage, celebrate and transitions. Clips should be reusable, blend through neutral states and remain lively without distracting learners. Provide static/low-motion mode and short restrained celebrations.

## Speech/lip-sync contract
Keep speech and animation providers replaceable. Accept timestamped phoneme/viseme events where supported and map them through an adapter to canonical rig controls. If timing is unavailable, use an approximate talking loop; do not claim accurate lip-sync. Do not hard-code a single TTS provider's viseme names into the rig.

## Mobile integration and acceptance
- Avatar loads without blocking lesson navigation.
- Idle and speaking animation remain responsive during audio playback.
- No mesh collapse, accessory clipping or face drift in approved clips.
- Validate texture/model memory and frame performance on lower-end, mid-range and current Android devices.
- Reduced-motion and static-avatar fallbacks work.
- Record source ownership/licences, versions, texture maps, rig controls, clips and exports.

Set numeric performance budgets after choosing the runtime/rendering technology and profiling the target device matrix.

## Acceptance checklist
- [ ] All views preserve face, hair, silhouette, proportions and outfit.
- [ ] Eight expressions remain recognisable and supportive.
- [ ] Teaching, listening and celebration poses are complete.
- [ ] Facial rig supports required mouth shapes and smooth blending.
- [ ] Body rig supports the animation library.
- [ ] Source, textures, licences and exports are versioned.
- [ ] Android performance and reduced-motion behaviour are tested.
- [ ] Owner approves final production model before release.

## Status
Identity direction selected and documented. Modelling, rigging, animation, speech timing integration and device validation remain pending implementation.
