# Gabroo Approved Visual Asset Manifest

Status: source identified and checksum verified; repository import is still pending.

## Canonical visual reference

- Product: Gabenglish
- Character: Concept C — Signature Gabroo
- Approval/version: Gabenglish Branding Kit Version 2; selected character reference.
- Source file: `Meet Gabroo: Signature AI English Buddy.png`
- Source location: owner-provided ChatGPT Library file (original file, not a generated replacement).
- Format: PNG, RGB, 1536 × 1024 pixels.
- File size: 2,102,719 bytes.
- SHA-256: `9c821414251f0b8445cc36a5a2725e5c1c368077fc4e1bdc22b43b1b6943076b`
- Verification: original file bytes were materialized and inspected; checksum calculated from those bytes on 2026-11-18.

## What the reference contains

The selected sheet shows the same approved character in:
- front, three-quarter front, side, three-quarter back and back turnaround views;
- happy, teasing/funny, surprised, thinking, encouraging, listening, excited and winking expressions;
- explain, teach, chat and encourage action poses;
- approved purple cap, purple hoodie with G mark, white shirt, headphones, khaki cargo trousers and purple/white footwear details.

This is a composite character reference sheet. It is **not** a layered source project, a clean isolated transparent mascot export, a production 3D mesh, a rig, a texture set or an animation package. The sheet may guide faithful modelling, but it must not be cropped/reconstructed into a different-looking replacement and represented as a production model.

## Repository handling

- Keep this manifest version-controlled.
- The source image itself has not yet been committed to the repository; the available GitHub file-write integration accepts UTF-8 text and cannot safely upload the original binary image unchanged.
- Do not create a base64 text file and call it an imported image.
- When binary asset upload is available, commit this exact PNG byte-for-byte under `apps/mobile/assets/character/source/` or a dedicated immutable asset location, then recompute SHA-256 from the committed bytes and confirm it matches this manifest.
- Preserve the source as read-only. Any derived model sheet, transparent export, mesh, rig, texture or animation must record the source checksum and its own version.
- The production 3D model still requires explicit owner comparison/sign-off against this exact reference.

## Release gate

Repository asset import, source checksum verification after upload, production 3D modelling, owner visual sign-off, rigging and device validation remain separate gates. Identifying and hashing the reference does not mean those gates have passed.
