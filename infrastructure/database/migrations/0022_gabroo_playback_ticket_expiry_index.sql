-- Keep bounded expired-ticket cleanup efficient as the ticket ledger grows.
CREATE INDEX gabroo_speech_playback_tickets_expires_at_idx
  ON gabroo_speech_playback_tickets(expires_at);
