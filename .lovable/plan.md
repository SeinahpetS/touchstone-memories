

# Touchstone MVP — Build Plan

## Phase 1: Design System

Update `index.css` and `tailwind.config.ts` with the Touchstone palette, typography, and tokens.

- **Google Fonts**: Import Playfair Display (serif) and Source Sans 3 (sans-serif) in `index.html`
- **CSS variables** in `index.css`: Convert all hex values to HSL for Tailwind compatibility
  - Background: `#F2EEE5`, Card: `#E8E4D8`, Ink: `#2C3E50`, Espresso: `#5B4A3F`
  - Gold: `#B8860B`, Plum: `#8B3A62`, Terracotta: `#C2714F`, Malachite: `#2E7D5E`, Blueprint: `#4A6B8A`
- **tailwind.config.ts**: Add custom color tokens (`ivory`, `card`, `ink`, `espresso`, `gold`, `plum`, `terracotta`, `malachite`, `blueprint`) and font families (`playfair`, `source`)
- **Base styles**: 16px minimum body text, generous spacing defaults
- Remove `src/App.css` (unused boilerplate)

## Phase 2: Database Schema

Create via migration tool:

```sql
-- Categories enum
CREATE TYPE public.memory_category AS ENUM (
  'moment', 'person', 'object', 'place', 'food', 'sound', 'imprint'
);

-- Profiles table (public mirror of auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Users can read/update only their own profile
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
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
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
  category memory_category NOT NULL,
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
```

**Storage bucket**: Create `memory-photos` bucket (public read, authenticated upload) for photo storage.

## Phase 3: Auth

- Create `src/pages/Auth.tsx` — simple sign-up / sign-in page with email + Google OAuth
- Add auth route to `App.tsx`
- Create `src/hooks/useAuth.ts` for session management
- Protect capture flow behind auth (redirect to `/auth` if not signed in)

## Phase 4: Capture Flow (Index Page)

Build the single-screen capture loop as the home page:

- **Wordmark component** — "TOUCHSTONE" in Playfair Display, small caps, letter-spaced, `#2C3E50`
- **Prompt card** — One hardcoded gentle prompt displayed in Playfair Display
- **Photo upload** — File picker with camera capture support on mobile, uploads to storage bucket
- **Category selector** — 3 active (Moment, Object, Person) + 4 coming-soon with disabled state
- **Title input** — Optional, placeholder text encouraging but not demanding
- **Note textarea** — Freeform, generous sizing
- **Sentiment pill** — Optional row of pill buttons (safe, complicated, like home, like loss, like freedom)
- **Save button** — Gold `#B8860B`, large tap target, full width on mobile
- **Confirmation view** — After save, show the memory artifact: full-bleed photo, 6px category stripe, title, date, note, warm message

## Phase 5: Archive View

- **Archive page** (`/archive`) — Grid of memory cards, most recent first
- **Category filter** — Horizontal pill filters
- **Memory card** — Photo thumbnail, title, date, 6px top stripe in category color
- **Tap to open** — Full artifact view

## Files Created/Modified

| File | Action |
|------|--------|
| `index.html` | Add Google Fonts links, PWA meta tags |
| `src/index.css` | Replace with Touchstone design tokens |
| `tailwind.config.ts` | Add custom colors, fonts |
| `src/App.css` | Delete |
| `src/App.tsx` | Add routes for `/auth`, `/archive` |
| `src/pages/Index.tsx` | Capture flow |
| `src/pages/Auth.tsx` | New — sign in/up |
| `src/pages/Archive.tsx` | New — memory grid |
| `src/components/Wordmark.tsx` | New |
| `src/components/PromptCard.tsx` | New |
| `src/components/PhotoUpload.tsx` | New |
| `src/components/CategorySelector.tsx` | New |
| `src/components/SentimentPill.tsx` | New |
| `src/components/MemoryArtifact.tsx` | New |
| `src/components/MemoryCard.tsx` | New |
| `src/hooks/useAuth.ts` | New |
| Migration SQL | Profiles, memories tables, RLS, trigger, storage bucket |

## Design Rules Enforced
- No shadows, no gradients — flat clean surfaces
- Minimum 16px body text, large tap targets
- Art deco warmth: Playfair Display headings, geometric but quiet
- Artifact is a rendered object, never a form
- Category stripe: 6px top border in category color on every card

