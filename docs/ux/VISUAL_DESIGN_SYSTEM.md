# Gabenglish Visual Design System

Version 1.0 — initial product design foundation.

## Brand principles
Friendly, confident, energetic and uncluttered. The interface should feel like a modern learning product, not a children's game. Gabroo adds personality but must never compete with lesson content or controls.

## Colour tokens
| Token | Hex | Purpose |
|---|---|---|
| Brand primary | #6A2BBF | Primary actions, key navigation and brand anchors |
| Brand secondary | #9747FF | Highlights, progress and supporting accents |
| Accent | #FFC83D | Small emphasis, rewards and attention cues |
| Warm surface | #FFF7EC | Warm neutral backgrounds |
| Text primary | #1F1B4D | Main text |
| Surface | #FFFFFF | Cards and content surfaces |
| Border | #E8E2F2 | Dividers and input outlines |
| Success | #218653 | Positive completion states |
| Warning | #A96800 | Caution states |
| Error | #B42318 | Validation and destructive feedback |

Check text/background contrast before release; brand colours do not override accessibility requirements.

## Typography
Use a highly legible sans-serif family with full Malayalam and Latin glyph coverage. Prefer one family with reliable Malayalam shaping where possible; test mixed Malayalam-English strings, punctuation, numerals and line wrapping on Android. Define semantic styles for display, heading, body, label, caption and button. Do not use decorative fonts for lesson explanations.

## Layout and components
- Mobile-first layouts with consistent spacing tokens and safe-area handling.
- Clear hierarchy: one primary action per screen; secondary actions visually quieter.
- Rounded cards and controls may express friendliness, but avoid excessive glass/neumorphic effects that reduce contrast.
- Touch targets must meet platform accessibility guidance.
- Inputs need persistent labels, helpful errors and keyboard-aware layout.
- Progress must show meaningful learning outcomes, not only streaks or time spent.

## Gabroo placement
Use the canonical character guide. Avatar sizes: compact identity/avatar, medium conversational tutor, and large onboarding/celebration. Prefer static or low-motion Gabroo while learners read; animate only when it adds instructional value. Never place the character over lesson text or critical controls.

## Learning states
Define consistent states for locked, available, in progress, needs review, completed, and recommended. Do not communicate state by colour alone; pair colour with text/iconography.

## Motion
Use short purposeful transitions. Respect reduced-motion settings. Avoid loops, confetti or sound that distract from learning. Provide user-controlled replay for speech and examples.

## Accessibility and localisation
- Support Malayalam, English and mixed-script content without clipping or broken shaping.
- Dynamic type/font scaling and screen-reader labels.
- Contrast checks, focus order, visible focus and non-colour status cues.
- Captions/transcripts for listening content where pedagogically appropriate.
- Avoid text embedded in images for essential instructions.

## Status
Initial design tokens and principles are established. Component implementation, typography selection, contrast audit and device validation remain to be completed in the design system implementation phase.


## Mobile implementation baseline (17 November 2026)

The first reusable mobile UI layer is now present in `apps/mobile/src/theme.ts` and `apps/mobile/src/ui.tsx`:
- Semantic colour, spacing, radius and type-scale tokens.
- Reusable brand mark, primary button, surface card and eyebrow primitives.
- Root navigation surface and placement, account and Gabroo screens now consume shared semantic background/brand tokens.
- The placement experience uses the shared brand mark and primary button rather than duplicating those controls.

This is the start of UI implementation, not the final design-system release. Still required: full component coverage, typography and Malayalam shaping verification on Android, screen-by-screen layout refinement, dynamic type/accessibility audit, dark/light decisions, interaction-state coverage, visual regression and representative-device usability testing. Gabroo's canonical 3D character art remains unapproved and must not be substituted with a temporary or inconsistent character.
