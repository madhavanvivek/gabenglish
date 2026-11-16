# Gabenglish with Gabroo

**Learn English in Malayalam. Build confidence. Gradually think and speak in English.**

Gabenglish is an AI-assisted spoken-English learning product initially designed for Malayalam-speaking learners in Kerala and India. Gabroo is its friendly, funny, energetic AI tutor.

## Status
Phase 0: documentation and foundation. This repository is the canonical home for product, UX, technical, AI, curriculum, security and delivery specifications. Application implementation follows review of this foundation.

## Locked decisions
- Product: Gabenglish
- Tutor: Gabroo
- Voice direction: male, funny, energetic and friendly
- Malayalam style: natural Kerala Malayalam with casual slang
- Humour: funny and gently teasing; never insulting, humiliating or discouraging
- Hosting: dedicated Render environment
- Mobile: React Native + Expo + TypeScript; Android first, iOS-ready shared architecture
- Backend: Node.js + TypeScript
- Database: PostgreSQL
- Admin: React + TypeScript
- Character rendering: 3D
- Voice provider: selected only after benchmark

**Open character decision:** Explore a kid-style Gabroo and a bigger/adult-style Gabroo (plus an ageless stylised option) before approval. Personality is locked; physical appearance is not. No concept image is canonical until explicitly approved.

## Documentation
- Product: docs/product/PRODUCT_SPECIFICATION.md
- UX: docs/ux/UX_SPECIFICATION.md
- Character: docs/brand/GABROO_CHARACTER_GUIDE.md
- Architecture: docs/architecture/TECHNICAL_ARCHITECTURE.md
- Data model: docs/architecture/DATA_MODEL.md
- API: docs/architecture/API_SPECIFICATION.md
- AI and speech: docs/ai/AI_SPEECH_EVALUATION.md
- Curriculum: docs/learning/CURRICULUM_FRAMEWORK.md
- Security: docs/security/SECURITY_PRIVACY.md
- Phase 0: docs/roadmap/PHASE_0_PLAN.md

## Principles
1. Keep Gabenglish independent of all other products and repositories.
2. Document decisions before implementation.
3. Keep AI and speech vendors replaceable behind backend adapters.
4. Prioritise learning accuracy, confidence, privacy and accessibility.
5. Do not claim fluency or certification based on unvalidated internal scores.
6. Do not copy proprietary code, artwork or curriculum from other products.
7. Never commit credentials, private recordings or production data.

## Planned repository layout
- apps/mobile
- apps/admin
- services/api
- services/worker
- packages/contracts
- packages/design-system
- packages/shared
- infrastructure/render
- docs/

These are planned boundaries, not completed applications.

## Phase 0 exit
Product/UX scope, character direction, architecture, data model, API contracts, AI/speech evaluation, security approach, Render topology and a prioritised Phase 1 backlog are reviewed and approved.
