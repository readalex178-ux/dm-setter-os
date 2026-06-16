-- Indexes for per-user performance
CREATE INDEX IF NOT EXISTS idx_prospects_user_id ON public.prospects(user_id);
CREATE INDEX IF NOT EXISTS idx_prospects_stage ON public.prospects(stage);
CREATE INDEX IF NOT EXISTS idx_prospects_last_contact_at ON public.prospects(last_contact_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_prospect_sent ON public.messages(prospect_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_kpis_user_date ON public.daily_kpis(user_id, date DESC);

-- AI conversation-scoring fields on prospects
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS conversation_score INTEGER,
  ADD COLUMN IF NOT EXISTS booking_probability INTEGER,
  ADD COLUMN IF NOT EXISTS lead_temperature TEXT,
  ADD COLUMN IF NOT EXISTS stage_confidence INTEGER,
  ADD COLUMN IF NOT EXISTS stage_suggested TEXT,
  ADD COLUMN IF NOT EXISTS suggested_action TEXT,
  ADD COLUMN IF NOT EXISTS last_scored_at TIMESTAMPTZ;

-- Prospect memory table
CREATE TABLE IF NOT EXISTS public.prospect_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  detail TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_memory TO authenticated;
GRANT ALL ON public.prospect_memory TO service_role;

ALTER TABLE public.prospect_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own prospect memory"
  ON public.prospect_memory FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_prospect_memory_prospect ON public.prospect_memory(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_memory_user ON public.prospect_memory(user_id);

CREATE TRIGGER update_prospect_memory_updated_at
  BEFORE UPDATE ON public.prospect_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();