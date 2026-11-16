# Database Migrations

## Current migrations
- `0001_initial_foundation.sql` establishes the first PostgreSQL schema for identity, preferences, consent, curriculum foundations, lesson progress, assessment attempts, speaking sessions/turns/feedback, vocabulary saves, AI provider usage, subscriptions, regional prices, payments and admin audit foundations.
- `0002_placement_sessions.sql` adds short-lived anonymous Gabroo placement sessions. Session state and answers are retained only while the assessment is active, with a 30-minute expiry; expired rows are purged when a new session starts.

## Requirements
- PostgreSQL 15 or later.
- `pgcrypto` extension permission for UUID generation.
- Apply to a new, empty development database first.
- Use a migration runner in application environments; do not apply production SQL manually from a developer workstation.

## Local review procedure
1. Create a disposable PostgreSQL database.
2. Apply the migration inside a transaction where supported by the migration runner.
3. Inspect tables, constraints, indexes and foreign keys.
4. Run schema-level tests for uniqueness, ownership and restricted deletion behaviour.
5. Test a clean rollback strategy using a disposable database restore; do not improvise destructive down migrations for production data.
6. Record migration checksum and deployment release in the migration ledger.

## Placement session persistence
The API uses PostgreSQL for placement sessions whenever `DATABASE_URL` is configured and the `0002_placement_sessions.sql` migration has been applied. Without a configured database pool, automated tests use the in-memory fallback; that fallback is not restart-safe and must not be used as a production persistence strategy.

Apply migrations in order with the deployment's approved PostgreSQL migration process. There is not yet an automated migration runner or migration ledger in this repository. The SQL has not been applied to a live Gabenglish database, and no production database is provisioned as part of this change.

## Important limitations
This is not yet the complete application schema. It does not include every entity in the logical ERD, all exercise types, media storage workflow, notifications, recommendation evidence, complete admin content authoring, or every subscription entitlement detail. Add these with subsequent reviewed migrations.

The current SQL has not been executed against a live PostgreSQL instance in this documentation step. Treat it as an initial migration candidate until automated migration tests pass. Never claim database deployment from a committed SQL file alone.
