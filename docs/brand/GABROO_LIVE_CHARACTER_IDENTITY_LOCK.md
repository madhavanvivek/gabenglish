# Gabroo Live Character Identity Lock

Status: **Binding product and production requirement**
Last reviewed: 2026-11-18
Applies to: every Gabenglish client, onboarding flow, tutor session, lesson, assessment, notification, promotional render and future platform.

## 1. Non-negotiable identity rule

Gabroo must always be the exact learner-approved **Concept C — Signature Gabroo** from **Gabenglish Branding Kit Version 2**. The approved character artwork supplied by the product owner is the single canonical visual source.

This is an identity-preservation requirement, not a request to create a character inspired by the reference. Do not reinterpret, redesign, regenerate, replace, blend, remix or approximate Gabroo. Do not introduce alternate character concepts, substitute avatars, extra tutors or unrelated character references.

The canonical source must be imported into the repository as a versioned, access-controlled master asset before production avatar implementation. Until that happens, the supplied approved artwork remains the only valid visual reference; no generated image is an acceptable substitute.

## 2. What must remain identical

Preserve the approved character's:
- face identity and facial proportions;
- head shape, eye shape/spacing, eyebrows, nose, mouth and smile;
- skin tone and shading identity;
- hairline, curl pattern, hairstyle and silhouette;
- purple cap and its approved G mark;
- purple hoodie, approved G branding and underlying outfit;
- purple headphones and their shape/details;
- body proportions, apparent age/style and overall silhouette;
- established palette, materials and visual personality.

No per-screen costume changes, facial reinterpretations, age shifts, hairstyle changes, body-shape changes or alternate art styles. Animation may move the existing rigged features; it must not change the underlying identity.

## 3. Permitted production work

The following are allowed only as faithful technical extensions of the approved master:
- create a production 3D model by matching the approved reference;
- build a facial/body rig that preserves the approved topology and proportions;
- create phoneme/viseme shapes, expressions and gesture clips on that same model;
- create neutral, listening, thinking, speaking, smiling, encouraging, laughing and surprised states without changing recognisability;
- optimise mesh, textures, materials, lighting and level of detail for Android while preserving the reference;
- render the same character in different camera angles, crops and app layouts.

These are animation/rendering states of one character, not new character variants.

## 4. Prohibited work

- Do not use image generation to invent a new Gabroo or produce a replacement master.
- Do not use stock avatars, generic talking heads, AI-video actors or another character for any Gabroo interaction.
- Do not combine traits from previous concept options or external reference characters.
- Do not create separate onboarding, lesson, assessment or marketing versions with different faces/outfits.
- Do not let a voice/animation vendor silently substitute its own avatar.
- Do not claim a static image/storyboard is a live avatar or lip-synchronised video.
- Do not use a prerecorded clip as the primary interactive tutor experience.

## 5. Asset provenance and release gate

Before implementation can be marked production-ready:
1. Import the owner-approved Branding Kit V2 master artwork without alteration.
2. Record its original filename, source, dimensions, checksum and approval/version in an asset manifest.
3. Store the master as read-only source material; derived model, textures, rig and exports must reference that source/version.
4. Produce a model-sheet comparison (front, three-quarter, profile and full-body) for owner review.
5. Obtain explicit owner approval of the 3D model before animation production.
6. Run visual regression checks against the approved master for all app surfaces and avatar states.
7. Verify no vendor fallback or loading state swaps in a different character.

Do not invent or hardcode an asset checksum. Record it only after the exact approved source file is imported and hashed.

## 6. Animation and live conversation quality

The approved character must feel responsive, not like a fixed video:
- speech audio and facial animation share a single timeline;
- viseme timing is derived from the generated audio/phoneme timestamps where supported;
- co-articulation and smooth transitions avoid mechanical mouth flapping;
- brows, eyes, gaze, head and hands react to conversational intent;
- listening, thinking, speaking, interrupted and reconnecting states are distinct;
- the learner can interrupt Gabroo; the avatar stops speaking and visibly listens;
- responses are generated from the learner's actual turn, not a pre-scripted sequence;
- the same character remains on screen through the conversation.

Do not fake exact lip-sync with a generic loop. If timing metadata is unavailable, use a restrained approximation and label the quality limitation during development.

## 7. Voice identity is separate from visual identity

The voice must be benchmarked and approved independently. The chosen voice direction remains male, energetic, funny, friendly and natural in Kerala Malayalam, with respectful casual slang. Do not assume a provider's sample voice is final. Do not allow voice-provider choice to alter the approved character design.

## 8. Implementation status

- Approved visual source: **selected and owner-approved in Branding Kit V2**.
- Identity lock: **defined by this document**.
- Approved master asset committed to repository with manifest/checksum: **pending**.
- Production 3D model and owner visual sign-off: **pending**.
- Facial/body rig and animation states: **pending**.
- Audio-timestamp-driven lip-sync: **pending**.
- Live interruptible tutor conversation: **pending**.
- Production voice selection: **pending benchmark and owner approval**.

Documentation does not imply that any pending production capability is already implemented.
