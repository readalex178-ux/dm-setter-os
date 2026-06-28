-- Phone Setting: adds phone-calling fields to prospects, plus two new tables
-- for call history (debrief log) and commission tracking. Purely additive —
-- no existing columns/tables are modified or dropped.

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS phone_stage text NOT NULL DEFAULT 'New Lead',
  ADD COLUMN IF NOT EXISTS in_call_notes text,
  ADD COLUMN IF NOT EXISTS pre_call_brief jsonb,
  ADD COLUMN IF NOT EXISTS pre_call_brief_generated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_prospects_phone_stage ON public.prospects (phone_stage);

-- Call history / post-call debrief log -------------------------------------
CREATE TABLE IF NOT EXISTS public.phone_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  outcome text NOT NULL,
  notes text,
  duration_minutes numeric,
  ai_summary text,
  ai_next_step text,
  ai_follow_up_message text,
  called_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_calls_user_id ON public.phone_calls (user_id);
CREATE INDEX IF NOT EXISTS idx_phone_calls_prospect_id ON public.phone_calls (prospect_id);
CREATE INDEX IF NOT EXISTS idx_phone_calls_called_at ON public.phone_calls (called_at DESC);

ALTER TABLE public.phone_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own phone_calls"
  ON public.phone_calls
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_phone_calls_updated_at
  BEFORE UPDATE ON public.phone_calls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Commission tracker ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.phone_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  phone_call_id uuid REFERENCES public.phone_calls(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  booked_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_commissions_user_id ON public.phone_commissions (user_id);
CREATE INDEX IF NOT EXISTS idx_phone_commissions_status ON public.phone_commissions (status);
CREATE INDEX IF NOT EXISTS idx_phone_commissions_prospect_id ON public.phone_commissions (prospect_id);

ALTER TABLE public.phone_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own phone_commissions"
  ON public.phone_commissions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_phone_commissions_updated_at
  BEFORE UPDATE ON public.phone_commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
