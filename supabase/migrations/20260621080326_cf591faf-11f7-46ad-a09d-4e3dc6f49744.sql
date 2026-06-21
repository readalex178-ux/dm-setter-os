-- Defense-in-depth dedup: prevent duplicate prospect rows for the same
-- person on the same platform per user. The extension's save flow already
-- checks-then-updates by handle+platform, but a unique index closes the
-- race window on rapid double-clicks / concurrent saves, and matches the
-- existing dedup pattern used on daily_kpis(user_id, date).
--
-- Partial index (WHERE handle IS NOT NULL) because handle is nullable and
-- we only have a reliable natural key when a handle was actually scraped.
CREATE UNIQUE INDEX IF NOT EXISTS idx_prospects_user_handle_platform_unique
  ON public.prospects (user_id, handle, platform)
  WHERE handle IS NOT NULL;
