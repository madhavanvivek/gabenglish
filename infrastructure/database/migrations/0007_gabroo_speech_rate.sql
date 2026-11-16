ALTER TABLE user_preferences
  ADD COLUMN gabroo_speech_rate numeric(3,2) NOT NULL DEFAULT 1.00
  CHECK (
    gabroo_speech_rate >= 0.75
    AND gabroo_speech_rate <= 1.50
    AND mod(gabroo_speech_rate * 100, 5) = 0
  );
