ALTER TABLE public.daily_kpis DROP CONSTRAINT IF EXISTS daily_kpis_date_key;
ALTER TABLE public.daily_kpis ADD CONSTRAINT daily_kpis_user_date_key UNIQUE (user_id, date);