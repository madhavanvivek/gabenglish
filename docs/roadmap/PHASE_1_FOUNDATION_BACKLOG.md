# Gabenglish Phase 1 Foundation Backlog

Version 1.0 — sequenced implementation plan after product and character direction selection.

## Gate 0 — foundation decisions
- [ ] Confirm product name, target audience and Android-first scope.
- [x] Select Gabroo Concept C and lock visual identity guide.
- [x] Document Gabroo production requirements.
- [ ] Select typography after Malayalam glyph and shaping tests.
- [ ] Select AI/STT/TTS providers only after comparative Malayalam/code-switch benchmark.
- [ ] Confirm rendering strategy for static/animated Gabroo in React Native.
- [ ] Confirm privacy, consent, retention and child-safety requirements with qualified review.

## Gate 1 — engineering skeleton
- [ ] Monorepo or repository layout decision and ADR.
- [ ] Expo React Native app shell with TypeScript, navigation and design tokens.
- [ ] Node.js TypeScript API service with health/readiness endpoints.
- [ ] PostgreSQL schema migrations and seed strategy.
- [ ] Shared validation/types and API error contract.
- [ ] Environment configuration and secrets policy.
- [ ] CI for lint, typecheck, unit tests and build checks.

## Gate 2 — learner foundation
- [ ] Authentication and learner profile.
- [ ] Language preference and onboarding goals.
- [ ] Placement assessment and adaptive starting level.
- [ ] Stage/skill taxonomy and lesson catalogue.
- [ ] Lesson player with saved position.
- [ ] Vocabulary, examples and revision queue.
- [ ] Progress and recommendation foundations.

## Gate 3 — speech and Gabroo
- [ ] Run Malayalam, code-switching and accented-English STT benchmark.
- [ ] Run Malayalam/English TTS naturalness, clarity, latency and cost benchmark.
- [ ] Implement replaceable STT/TTS provider adapters.
- [ ] Implement speaking session, transcript and audio replay.
- [ ] Add correction modes and feedback classification.
- [ ] Produce/commission production Gabroo model, rig and core animations.
- [ ] Integrate avatar with audio states; validate reduced-motion/static fallback.

## Gate 4 — content and operations
- [ ] Admin roles and secure access.
- [ ] Curriculum authoring, review, publish and version workflow.
- [ ] Lesson, vocabulary, audio and assessment content management.
- [ ] Content QA checklist and learner feedback reporting.
- [ ] Subscription entitlement and payment verification design.
- [ ] Analytics events for learning outcomes, funnel and quality.

## Gate 5 — release readiness
- [ ] Threat model and privacy review.
- [ ] Accessibility and Malayalam localisation audit.
- [ ] Device matrix and performance tests.
- [ ] Offline/network failure and recovery tests.
- [ ] Backup/restore and incident response runbooks.
- [ ] Closed beta with target Malayalam-speaking learners.
- [ ] Resolve critical usability, learning-quality and speech-quality findings.

## Exit criteria
Do not call the foundation complete until architecture decisions, schema/API contracts, CI, security/privacy controls, content workflow, speech-provider evidence and Android device validation are documented and reviewed. Do not mark unchecked tasks complete without evidence.
