-- Passwordless OTP challenge storage. Plaintext OTP values must never be persisted.
CREATE TABLE auth_otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email','phone')),
  destination_normalized text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('signup_signin','contact_link')),
  code_digest char(64) NOT NULL,
  request_ip_digest char(64) NOT NULL,
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 5),
  max_attempts smallint NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 5),
  delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending','sent','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '5 minutes',
  consumed_at timestamptz,
  CHECK ((purpose = 'signup_signin' AND user_id IS NULL) OR (purpose = 'contact_link' AND user_id IS NOT NULL))
);
CREATE INDEX auth_otp_destination_created_idx ON auth_otp_challenges(channel, destination_normalized, created_at DESC);
CREATE INDEX auth_otp_ip_created_idx ON auth_otp_challenges(request_ip_digest, created_at DESC);
CREATE INDEX auth_otp_expiry_idx ON auth_otp_challenges(expires_at) WHERE consumed_at IS NULL;

CREATE TABLE auth_otp_verified_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email','phone')),
  destination_normalized text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel, destination_normalized),
  UNIQUE(user_id, channel)
);
CREATE INDEX auth_otp_verified_contacts_user_idx ON auth_otp_verified_contacts(user_id);
