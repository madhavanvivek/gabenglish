# Gabroo Character Selection and Approval Gate

Status: **Selection and approval process; no character identity or 3D avatar approved yet**
Last reviewed: 2026-11-18
Applies to: every Gabenglish client, onboarding flow, tutor session, lesson, assessment, notification, promotional render and future platform.

## 1. Current approval status and selection rule

No Gabroo concept, face, outfit or production 3D avatar has been approved yet. Concept C and any other supplied or generated character references are exploratory options only; none is the canonical identity. The owner must review and explicitly select a character direction before a canonical visual source can be established.

The immediate task is to prepare and compare distinct character concepts for owner selection. Do not treat an existing reference or previous concept label as an approval. After selection, preserve the chosen identity and do not silently reinterpret, replace or mix it with other concepts.

After the owner selects a concept, prepare a definitive model sheet and obtain approval before importing it as the canonical, versioned, access-controlled master asset. Exploratory generated concepts are not production assets and must be clearly labelled as options.

A previously inspected reference image and its manifest must not be interpreted as owner approval of the character identity or 3D avatar. Any reference asset remains exploratory until the owner explicitly confirms it as the selected canonical source.

## 2. Evaluation criteria for concept selection

Evaluate each proposed character for:
- face identity and facial proportions;
- head shape, eye shape/spacing, eyebrows, nose, mouth and smile;
- skin tone and shading identity;
- hairline, curl pattern, hairstyle and silhouette;
- purple cap and its approved G mark;
- purple hoodie, approved G branding and underlying outfit;
- purple headphones and their shape/details;
- body proportions, apparent age/style and overall silhouette;
- established palette, materials and visual personality.

The owner selects the visual identity. Once approved, no per-screen costume changes or facial reinterpretations are permitted without a separately approved revision.

## 3. Permitted production work

After explicit concept and model approval, the following production work is allowed:
- create a production 3D model by matching the approved reference;
- build a facial/body rig that preserves the approved topology and proportions;
- create phoneme/viseme shapes, expressions and gesture clips on that same model;
- create neutral, listening, thinking, speaking, smiling, encouraging, laughing and surprised states without changing recognisability;
- optimise mesh, textures, materials, lighting and level of detail for Android while preserving the reference;
- render the same character in different camera angles, crops and app layouts.

These are animation/rendering states of one character, not new character variants.

## 4. Prohibited work

- Do not present generated concept images as approved or canonical. Image generation may be used to prepare clearly labelled options for owner selection.
- Do not use stock avatars, generic talking heads, AI-video actors or another character for any Gabroo interaction.
- Do not combine traits from previous concept options or external reference characters.
- Do not create separate onboarding, lesson, assessment or marketing versions with different faces/outfits.
- Do not let a voice/animation vendor silently substitute its own avatar.
- Do not claim a static image/storyboard is a live avatar or lip-synchronised video.
- Do not use a prerecorded clip as the primary interactive tutor experience.

## 5. Asset provenance and release gate

Before implementation can be marked production-ready:
1. Import the owner-approved Branding Kit V2 reference artwork byte-for-byte.
2. Record its original filename, source, dimensions, checksum and approval/version in `docs/brand/GABROO_APPROVED_ASSET_MANIFEST.md`.
3. Store the master as read-only source material; derived model, textures, rig and exports must reference that source/version.
4. Produce a model-sheet comparison (front, three-quarter, profile and full-body) for owner review.
5. Obtain explicit owner approval of the 3D model before animation production.
6. Run visual regression checks against the approved master for all app surfaces and avatar states.
7. Verify no vendor fallback or loading state swaps in a different character.

The manifest checksum is calculated from the exact owner-provided PNG bytes. After repository upload, recompute SHA-256 from the committed bytes and require an exact match before marking the repository-import gate complete.

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

Voice identity is a separate, open approval decision. No final voice has been selected. Benchmark multiple candidates for natural Kerala Malayalam, clarity, warmth, energy, humour and code-switching; obtain explicit owner approval. Do not assume a provider sample is final.

## 8. Implementation status

- Character concept/visual source: **not yet selected or owner-approved; concept exploration required**.
- Exploratory reference material: **not an approved canonical source**.
- Reference PNG committed byte-for-byte to repository: **pending**.
- Production 3D model and owner visual sign-off: **pending; cannot begin final production until concept selection**.
- Facial/body rig and animation states: **pending**.
- Audio-timestamp-driven lip-sync: **contract added; renderer integration pending**.
- Live interruptible tutor conversation: **pending**.
- Production voice selection: **not selected; benchmark and explicit owner approval pending**.

Documentation and contracts do not imply that any pending production capability is already implemented.
