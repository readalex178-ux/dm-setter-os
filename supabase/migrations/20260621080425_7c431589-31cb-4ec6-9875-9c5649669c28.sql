-- Add a profile_url column so prospects (scraped via the Chrome extension,
-- imported from another CRM, or added manually) can carry a direct link to
-- their actual profile on whatever platform they're on. Nullable since a
-- predictable URL pattern doesn't exist for every platform (e.g. whatsapp),
-- and existing rows have no value to backfill.
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS profile_url TEXT;
