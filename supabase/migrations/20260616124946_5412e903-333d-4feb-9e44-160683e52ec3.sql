-- ===== Training attempts =====
CREATE TABLE public.training_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_name TEXT NOT NULL,
  difficulty TEXT,
  grade TEXT,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  improvements JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_attempts TO authenticated;
GRANT ALL ON public.training_attempts TO service_role;
ALTER TABLE public.training_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own training_attempts" ON public.training_attempts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== Conversation examples (winning DM examples) =====
CREATE TABLE public.conversation_examples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'booking',
  tags TEXT[],
  transcript TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_examples TO authenticated;
GRANT ALL ON public.conversation_examples TO service_role;
ALTER TABLE public.conversation_examples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own conversation_examples" ON public.conversation_examples
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_conversation_examples_updated_at BEFORE UPDATE ON public.conversation_examples
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();