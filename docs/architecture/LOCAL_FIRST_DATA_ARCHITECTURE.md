# Gabenglish Local-First Data Architecture

Version 1.0 — implementation direction
Status: approved architecture; storage-driver integration and production migration are pending.

## 1. Principle

The learner's phone is the primary store for personal learning experience data. Gabenglish cloud services support authentication, subscription authority, shared curriculum delivery, AI inference and optional backup/synchronisation. The app must not require a permanent network connection to read already-downloaded learning material or locally saved progress.

This is local-first, cloud-assisted design, not offline-only and not a promise that every feature works without connectivity.

## 2. Data ownership and placement

### Phone-first learner data
- Learner-selected display name, learning direction, language/support preferences and Gabroo speech rate.
- Downloaded lesson content, exercises and learner-created notes.
- Lesson completion, practice attempts, revision queue and locally available progress summaries.
- Conversation history and learner-selected saved conversations, subject to a user-controlled retention policy.
- Placement assessment report and evidence the learner has chosen to retain.
- Pending sync operations and local data schema metadata.

### Secure device storage
- Refresh tokens and other small authentication secrets using platform secure storage.
- Encryption keys, where a supported encrypted database configuration is adopted, protected by the operating system key store.
- Do not put large learner datasets in secure key-value storage.

### Backend-authoritative data
- Account identity and account recovery.
- Subscription status, purchase verification, entitlement and billing records.
- Shared curriculum publication, content versions and catalogue metadata.
- AI model credentials, speech-provider credentials, server policy and model orchestration.
- Abuse prevention, service security and minimal operational audit records.

### Transient processing data
- Microphone recordings and intermediate audio should remain on-device until the learner explicitly starts a speech operation.
- Upload only the audio needed for that operation over TLS after explicit consent.
- Delete temporary recordings and provider intermediates as soon as the operation completes or is cancelled, unless the learner explicitly chooses a clearly explained retention feature.
- Do not retain raw voice recordings by default.

## 3. Storage technology

Use SQLite on the mobile device for structured learner data, with a supported encryption-at-rest strategy selected and validated for the production Expo/Android build. Protect encryption keys with Android Keystore / iOS Keychain via an approved secure-storage integration. Do not invent encryption by merely encoding JSON or relying on app-private file paths.

Use platform secure storage for small secrets only. Use app file storage for downloaded media, with opaque identifiers and a database index; never expose private media through public URLs.

Before enabling production storage, validate Android and iOS release-build database creation/reopen/upgrades, encryption and key-loss behaviour, reinstall behaviour, atomic transactions, crash recovery, low-storage errors, backup policy, account switching/logout isolation and device restore.

## 4. Account and device isolation

Every local record belongs to a stable authenticated account ID. Queries must always scope by account ID. Logout must not reveal the previous learner's data to the next learner on the same phone.

When an account changes: stop active recording/playback/download/sync; flush or safely retain the previous account's pending queue according to user choice; close the previous account context; open only the newly authenticated account namespace; never merge accounts automatically.

Guest-mode data, if supported, must have a separate anonymous namespace and explicit account-linking migration. Do not silently attach one person's guest history to another account.

## 5. Synchronisation

Synchronisation is optional and consent-based. Local writes must succeed without waiting for the network.

Each syncable mutation should carry stable operation ID, account ID, entity type/ID, local revision, timestamps, schema version, sync state and retry metadata.

Use idempotent server operations. Immutable learning events append with stable IDs and deduplicate. Preferences use explicit revisions and visible conflict handling where needed. Lesson downloads use content version/hash. Conversation history syncs only when the learner enables conversation backup. Subscription remains server-authoritative; a local entitlement cache is signed/short-lived and never grants permanent access by itself.

Never upload the entire local database as one sync operation. Sync explicit, minimal records.

## 6. Offline behaviour

Available offline: open cached profile/preferences; continue downloaded lessons/exercises; save attempts, notes and progress locally; review locally available vocabulary/revision items; browse retained conversation history and placement reports; queue eligible sync operations.

Requires connectivity: OTP/login and account recovery; purchase verification and authoritative subscription refresh; first-time downloads and curriculum updates; cloud AI conversation and server speech recognition unless an on-device model is later adopted; cross-device sync and cloud backup.

When offline, distinguish a locally saved action from a cloud-confirmed action. Never show a false successful sync state.

## 7. Privacy, retention and user controls

Provide controls to view local storage/download usage; delete selected conversation history; clear downloaded lessons without deleting progress; export learner-owned records; enable/disable cloud backup and conversation sync separately; delete local data on this device; and request account-level deletion through the account workflow.

Local deletion and account deletion are different actions and must be explained separately. Account deletion must address server-held account, billing and legally retained records according to the published retention policy.

Do not use local learner records for unrelated advertising or sensitive inference. Do not infer age, personality, intelligence or emotional state from voice. Speech-derived learning observations must include evidence modality and uncertainty.

## 8. Data model boundaries

Recommended local tables: learner_preferences, lesson_cache, lesson_progress, practice_attempts, vocabulary_items, revision_schedule, conversation_threads, conversation_messages, placement_reports, downloaded_assets, sync_operations and local_schema_migrations.

Use stable IDs, account ownership, timestamps and explicit schema versions. Store compact structured learning evidence rather than retaining every raw recording or unbounded transcript by default.

## 9. Failure and recovery

A local write failure must be visible; do not report progress as saved when it was not. Use database transactions for multi-record changes. Keep migrations transactional and tested from every supported prior schema. A corrupt cache must be rebuildable from published content and must not destroy learner progress. A failed sync must preserve the local record and retry safely. Key loss must fail closed for encrypted private data; do not silently create a new key and overwrite inaccessible data. Low storage must produce a recoverable message and must not silently delete learner history.

## 10. Delivery sequence

1. Define local data contracts and account-scoped repository interface.
2. Add SQLite and a validated encrypted-at-rest configuration to the Expo SDK version used by this repo.
3. Implement migrations, transactions and account isolation.
4. Move learner preferences and lesson progress to local persistence.
5. Add local lesson cache and offline exercise completion.
6. Add opt-in sync queue with idempotent server endpoints and conflict handling.
7. Add backup, export and deletion controls.
8. Test Android release builds, iOS builds, account switching, offline mode, restore and failure recovery.

## 11. Acceptance criteria

- A learner can complete and revisit downloaded learning activities without internet.
- Local progress survives app restarts and device reboots.
- Two accounts on one device cannot read each other's local records.
- Logout/account switching does not leak cached private data.
- No raw voice recording is retained by default.
- A local save is not represented as cloud-synced until the server confirms it.
- Backup/sync is opt-in and can be revoked.
- The backend remains authoritative for subscriptions and account identity.
- Database encryption and key lifecycle are verified in release builds, not merely assumed from development mode.

## 12. Current implementation boundary

The mobile app currently has learner settings helpers and a secure-storage dependency, but this document does not claim that a SQLite database, encrypted storage, offline-first lesson workflow, sync engine, export or deletion controls are already implemented. Those remain explicit implementation milestones.