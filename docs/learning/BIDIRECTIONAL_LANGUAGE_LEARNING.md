# Gabenglish — Bidirectional Language Learning

Version 1.0 — product expansion proposal
Decision date: 17 November 2026
Status: Direction approved for product design and architecture; implementation not yet enabled.

## 1. Product decision

Gabenglish should evolve from a one-direction English-learning experience into a bilingual learning platform with two distinct course directions, while preserving the current English-through-Malayalam journey as the launch foundation.

1. **English through Malayalam** — target language: English; learner support language: Malayalam (with gradual English immersion).
2. **Malayalam through English** — target language: Malayalam; learner support language: English (with optional Malayalam-script and romanisation support).

These are separate learning journeys, not a single curriculum translated word for word. The learner explicitly chooses a direction. Do not infer the target language from account locale, nationality, location, name or device language.

The approved product expansion does not rename the Gabenglish brand or change Gabroo's canonical character identity. Brand positioning can be reviewed after product validation; no rename is approved.

## 2. Core language model

Represent three independent concepts:

- `target_language`: the language the learner is trying to acquire (`en` or `ml` initially).
- `support_language`: the language used for explanations and scaffolding (`ml` or `en` initially).
- `learning_direction`: the course pairing (`ml_to_en` or `en_to_ml`).

Do not overload the existing `support_language` preference to mean learning direction. Existing learner accounts must retain their current English-learning experience by default. Direction is a separate preference and should be persisted independently.

Initial valid pairs:
| Direction | Target language | Default support language |
|---|---|---|
| `ml_to_en` | `en` | `ml` |
| `en_to_ml` | `ml` | `en` |

Allow a learner to change support language where pedagogically sensible, but keep the target language explicit and visible. A direction switch must not erase progress, saved phrases, diagnostic reports or previous conversations.

## 3. Learner journeys

### A. English through Malayalam (existing core journey)

- Explain beginner concepts in natural Kerala Malayalam.
- Move from Malayalam-supported examples to mixed language and then more independent English use.
- Practise everyday, academic and professional English.
- Correct grammar, vocabulary, naturalness and register without shaming.
- Keep the existing five Gabenglish stages as the English curriculum progression.

### B. Malayalam through English (new journey)

Target learners include people relocating to Kerala, colleagues working with Malayali teams, students, travellers, and people with Malayalam-speaking friends or family.

Teach in this sequence:
1. Useful spoken phrases and listening comprehension for everyday situations.
2. Pronunciation and sound awareness, including sounds that may be unfamiliar to English speakers.
3. Sentence patterns and word order through meaningful examples.
4. Questions, responses, requests, directions, shopping, transport, food and workplace interactions.
5. Politeness, forms of address, relationships, context and register.
6. More independent conversation, storytelling and comprehension of natural speech.

Use English for explanations by default. Show Malayalam script alongside a learner-controlled romanisation aid. Do not make romanisation the only representation or imply that it perfectly captures Malayalam pronunciation. Learners should be able to hide romanisation as literacy develops.

### Malayalam-specific teaching safeguards

- Teach natural, contemporary Malayalam with a clearly stated regional/register context.
- Distinguish spoken conversational forms from formal written Malayalam.
- Explain politeness, honorifics, relationship and age-sensitive address; never recommend overly familiar forms as universal defaults.
- Avoid presenting one dialect as the only correct Malayalam. Start with broadly understandable Kerala usage and label regional alternatives.
- Include listening and pronunciation work, but do not claim pronunciation assessment without validated audio evidence.
- Have a fluent Malayalam educator review all target-language content, transliteration and audio.
- Teach Malayalam script progressively as a supported learning outcome, not as a prerequisite for beginning basic spoken conversation.

## 4. Gabroo teaching behaviour

Gabroo remains one consistent tutor identity, but its teaching policy changes with the selected direction.

For `ml_to_en`:
- Explain in Malayalam at beginner levels and increase English use based on demonstrated comprehension and learner preference.
- Treat the learner's English production as the target skill.
- Do not overcorrect dialect or valid conversational English.

For `en_to_ml`:
- Explain in English by default.
- Present the Malayalam phrase in script, with optional romanisation and audio.
- Ask the learner to understand, choose, repeat or construct a Malayalam response.
- Explain social context and politeness before encouraging use of a phrase with real people.
- Accept appropriate spoken variants and explain register differences.

Gabroo should state the selected direction in onboarding and allow switching from the learning home. It must not silently change direction mid-course.

## 5. Assessment and progress

Create separate assessment blueprints for English and Malayalam. Do not reuse English scoring rubrics for Malayalam.

For Malayalam learning, assess independently where evidence exists:
- listening comprehension;
- functional vocabulary and phrase recall;
- sentence construction;
- conversational response;
- script recognition/reading (only if the learner has opted into script learning);
- pronunciation/intelligibility (only from validated voice evidence).

Use provisional, evidence-based observations until educator-reviewed rubrics and calibration data exist. Do not claim CEFR alignment for Malayalam. Show which skills were not assessed. Preserve separate progress per target language and course version.

## 6. Content architecture

Extend the content schema to include explicit `source_language`, `target_language`, `learning_direction`, `script_mode`, `register`, `dialect_scope`, `romanisation`, `audio` and educator review metadata where applicable.

Every content item must declare the direction it serves. Content authored for `ml_to_en` must not be surfaced as a lesson for `en_to_ml` merely because the same languages appear in its metadata.

Use distinct curriculum trees and learning-stage definitions for the two directions. Reuse generic platform mechanics (lesson player, practice engine, revision scheduler, tutor orchestration) but not language-specific pedagogical assumptions or answer keys.

## 7. Subscription and product packaging

