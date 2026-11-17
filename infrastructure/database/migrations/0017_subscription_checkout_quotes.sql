-- Short-lived, server-created subscription price quotes.
-- Quotes are not payment intents and do not grant paid access.

CREATE TABLE subscription_checkout_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_code text NOT NULL CHECK (plan_code IN ('monthly','yearly')),
  currency char(3) NOT NULL CHECK (currency = 'INR'),
  standard_amount_minor bigint NOT NULL CHECK (standard_amount_minor > 0),
  discount_amount_minor bigint NOT NULL CHECK (discount_amount_minor >= 0),
  payable_amount_minor bigint NOT NULL CHECK (payable_amount_minor > 0),
  discount_basis_points integer NOT NULL CHECK (discount_basis_points >= 0 AND discount_basis_points < 10000),
  offer_version integer NOT NULL CHECK (offer_version > 0),
  quoted_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (payable_amount_minor = standard_amount_minor - discount_amount_minor),
  CHECK (expires_at > quoted_at)
);

CREATE INDEX subscription_checkout_quotes_user_recent_idx
  ON subscription_checkout_quotes(user_id, created_at DESC);

CREATE INDEX subscription_checkout_quotes_expiry_idx
  ON subscription_checkout_quotes(expires_at);

COMMENT ON TABLE subscription_checkout_quotes IS
  'Immutable, short-lived server-side price quotes. A quote alone never creates a payment or paid entitlement.';


CREATE FUNCTION reject_subscription_checkout_quote_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Subscription checkout quotes are immutable';
END;
$$;

CREATE TRIGGER subscription_checkout_quotes_immutable
  BEFORE UPDATE ON subscription_checkout_quotes
  FOR EACH ROW EXECUTE FUNCTION reject_subscription_checkout_quote_update();
