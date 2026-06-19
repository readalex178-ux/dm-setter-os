-- The Chrome extension's content script (extension/scraper.js) supports
-- scraping conversations from Instagram, TikTok, Twitter/X, Facebook, and
-- LinkedIn, and sends platform: "tiktok" / "twitter" / "linkedin" when
-- saving a prospect to the CRM. The platform_type enum was only ever
-- created with ('instagram', 'facebook', 'whatsapp') plus a later
-- 'hubspot' addition — it never included tiktok, twitter, or linkedin,
-- so saving a prospect scraped from any of those three platforms failed
-- with: invalid input value for enum platform_type: "tiktok" (Postgres 22P02).
ALTER TYPE public.platform_type ADD VALUE IF NOT EXISTS 'tiktok';
ALTER TYPE public.platform_type ADD VALUE IF NOT EXISTS 'twitter';
ALTER TYPE public.platform_type ADD VALUE IF NOT EXISTS 'linkedin';
