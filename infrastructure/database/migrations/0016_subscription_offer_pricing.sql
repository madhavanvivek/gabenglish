-- Persist the active Superadmin-controlled offer rules and immutable checkout price snapshots.
-- No payment provider is selected or enabled by this migration.

CREATE TABLE subscription_offer_rules (
  plan_code text PRIMARY KEY CHECK (plan_code IN ('monthly','yearly')),
  currency char(3) NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  standard_amount_minor bigint NOT NULL CHECK (standard_amount_minor > 0),
  discount_basis_points integer NOT NULL DEFAULT 0
    CHECK (discount_basis_points >= 0 AND discount_basis_points < 10000),
  enabled boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_admin_id uuid REFERENCES admin_accounts(id) ON DELETE SET NULL,
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at),
  CHECK (
    (plan_code = 'monthly' AND standard_amount_minor = 9900)
    OR
    (plan_code = 'yearly' AND standard_amount_minor = 118800)
  )
);

INSERT INTO subscription_offer_rules
  (plan_code, standard_amount_minor, discount_basis_points, enabled, version)
VALUES
  ('monthly', 9900, 2020, true, 1),
  ('yearly', 118800, 3274, true, 1);

ALTER TABLE payment_transactions
  ADD COLUMN price_standard_amount_minor bigint,
  ADD COLUMN price_discount_amount_minor bigint,
  ADD COLUMN price_discount_basis_points integer,
  ADD COLUMN price_offer_version integer,
  ADD COLUMN price_quoted_at timestamptz;

ALTER TABLE payment_transactions
  ADD CONSTRAINT payment_transactions_price_snapshot_complete_chk
  CHECK (
    (
      price_standard_amount_minor IS NULL
      AND price_discount_amount_minor IS NULL
      AND price_discount_basis_points IS NULL
      AND price_offer_version IS NULL
      AND price_quoted_at IS NULL
    )
    OR
    (
      price_standard_amount_minor > 0
      AND price_discount_amount_minor >= 0
      AND price_discount_amount_minor <= price_standard_amount_minor
      AND price_discount_basis_points >= 0
      AND price_discount_basis_points < 10000
      AND price_offer_version > 0
      AND price_quoted_at IS NOT NULL
      AND amount_minor = price_standard_amount_minor - price_discount_amount_minor
    )
  );

COMMENT ON TABLE subscription_offer_rules IS
  'Server-controlled current offer rules. Every change must increment version; completed payment snapshots are immutable.';
COMMENT ON COLUMN payment_transactions.price_quoted_at IS
  'Server timestamp at which the immutable checkout price snapshot was calculated.';
