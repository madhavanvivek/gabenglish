# Database Migrations

## Current migrations
- `0001_initial_foundation.sql` establishes the first PostgreSQL schema for identity, preferences, consent, curriculum foundations, lesson progress, assessment attempts, speaking sessions/turns/feedback, vocabulary saves, AI provider usage, subscriptions, regional prices, payments and admin audit foundations.
- `0002_placement_sessions.sql` adds short-lived Gabroo placement sessions, initially as a prototype. Session state and answers are retained only while the assessment is active, with a 30-minute expiry; expired rows are purged when a new session starts.
- `0003_auth_login_throttling.sql` adds a short-retention authentication attempt table. It stores keyed digests of email and request IP rather than raw values; the API prunes entries older than 30 days during sign-in attempts.
- `0004_passwordless_otp.sql` adds passwordless OTP challenge storage (channel, purpose, normalized destination, keyed code digest, IP digest, expiry, attempt count, consumption and delivery state) and a verified-contact registry with uniqueness constraints. The API now implements request/verify logic, but delivery is unavailable until an adapter/provider is configured.
- `0005_placement_owner.sql` adds a learner foreign key to placement sessions. New placement sessions are bound to verified accounts; anonymous placement is disabled and response requests must belong to the authenticated owner.
- `0006_free_diagnostic_reports.sql` stores completed free analysis reports against learner accounts, with a uniqueness constraint per placement session and a user/created-time index. Reports remain accessible without a paid subscription.

## Requirements
- PostgreSQL 15 or later.
- `pgcrypto` extension permission for UUID generation.
- Apply to a new, empty development database first.
- Use the API migration runner (`pnpm --filter @gabenglish/api db:migrate`) in a controlled environment; do not apply production SQL manually from a developer workstation.

## Local review procedure
1. Create a disposable PostgreSQL database.
2. Apply the migration inside a transaction where supported by the migration runner.
3. Inspect tables, constraints, indexes and foreign keys.
4. Run schema-level tests for uniqueness, ownership and restricted deletion behaviour.
5. Test a clean rollback strategy using a disposable database restore; do not improvise destructive down migrations for production data.
6. Record migration checksum and deployment release in the migration ledger.

## Placement session persistence
The API uses PostgreSQL for placement sessions whenever `DATABASE_URL` is configured and the `0002_placement_sessions.sql` migration has been applied. Without a configured database pool, automated tests use the in-memory fallback; that fallback is not restart-safe and must not be used as a production persistence strategy.

The repository now includes a checksum-verified migration runner at `apps/api/src/migrate.ts`. Run it with `DATABASE_URL` set using `pnpm --filter @gabenglish/api db:migrate`. It acquires a PostgreSQL advisory lock, applies each ordered SQL migration in its own transaction, records the filename and SHA-256 checksum in `schema_migrations`, skips unchanged applied migrations, and fails if an already-applied migration file has been modified. Add a new migration instead of editing an applied migration. The runner has PostgreSQL integration coverage for first application and safe re-run. It has not been run against a production Gabenglish database; no production database is provisioned as part of this change.

## Important limitations
This is not yet the complete application schema. It does not include every entity in the logical ERD, all exercise types, media storage workflow, notifications, recommendation evidence, complete admin content authoring, or every subscription entitlement detail. Add these with subsequent reviewed migrations.

The migrations are executed against an ephemeral PostgreSQL 16 service in GitHub Actions. This validates the initial schema and runner in CI only; it does not mean a production database has been provisioned or migrated.


## Verified subscription entitlement ledger — migration 0008

Migration `0008_verified_subscription_entitlements.sql` restricts the initial commercial model to Monthly (30 days) and Yearly (360 days), INR, and adds the verified-payment entitlement ledger and active-entitlement read view. It does not seed plans, prices, transactions or entitlements and does not integrate a payment provider. Entitlement rows must only be created by a future server-side payment verification flow after signed-event and server-to-server verification. Do not expose paid features until server-side entitlement gates are implemented and tested.


## Gabroo native playback tickets — migration 0020

Migration `0020_gabroo_speech_playback_tickets.sql` adds durable, one-time playback tickets for native audio clients. The API creates a cryptographically random 256-bit token, stores only its SHA-256 digest, and keeps the speech text and selected speed in PostgreSQL rather than placing learner text in a URL. Tickets expire after 60 seconds and are consumed atomically by a single GET request; a replay or expired ticket is rejected. The learner's paid entitlement is checked again when audio is requested.

The initial GET endpoint still calls the existing buffered speech provider and sends the completed MP3. This is a compatibility bridge for authenticated native remote playback, **not true progressive TTS streaming**. Incremental provider-to-client streaming, disconnect propagation during response delivery, and physical-device Expo AV validation remain outstanding. Expired ticket rows require periodic cleanup; the API does not yet schedule a production cleanup job.
