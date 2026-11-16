-- Gabenglish initial PostgreSQL foundation schema
-- Migration: 0001_initial_foundation
-- PostgreSQL 15+
-- This is a deliberately small, executable foundation. Extend with reviewed migrations.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  email_normalized text,
  phone_e164 text,
  password_hash text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','suspended','deletion_requested','deleted')),
  email_verified_at timestamptz,
  phone_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (email IS NOT NULL OR phone_e164 IS NOT NULL)
);
CREATE UNIQUE INDEX users_email_normalized_uq ON users(email_normalized) WHERE email_normalized IS NOT NULL;
CREATE UNIQUE INDEX users_phone_e164_uq ON users(phone_e164) WHERE phone_e164 IS NOT NULL;

CREATE TABLE user_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name text,
  locale text NOT NULL DEFAULT 'ml-IN',
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  support_language text NOT NULL DEFAULT 'ml'
    CHECK (support_language IN ('ml','en')),
  learning_goal text,
  correction_mode text NOT NULL DEFAULT 'balanced'
    CHECK (correction_mode IN ('gentle','balanced','detailed')),
  daily_target_minutes integer NOT NULL DEFAULT 10 CHECK (daily_target_minutes BETWEEN 1 AND 240),
  reduced_motion boolean NOT NULL DEFAULT false,
  reminders_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE refresh_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE INDEX refresh_sessions_user_active_idx ON refresh_sessions(user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL,
  policy_version text NOT NULL,
  granted boolean NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX consent_records_user_purpose_idx ON consent_records(user_id, purpose, captured_at DESC);

CREATE TABLE proficiency_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  sort_order integer NOT NULL UNIQUE
);

CREATE TABLE learning_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proficiency_level_id uuid REFERENCES proficiency_levels(id) ON DELETE RESTRICT,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_stage_id uuid NOT NULL REFERENCES learning_stages(id) ON DELETE RESTRICT,
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived'))
);

CREATE TABLE modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE(course_id, sort_order)
);

CREATE TABLE lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE RESTRICT,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  current_published_version_id uuid,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  UNIQUE(module_id, sort_order)
);

CREATE TABLE lesson_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
  version_number integer NOT NULL CHECK (version_number > 0),
  content jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','retired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE(lesson_id, version_number),
  UNIQUE(lesson_id, id)
);
ALTER TABLE lessons
  ADD CONSTRAINT lessons_current_version_fk
  FOREIGN KEY (id, current_published_version_id)
  REFERENCES lesson_versions(lesson_id, id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
  lesson_version_id uuid NOT NULL REFERENCES lesson_versions(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','in_progress','completed')),
  progress_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);
CREATE INDEX lesson_progress_user_status_idx ON lesson_progress(user_id, status);

CREATE TABLE assessment_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  version_number integer NOT NULL CHECK (version_number > 0),
  content jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','retired')),
  published_at timestamptz,
  UNIQUE(code, version_number)
);

CREATE TABLE assessment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_version_id uuid NOT NULL REFERENCES assessment_versions(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'started' CHECK (status IN ('started','submitted','evaluated','abandoned')),
  result jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX assessment_attempts_user_created_idx ON assessment_attempts(user_id, started_at DESC);

CREATE TABLE speaking_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'free_practice',
  correction_mode text NOT NULL DEFAULT 'balanced'
    CHECK (correction_mode IN ('gentle','balanced','detailed')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','abandoned')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
CREATE INDEX speaking_sessions_user_started_idx ON speaking_sessions(user_id, started_at DESC);

CREATE TABLE speaking_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES speaking_sessions(id) ON DELETE CASCADE,
  sequence_number integer NOT NULL CHECK (sequence_number > 0),
  input_text text,
  output_text text,
  input_language text,
  output_language text,
  provider_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, sequence_number)
);

CREATE TABLE speaking_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  speaking_turn_id uuid NOT NULL REFERENCES speaking_turns(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('grammar','naturalness','vocabulary','pronunciation','register','clarity')),
  original_text text,
  suggested_text text,
  explanation_ml text,
  severity text NOT NULL DEFAULT 'suggestion' CHECK (severity IN ('note','suggestion','important')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vocabulary_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL,
  normalized_term text NOT NULL,
  part_of_speech text,
  level_code text,
  meaning_ml text,
  meaning_en text,
  pronunciation_hint text,
  audio_asset_key text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  UNIQUE(normalized_term)
);

CREATE TABLE user_vocabulary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vocabulary_item_id uuid NOT NULL REFERENCES vocabulary_items(id) ON DELETE RESTRICT,
  saved_at timestamptz NOT NULL DEFAULT now(),
  mastery_score numeric(5,2) NOT NULL DEFAULT 0 CHECK (mastery_score BETWEEN 0 AND 100),
  next_review_at timestamptz,
  UNIQUE(user_id, vocabulary_item_id)
);
CREATE INDEX user_vocabulary_due_idx ON user_vocabulary(user_id, next_review_at) WHERE next_review_at IS NOT NULL;

CREATE TABLE ai_provider_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code text NOT NULL,
  capability text NOT NULL CHECK (capability IN ('chat','stt','tts','evaluation','embedding')),
  model_code text NOT NULL,
  config_version integer NOT NULL CHECK (config_version > 0),
  enabled boolean NOT NULL DEFAULT false,
  non_secret_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider_code, capability, config_version)
);

CREATE TABLE ai_usage_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  speaking_session_id uuid REFERENCES speaking_sessions(id) ON DELETE SET NULL,
  provider_config_id uuid REFERENCES ai_provider_configs(id) ON DELETE SET NULL,
  capability text NOT NULL,
  latency_ms integer CHECK (latency_ms >= 0),
  input_units numeric(14,3),
  output_units numeric(14,3),
  estimated_cost numeric(14,6),
  outcome text NOT NULL CHECK (outcome IN ('success','failure','timeout','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_created_idx ON ai_usage_records(created_at DESC);
CREATE INDEX ai_usage_user_created_idx ON ai_usage_records(user_id, created_at DESC);

CREATE TABLE subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  entitlements jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE regional_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  country_code char(2) NOT NULL,
  currency char(3) NOT NULL,
  billing_interval text NOT NULL CHECK (billing_interval IN ('month','six_months','year')),
  amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
  active boolean NOT NULL DEFAULT true,
  UNIQUE(plan_id, country_code, billing_interval)
);

CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  regional_price_id uuid REFERENCES regional_prices(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('pending','trialing','active','past_due','cancelled','expired')),
  provider_subscription_ref text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subscriptions_user_status_idx ON subscriptions(user_id, status);

CREATE TABLE payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE RESTRICT,
  provider_code text NOT NULL,
  provider_payment_ref text,
  amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
  currency char(3) NOT NULL,
  status text NOT NULL CHECK (status IN ('initiated','pending','succeeded','failed','refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider_code, provider_payment_ref)
);

CREATE TABLE payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code text NOT NULL,
  provider_event_id text NOT NULL,
  payload_digest text NOT NULL,
  processed_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider_code, provider_event_id)
);

CREATE TABLE admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL
);

CREATE TABLE admin_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_normalized text NOT NULL UNIQUE,
  password_hash text,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_account_roles (
  admin_account_id uuid NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  admin_role_id uuid NOT NULL REFERENCES admin_roles(id) ON DELETE RESTRICT,
  PRIMARY KEY(admin_account_id, admin_role_id)
);

CREATE TABLE admin_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_account_id uuid REFERENCES admin_accounts(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  request_id text,
  details_redacted jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_audit_created_idx ON admin_audit_events(created_at DESC);
