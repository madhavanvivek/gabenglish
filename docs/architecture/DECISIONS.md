# Architecture Decision Register

This file indexes decisions for Gabenglish. Accepted decisions are binding until explicitly superseded; proposed items still require validation.

## ADR-001 — Mobile application framework
- Status: Proposed
- Decision: React Native + Expo + TypeScript.
- Context: Android is first; iOS should reuse the shared codebase.
- Consequences: Validate audio, background and character-rendering capabilities on real Android devices before locking dependencies.

## ADR-002 — Backend platform
- Status: Proposed
- Decision: Node.js + TypeScript modular API.
- Consequences: Domain boundaries and provider adapters must be tested independently.

## ADR-003 — Database
- Status: Accepted for foundation
- Decision: PostgreSQL as transactional source of truth; UUID identifiers and UTC timestamptz values.
- Consequences: Use reviewed forward-only migrations, explicit ownership constraints, backups and restore tests. Initial SQL is a foundation, not the complete final schema.

## ADR-004 — Hosting
- Status: Direction confirmed; workspace pending
- Decision: Dedicated Render environment for Gabenglish.
- Consequences: Never reuse Ozhzo, Fabnotch or Endroser workspaces/resources. No Gabenglish production resources should be provisioned until a dedicated isolated environment and cost plan are confirmed.

## ADR-005 — Gabroo personality
- Status: Accepted
- Decision: Male voice direction; funny, energetic, friendly, patient and encouraging; natural Kerala Malayalam with casual slang; playful teasing without insults or humiliation.
- Consequences: Tutor prompts, speech benchmark and QA must enforce this behaviour. Exact provider/voice remains open.

## ADR-006 — Gabroo physical design
- Status: Accepted — Concept C
- Decision: Signature Gabroo, a youthful age-neutral stylised character with curly dark hair, expressive brown eyes, purple cap/hoodie, white G marks, headphones and tan cargo trousers. The visual identity is documented in docs/brand/GABROO_CHARACTER_GUIDE.md.
- Consequences: Use the guide as the canonical reference for all product and marketing artwork. The concept artwork is not a production 3D model; modelling, rigging and animation remain pending.

## ADR-007 — AI and speech providers
- Status: Open
- Decision: Benchmark before selection.
- Consequences: Use provider-neutral adapters and a consented evaluation set covering Kerala Malayalam, code-switching, Malayalam-accented English, latency, cost and privacy.

## ADR-008 — Mobile character rendering
- Status: Open
- Decision: Rendering/runtime not selected.
- Consequences: Compare static/2D/3D options, performance, asset size, animation workflow, accessibility and lower-end Android fallback before implementation.

## ADR-009 — API contract
- Status: Proposed foundation contract
- Decision: Versioned REST under /api/v1, OpenAPI 3.1, bearer authentication for protected learner routes, stable error envelope and server-side ownership checks.
- Consequences: Keep docs/architecture/openapi.yaml aligned with route implementations; add contract validation in CI before release.

## Future ADR template
- ID and title
- Status: Proposed / Accepted / Superseded
- Date and owners
- Context and problem
- Options considered
- Decision
- Consequences and risks
- Validation evidence
- Review date