Initial recommendation: include both directions under the existing Gabenglish subscription rather than creating a new paid tier. Keep the current approved price configuration unchanged: monthly ₹79 introductory / ₹99 standard and yearly ₹799 introductory / ₹1,188 standard, subject to the existing first-purchase policy. Do not change prices or entitlement rules as part of this feature design.

Before enabling the Malayalam course publicly, confirm content review capacity, audio quality, learner demand and support requirements. Superadmin may later control course availability by direction, but the client must never display a direction as available if its approved curriculum and required services are not ready.

## 8. Rollout plan

### Phase 0 — architecture and validation
- Approve the two-direction product model.
- Keep target language, support language and direction separate in shared contracts.
- Define separate curriculum and assessment blueprints.
- Interview/test with English-speaking learners who want spoken Malayalam.
- Validate the product name/positioning without changing the approved brand yet.

### Phase 1 — foundation
- Add a persisted learner learning-direction preference with safe default `ml_to_en`.
- Add a direction chooser to onboarding and learning home.
- Keep existing learners on `ml_to_en` without a forced migration prompt.
- Add direction-aware API contracts and conversation metadata.
- Ensure progress and saved learning content are partitioned by direction.

### Phase 2 — Malayalam course pilot
- Build a small educator-reviewed beginner Malayalam course.
- Include English explanations, Malayalam script, optional romanisation and reviewed audio.
- Cover introductions, greetings, polite requests, directions, food and everyday workplace situations.
- Add a dedicated practice and revision loop.
- Pilot with a small cohort before public release.

### Phase 3 — full bilingual platform
- Expand Malayalam curriculum and adaptive placement.
- Add richer listening/speaking practice after provider and privacy validation.
- Support additional target/support language pairs only after editorial and technical review.

## 9. Acceptance criteria

- Existing accounts continue to use English through Malayalam unless they explicitly choose otherwise.
- The selected direction persists across sign-in, devices and app restarts.
- Switching direction never deletes or conflates progress.
- Every lesson, exercise, assessment and tutor conversation carries an explicit target language/direction.
- English and Malayalam assessment rubrics are separate.
- Malayalam content has fluent educator review and register/dialect metadata before publication.
- Romanisation is optional and never presented as exact phonetic truth.
- No direction is marked available until its reviewed curriculum and product flows are actually ready.

## 10. Current status and boundaries

This document records the approved product direction for design and architecture. It does not mean Malayalam course content, direction selection UI, direction persistence, a Malayalam placement assessment, or Malayalam-specific tutor behaviour has been implemented. Those require separate code, migrations, tests, editorial review and device validation.


## 11. Malayalam assessment blueprint — implementation status

A draft-only machine-readable blueprint defines six independent evidence domains for the en_to_ml journey: listening comprehension, functional vocabulary, phrase recall, sentence construction, contextual conversational response and optional script recognition. It is deliberately unpublished and has no scoring weights, proficiency label or automated placement. Every task records limitations; script recognition is included only when the learner opts into script learning. This is an implementation scaffold, not educator-reviewed assessment content. Recording assets, accepted variants, task validation and fluent Malayalam educator review remain required before activation.


## 12. Direction-aware curriculum storage — implementation status

Migration `0014_direction_aware_curriculum_progress.sql` adds explicit direction/source/target metadata to courses and lesson versions, plus script mode, register, dialect scope, romanisation and educator-review metadata. Existing course and lesson-version records are safely backfilled to the established `ml_to_en` / Malayalam-source / English-target path. New course-level and lesson-version-level learner progress tables are direction-scoped. Database triggers reject progress records whose course, lesson version and selected direction do not agree. Existing legacy progress rows are left untouched. The migration creates no Malayalam lessons and does not publish draft content; educator approval remains a separate requirement.


## 13. Malayalam beginner curriculum map — implementation status

A draft curriculum map now defines three beginner-to-connected-conversation stages and fourteen lesson specifications across greetings, polite everyday language, sound/listening foundations, food and shopping, transport, workplace interactions, and context/register. Every unit is explicitly `en_to_ml`, targets Malayalam, uses English support, requires Malayalam script with optional romanisation, identifies a broad Kerala dialect scope, and remains `not_reviewed` / `draft`. The map contains learning outcomes only; it is not a set of playable lessons. Native-speaker educator review, reviewed Malayalam examples, accepted variants, audio assets and lesson exercises are still outstanding.


## 14. Published course catalog API and mobile integration

The API now exposes `GET /api/v1/learning/courses` for the signed-in learner's selected direction. It requires a verified account and active subscription, reads direction from the persisted preference, and returns only published courses and lessons with a current published version. For `en_to_ml`, a lesson version must additionally have `educator_review_status='approved'`; draft, unreviewed and incomplete lesson versions are omitted. The mobile learning screen now requests this catalog and displays returned course/module/lesson titles, while retaining the draft curriculum notice when no approved Malayalam lessons are available. This is a catalog integration only: a lesson player, exercise submission and progress-write API are not yet implemented.


## 15. Lesson detail and learner progress API

The API now provides a published lesson detail endpoint and a progress-write endpoint. Both require a verified learner account, active subscription, published course/lesson/current version, and a match with the learner's saved learning direction. Malayalam lesson access additionally requires educator approval. Progress is stored against the exact lesson version and learning direction; completed lessons cannot be downgraded by a later partial update. Course progress is calculated across all currently published, direction-approved lessons in that course, treating untouched lessons as zero progress. The mobile app now has a lesson detail/progress screen with explicit progress save milestones and links from published catalog lessons. The screen intentionally does not invent lesson body text or exercises; a schema-driven content player and exercise evaluation remain outstanding.
