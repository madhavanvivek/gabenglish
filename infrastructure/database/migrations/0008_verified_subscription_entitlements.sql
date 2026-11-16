-- Verified, time-bounded Gabenglish paid access.
-- Provider-neutral: no provider is selected and no entitlement is granted by this migration.
-- A paid entitlement must be written only by a future server-side verified payment handler.

ALTER TABLE subscription_plans
  ADD CONSTRAINT subscription_plans_initial_terms_chk
  CHECK (code IN ('monthly','yearly'));

ALTER TABLE regional_prices
  DROP CONSTRAINT regional_prices_billing_interval_check,
  ADD CONSTRAINT regional_prices_initial_terms_chk
    CHECK (billing_interval IN ('month','year')),
  ADD CONSTRAINT regional_prices_inr_only_chk
    CHECK (currency = 'INR');

ALTER TABLE payment_transactions
  ADD COLUMN verified_at timestamptz,
  ADD COLUMN provider_event_id text,
  ADD CONSTRAINT payment_transactions_verified_success_chk
    CHECK (verified_at IS NULL OR status = 'succeeded');

CREATE UNIQUE INDEX payment_transactions_provider_event_uq
  ON payment_transactions(provider_code, provider_event_id)
  WHERE provider_event_id IS NOT NULL;

CREATE TABLE subscription_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
  payment_transaction_id uuid NOT NULL UNIQUE REFERENCES payment_transactions(id) ON DELETE RESTRICT,
  provider_code text NOT NULL,
  provider_event_id text NOT NULL,
  plan_code text NOT NULL CHECK (plan_code IN ('monthly','yearly')),
  currency char(3) NOT NULL CHECK (currency = 'INR'),
  standard_amount_minor bigint NOT NULL CHECK (standard_amount_minor > 0),
  discount_amount_minor bigint NOT NULL DEFAULT 0 CHECK (discount_amount_minor >= 0),
  paid_amount_minor bigint NOT NULL CHECK (paid_amount_minor > 0),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  verified_payment_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (discount_amount_minor <= standard_amount_minor),
  CHECK (paid_amount_minor = standard_amount_minor - discount_amount_minor),
  CHECK (
    (plan_code = 'monthly' AND period_end = period_start + interval '30 days')
    OR
    (plan_code = 'yearly' AND period_end = period_start + interval '360 days')
  ),
  UNIQUE(provider_code, provider_event_id)
);

CREATE INDEX subscription_entitlements_user_period_idx
  ON subscription_entitlements(user_id, period_end DESC);

-- This view is the single read model for paid feature gates. Free reports and
-- basic account routes must not depend on it.
CREATE VIEW active_subscription_entitlements AS
SELECT DISTINCT ON (user_id)
  id, user_id, subscription_id, plan_code, currency,
  standard_amount_minor, discount_amount_minor, paid_amount_minor,
  period_start, period_end, verified_payment_at
FROM subscription_entitlements
WHERE period_start <= now() AND now() < period_end
ORDER BY user_id, period_end DESC, verified_payment_at DESC;
