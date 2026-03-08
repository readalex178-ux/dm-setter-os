
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Platform enum
CREATE TYPE public.platform_type AS ENUM ('instagram', 'facebook', 'whatsapp');

-- Connected accounts (OAuth tokens from coaches/businesses)
CREATE TABLE public.connected_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform platform_type NOT NULL,
  platform_user_id TEXT NOT NULL,
  platform_username TEXT,
  display_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  page_id TEXT,
  page_access_token TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(platform, platform_user_id)
);

ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

-- For now, single-user tool — allow all for authenticated users
CREATE POLICY "Authenticated users can manage connected accounts"
  ON public.connected_accounts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Prospects table (real persistent data)
CREATE TABLE public.prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connected_account_id UUID REFERENCES public.connected_accounts(id) ON DELETE SET NULL,
  platform platform_type,
  platform_thread_id TEXT,
  name TEXT NOT NULL,
  handle TEXT,
  avatar_url TEXT,
  stage TEXT NOT NULL DEFAULT 'New Lead',
  lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 10),
  call_readiness INTEGER DEFAULT 0 CHECK (call_readiness >= 0 AND call_readiness <= 100),
  intent_level TEXT DEFAULT 'Curious',
  intent_confidence INTEGER DEFAULT 0,
  motivation TEXT,
  motivation_confidence INTEGER DEFAULT 0,
  concerns TEXT,
  concerns_confidence INTEGER DEFAULT 0,
  location TEXT,
  current_job TEXT,
  income_goal TEXT,
  time_availability TEXT,
  source TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  last_contact_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage prospects"
  ON public.prospects FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('prospect', 'setter')),
  content TEXT NOT NULL,
  platform_message_id TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage messages"
  ON public.messages FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_messages_prospect_id ON public.messages(prospect_id);
CREATE INDEX idx_messages_sent_at ON public.messages(sent_at DESC);

-- Daily KPI logs
CREATE TABLE public.daily_kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  dms_sent INTEGER DEFAULT 0,
  dms_received INTEGER DEFAULT 0,
  new_leads INTEGER DEFAULT 0,
  follow_ups_sent INTEGER DEFAULT 0,
  calls_booked INTEGER DEFAULT 0,
  calls_completed INTEGER DEFAULT 0,
  no_shows INTEGER DEFAULT 0,
  conversions_to_qualified INTEGER DEFAULT 0,
  objections_handled INTEGER DEFAULT 0,
  hours_worked NUMERIC(4,1) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage KPIs"
  ON public.daily_kpis FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Timeline events
CREATE TABLE public.timeline_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage timeline events"
  ON public.timeline_events FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_timeline_prospect_id ON public.timeline_events(prospect_id);

-- Triggers for updated_at
CREATE TRIGGER update_connected_accounts_updated_at
  BEFORE UPDATE ON public.connected_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_kpis_updated_at
  BEFORE UPDATE ON public.daily_kpis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
