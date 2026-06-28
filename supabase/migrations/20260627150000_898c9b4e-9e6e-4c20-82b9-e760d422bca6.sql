-- Rate limiting for AI-backed Edge Functions: tracks recent calls per user per function.
-- RLS is enabled with zero client-facing policies on purpose, so only the service-role
-- key (used inside Edge Functions) can read/write this table.
CREATE TABLE public.rate_limit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fn_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limit_events_user_fn_time
  ON public.rate_limit_events (user_id, fn_name, created_at);

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;
