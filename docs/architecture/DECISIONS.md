# Architecture Decision Register

This file indexes decisions for Gabenglish. A decision is not final until its status is marked Accepted and its consequences are understood.

## ADR-001 — Mobile application framework
- Status: Proposed
- Decision: React Native + Expo + TypeScript.
- Context: Android is the first release; iOS should reuse the shared codebase.
- Consequences: Validate required audio, background and 3D capabilities on real Android devices before locking packages.

## ADR-002 — Backend platform
- Status: Proposed
- Decision: Node.js + TypeScript modular API.
- Consequences: Domain boundaries and provider adapters must be tested independently.

## ADR-003 — Database
- Status: Proposed
- Decision: PostgreSQL.
- Consequences: Migrations, backups, indexes and ownership rules are part of the foundation.

## ADR-004 — Hosting
- Status: Direction confirmed; workspace pending
- Decision: Dedicated Render environment for Gabenglish.
- Consequences: Do not reuse Ozhzo, Fabnotch or Endroser Render workspaces/resources. The connected account currently exposes no Gabenglish workspace; a dedicated workspace or explicitly approved isolated arrangement is needed before provisioning.

## ADR-005 — Gabroo personality
- Status: Accepted
- Decision: Male voice direction; funny, energetic and friendly; natural Kerala Malayalam with casual slang; playful teasing without insults or humiliation.
- Consequences: Tutor prompts, speech benchmark and QA must enforce this behaviour.

## ADR-006 — Gabroo physical design
- Status: Open
- Decision: Explore kid-style, bigger/adult-style and ageless stylised options; owner approval required.
- Consequences: No final 3D modelling/rigging until one concept is selected and its model sheet approved.

## ADR-007 — AI and speech providers
- Status: Open
- Decision: Benchmark before selection.
- Consequences: Use provider-neutral adapters and a consented Kerala Malayalam evaluation set.

## ADR-008 — Mobile character rendering
- Status: Proposed
- Decision: 3D character direction, runtime not selected.
- Consequences: Compare mobile runtime, performance, asset size, animation workflow and fallback before implementation.

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
