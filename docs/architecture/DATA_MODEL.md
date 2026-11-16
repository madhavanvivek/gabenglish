# Gabenglish Initial Data Model

Version 1.0 — logical model; physical schema and migrations follow after review.

## 1. Principles
PostgreSQL transactional source of truth; UUID identifiers; UTC timestamps; ownership enforcement; immutable published content versions; media metadata separate from binaries; provider identifiers isolated; voice retention explicit; constraints and indexes based on query patterns.

## 2. Identity
- users: id, optional email/email_normalized and phone_e164, legacy prototype password hash (to be removed), status, per-channel verification timestamps, timestamps and deletion marker.
- auth_otp_challenges: one-time challenge metadata, keyed code digest, purpose, channel, destination, request IP digest, expiry, attempt/consumption and delivery state. Never store the raw OTP.
- auth_otp_verified_contacts: unique verified email/phone ownership records for future contact linking.
- free_diagnostic_reports: durable, account-owned free report, evidence summary, Gabroo explanation and assessment mode; retained independently of paid subscription status.
- user_profiles: user ID, display name, necessary locale/timezone/profile data.
- user_preferences: support language, learning goal, daily target, correction mode, preferred voice and notification preferences.

Avoid collecting personal information without a defined need.

## 3. Curriculum
proficiency_levels, learning_stages, courses, modules, lessons, lesson_versions, lesson_prerequisites, lesson_progress. Published lesson versions should be immutable; edits create new versions.

## 4. Assessment and exercises
assessments, assessment_versions, assessment_questions, exercises, questions, answer_options, acceptable_answers, exercise_attempts, assessment_attempts. Support multiple valid answers and evaluation notes rather than one rigid expected string.

## 5. Progress
learner_skill_profiles, skill_assessments, skill_history, stage_transition_evidence, recommendation_records. Keep evidence and confidence distinguishable from derived scores; stage advancement must be explainable.

## 6. Vocabulary and revision
vocabulary_items, vocabulary_translations, vocabulary_examples, user_vocabulary, revision_schedules, vocabulary_attempts. Support part of speech, meanings, collocations, examples, audio reference and content version.

## 7. Practice
translation_attempts, listening_activities, listening_attempts, pronunciation_attempts, speaking_sessions, speaking_turns, speaking_feedback. Audio records reference consent and retention policy; prefer transient processing or derived transcripts where raw audio is unnecessary.

## 8. AI and provider usage
tutor_configurations, tutor_configuration_versions, tutor_sessions, tutor_messages, correction_records, provider_registry, ai_usage_records, speech_usage_records. Record model/provider version, latency, token/audio quantity, outcome and cost estimate. Avoid unnecessary sensitive prompt payloads.

## 9. Media
audio_assets, media_metadata, recording_consents, media_retention_jobs. Store object key, MIME type, duration, checksum, ownership, consent state and expiry. Do not expose permanent public URLs for private audio.

## 10. Commercial and administration
subscription_plans, regional_prices, subscriptions, payment_transactions, payment_webhook_events, entitlements, admin_users, admin_roles, audit_logs, feature_flags, support_requests. Webhook processing must be idempotent and signature-verified.

## 11. Relationships
One user has a profile/preferences; stages contain courses, courses modules, modules versioned lessons; users have progress and attempts; users have speaking sessions with ordered turns; each placement session belongs to one verified user and is inaccessible to other accounts; vocabulary items are saved by many users; subscriptions reference plans and regional prices; AI usage references session/provider config where appropriate.

## 12. Index candidates
Unique normalised email/phone where present; unique user+lesson progress; user+created time for attempts; unique session+turn sequence; user+due time for revisions; user+status for subscriptions; unique provider webhook event ID.

Define cascade/restrict behaviour explicitly. Avoid accidental deletion of financial audit records.

## 13. Implemented schema migrations

`0001_initial_foundation.sql` creates the initial domain schema; `0002_placement_sessions.sql` adds short-lived placement sessions; `0003_auth_login_throttling.sql` adds legacy sign-in throttling; `0004_passwordless_otp.sql` adds OTP challenge and verified-contact tables; `0005_placement_owner.sql` associates placement sessions with learner accounts; `0006_free_diagnostic_reports.sql` persists free analysis reports for later retrieval; `0007_gabroo_speech_rate.sql` stores the learner-controlled Gabroo playback-rate preference; `0008_verified_subscription_entitlements.sql` constrains the initial commercial model to monthly/yearly INR plans and adds a verified-payment entitlement ledger/read view. The physical schema is still incomplete relative to the logical model above.

## 14. Next deliverables
ER diagram; PostgreSQL DDL/migrations; constraints/index plan; data classification/retention matrix; seed strategy; migration and rollback strategy.
