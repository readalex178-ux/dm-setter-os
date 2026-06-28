-- Adds transcript storage to phone_calls so live-listened calls (VoIP /
-- Speakerphone modes) can save what was captured as part of the call record.
ALTER TABLE public.phone_calls
  ADD COLUMN IF NOT EXISTS transcript text;
