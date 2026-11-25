-- Keep at most one unconsumed playback ticket per learner.
-- Older duplicate tickets are invalidated before enforcing the invariant.
WITH ranked AS (
  SELECT
    ctid AS row_id,
    row_number() OVER (
      PARTITION BY user_id
      ORDER BY created_at DESC, token_digest DESC
    ) AS position
  FROM gabroo_speech_playback_tickets
  WHERE consumed_at IS NULL
)
UPDATE gabroo_speech_playback_tickets AS tickets
SET consumed_at = now()
FROM ranked
WHERE tickets.ctid = ranked.row_id
  AND ranked.position > 1;

CREATE UNIQUE INDEX gabroo_speech_playback_tickets_one_unconsumed_per_user_idx
  ON gabroo_speech_playback_tickets(user_id)
  WHERE consumed_at IS NULL;

