
-- Categories enum
CREATE TYPE public.memory_category AS ENUM (
  'moment', 'person', 'object', 'place', 'food', 'sound', 'imprint'
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  tier TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Memories table
CREATE TABLE public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category public.memory_category NOT NULL,
  title TEXT,
  note TEXT,
  ai_prompt TEXT,
  ai_answer TEXT,
  photo_url TEXT,
  sentiment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own memories" ON public.memories
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Storage bucket for memory photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('memory-photos', 'memory-photos', true);

CREATE POLICY "Anyone can view memory photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'memory-photos');

CREATE POLICY "Authenticated users upload own photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'memory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'memory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'memory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
