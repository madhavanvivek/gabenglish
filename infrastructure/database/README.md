# Database Migrations

## Current migration
`0001_initial_foundation.sql` establishes the first PostgreSQL schema for identity, preferences, consent, curriculum foundations, lesson progress, assessment attempts, speaking sessions/turns/feedback, vocabulary saves, AI provider usage, subscriptions, regional prices, payments and admin audit foundations.

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

## Important limitations
This is not yet the complete application schema. It does not include every entity in the logical ERD, all exercise types, media storage workflow, notifications, recommendation evidence, complete admin content authoring, or every subscription entitlement detail. Add these with subsequent reviewed migrations.

The current SQL has not been executed against a live PostgreSQL instance in this documentation step. Treat it as an initial migration candidate until automated migration tests pass. Never claim database deployment from a committed SQL file alone.
