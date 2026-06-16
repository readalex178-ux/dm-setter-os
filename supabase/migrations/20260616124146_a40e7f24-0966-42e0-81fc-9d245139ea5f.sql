-- ===== ICP profiles =====
CREATE TABLE public.icp_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Ideal Client',
  is_active BOOLEAN NOT NULL DEFAULT true,
  demographics TEXT,
  goals TEXT,
  pains TEXT,
  buying_triggers TEXT,
  objections_common TEXT,
  language_patterns TEXT,
  where_they_hang_out TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.icp_profiles TO authenticated;
GRANT ALL ON public.icp_profiles TO service_role;
ALTER TABLE public.icp_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own icp_profiles" ON public.icp_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_icp_profiles_updated_at BEFORE UPDATE ON public.icp_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Objection bible =====
CREATE TABLE public.objection_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'price',
  objection TEXT NOT NULL,
  framework TEXT,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.objection_entries TO authenticated;
GRANT ALL ON public.objection_entries TO service_role;
ALTER TABLE public.objection_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own objection_entries" ON public.objection_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_objection_entries_updated_at BEFORE UPDATE ON public.objection_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== FAQ database =====
CREATE TABLE public.faq_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faq_entries TO authenticated;
GRANT ALL ON public.faq_entries TO service_role;
ALTER TABLE public.faq_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own faq_entries" ON public.faq_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_faq_entries_updated_at BEFORE UPDATE ON public.faq_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Scripts library (moved to DB) =====
CREATE TABLE public.scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'opener',
  body TEXT NOT NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scripts TO authenticated;
GRANT ALL ON public.scripts TO service_role;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own scripts" ON public.scripts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_scripts_updated_at BEFORE UPDATE ON public.scripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Wins & Losses =====
CREATE TABLE public.win_loss_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL DEFAULT 'win',
  prospect_name TEXT,
  summary TEXT,
  lesson TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.win_loss_logs TO authenticated;
GRANT ALL ON public.win_loss_logs TO service_role;
ALTER TABLE public.win_loss_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own win_loss_logs" ON public.win_loss_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_win_loss_logs_updated_at BEFORE UPDATE ON public.win_loss_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();