# Gabenglish with Gabroo

**Learn English in Malayalam. Build confidence. Gradually think and speak in English.**

Gabenglish is an AI-assisted spoken-English learning product initially designed for Malayalam-speaking learners in Kerala and India. Gabroo is its friendly, funny, energetic AI tutor.

## Status
Product and architecture foundation with active implementation planning. See the roadmap and live tutor specification for delivery status. Do not interpret a specification as proof that a feature is implemented.

## Locked decisions
- Product: Gabenglish
- Tutor: Gabroo — the single approved **Concept C — Signature Gabroo** character. Character identity is locked; no alternate designs or substitute avatars.
- Voice direction: male, funny, energetic, friendly and patient; natural Kerala Malayalam with casual, understandable slang.
- Exact production voice identity: pending blind benchmark and owner approval; the earlier basic synthesized demo is not final.
- Hosting: dedicated Render environment
- Mobile: React Native + Expo + TypeScript; Android first, iOS-ready shared architecture
- Backend: Node.js + TypeScript
- Database: PostgreSQL
- Admin: React + TypeScript
- Character rendering: 3D using the approved Gabroo identity
- Voice provider: selected only after benchmark

## Documentation
- Product: docs/product/PRODUCT_SPECIFICATION.md
- UX: docs/ux/UX_SPECIFICATION.md
- Character identity: docs/brand/GABROO_CHARACTER_GUIDE.md
- Character production: docs/brand/GABROO_PRODUCTION_SPECIFICATION.md
- Live tutor and onboarding: docs/ai/GABROO_LIVE_CONVERSATION_SPEC.md
- AI and speech evaluation: docs/ai/AI_SPEECH_EVALUATION.md
- Architecture: docs/architecture/TECHNICAL_ARCHITECTURE.md
- Data model: docs/architecture/DATA_MODEL.md
- API: docs/architecture/API_SPECIFICATION.md
- Curriculum: docs/learning/CURRICULUM_FRAMEWORK.md
- Security: docs/security/SECURITY_PRIVACY.md
- Phase 0: docs/roadmap/PHASE_0_PLAN.md

## Product principles
1. Gabroo is a live, responsive tutor—not a prerecorded welcome clip or slideshow.
2. Use only the exact approved Gabroo character identity across every surface.
3. Finalize the Gabroo voice only after Kerala Malayalam quality benchmarking and owner approval.
4. Keep speech, recognition, conversation and animation vendors replaceable behind adapters.
5. Prioritise learning accuracy, confidence, privacy and accessibility.
6. Do not claim fluency or certification based on unvalidated internal scores.
7. Do not copy proprietary code, artwork or curriculum from other products.
8. Never commit credentials, private recordings or production data.

## Repository structure
- apps/mobile
- apps/api
- docs/
- infrastructure/

## Current implementation note
The mobile app directory currently contains only a not-found route; a runnable registration-to-Gabroo onboarding flow and production avatar runtime are not yet present. The live tutor specification is the implementation contract. Production 3D assets and final voice selection are also pending; use the approved static artwork/placeholder until approved production assets are supplied.

