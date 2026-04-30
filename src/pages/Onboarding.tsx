import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import CategoryIcon, {
  CATEGORY_BORDER_COLORS,
  CATEGORY_LABELS,
  CategoryIconCard,
  type CategoryKey,
} from "@/components/CategoryIcon";
import PhotoUpload from "@/components/PhotoUpload";
import MemoryDateInput from "@/components/MemoryDateInput";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import { emptyMemoryDate, formatMemoryDate, type MemoryDate } from "@/lib/memoryDate";
import {
  clearOnboardingDraft,
  emptyOnboardingDraft,
  getOnboardingPhoto,
  loadOnboardingDraft,
  saveOnboardingDraft,
  setOnboardingPhoto,
  type OnboardingDraft,
} from "@/lib/onboardingDraft";

type Step =
  | "splash"
  | "definition"
  | "category"
  | "time"
  | "title"
  | "relationship"
  | "who"
  | "emotional"
  | "map"
  | "photo"
  | "details"
  | "date"
  | "artifact"
  | "signup";

// Steps that show the slim gold progress bar at the top of the screen,
// in the order users encounter them. Splash, definition, category, time
// and artifact are intentionally excluded per spec — the bar appears
// from the Title screen (S3) onward. The conditional "who" screen (S4b)
// is also excluded so the bar visually HOLDS its position there.
const PROGRESS_STEPS: Step[] = ["title", "relationship", "emotional", "map", "photo", "details", "date", "signup"];

// Per-category copy for the Emotional Location screen (S5).
const EMOTIONAL_HEADLINES: Partial<Record<CategoryKey, string>> = {
  object: "Where does this belong?",
  moment: "Where did this happen?",
  place: "Describe it in a few words.",
  food: "Where does this take you?",
};

const EMOTIONAL_EXAMPLES: Partial<Record<CategoryKey, string[]>> = {
  object: ["Her kitchen", "The garage", "It moved around with us"],
  moment: ["A campsite we found by accident", "Our kitchen at 2am"],
  place: ["Small, always smelled like coffee", "Loud and full of people"],
  food: ["Her kitchen on a Sunday", "A restaurant I can't find anymore"],
};

// Per-category copy for the When screen (S7).
const WHEN_HEADLINES: Record<CategoryKey, string> = {
  object: "When did this enter your life?",
  moment: "When did this happen?",
  place: "When were you there?",
  food: "When did you first have this?",
  person: "When did they come into your life?",
  sound: "When did you first hear this?",
  imprint: "When did this find you?",
};

const WHEN_EXAMPLES: Record<CategoryKey, string[]> = {
  object: [
    "Summer 1987",
    "June 12, 1994",
    "I was about nine",
    "It was always just there",
  ],
  moment: ["August 2003", "I was twelve", "More recently than it feels"],
  place: [
    "Every summer until I was sixteen",
    "Just once, but it stayed with me",
  ],
  food: [
    "Every Sunday growing up",
    "Once, and I've been chasing it since",
  ],
  person: ["When I was a kid", "A few years ago"],
  sound: ["Every morning growing up", "Just one summer"],
  imprint: ["A long time ago", "I was around fifteen"],
};

// Per-category copy for the Photo screen (S8).
const PHOTO_HEADLINES: Record<CategoryKey, string> = {
  object: "Do you have a photo of this?",
  moment: "Do you have a photo from this moment?",
  place: "Do you have a photo of this place?",
  food: "Do you have a photo of this?",
  person: "Do you have a photo of them?",
  sound: "Do you have an image that goes with this?",
  imprint: "Do you have a photo for this?",
};

const PHOTO_SUBCOPY: Record<CategoryKey, string> = {
  object: "Even a photo of a photo is perfect. You can always add one later.",
  moment: "It doesn't have to be perfect.",
  place: "Even an old one works.",
  food: "A recipe card, a dish, a place — anything counts.",
  person: "Any photo you have. Skip if you'd rather not.",
  sound: "Optional — anything that captures the feeling.",
  imprint: "Optional. Add one later if you'd like.",
};

// Object leads with camera; everything else leads with library.
const PHOTO_BUTTON_ORDER: Record<CategoryKey, ("camera" | "library")[]> = {
  object: ["camera", "library"],
  moment: ["library", "camera"],
  place: ["library", "camera"],
  food: ["library", "camera"],
  person: ["library", "camera"],
  sound: ["library", "camera"],
  imprint: ["library", "camera"],
};
const RELATIONSHIP_HEADLINES: Partial<Record<CategoryKey, string>> = {
  object: "How did this come into your story?",
  moment: "Who was part of this?",
  place: "Who comes to mind when you think of this place?",
  food: "Where does this food come from for you?",
};

const RELATIONSHIP_OPTIONS: Partial<Record<CategoryKey, string[]>> = {
  object: [
    "It was given to me",
    "I inherited it",
    "It belongs to someone I care about",
    "I came across it",
    "It was always just there",
  ],
  moment: [
    "Just me",
    "Someone I know",
    "A group of people",
    "A stranger",
  ],
  place: [
    "Someone I know",
    "A younger version of myself",
    "A group of people",
    "It's about the place itself",
  ],
  food: [
    "Someone I know made it",
    "I discovered it somewhere",
    "It belongs to my past",
    "It's just something I love",
  ],
};

// Relationship answers that lead to the conditional "who" screen (S4b).
const WHO_TRIGGER_OPTIONS: Partial<Record<CategoryKey, string[]>> = {
  object: ["It was given to me", "I inherited it", "It belongs to someone I care about"],
  moment: ["Someone I know"],
  place: ["Someone I know"],
  food: ["Someone I know made it", "I discovered it somewhere"],
};

// Per-category copy for the Who screen (S4b).
const WHO_HEADLINES: Partial<Record<CategoryKey, string>> = {
  object: "Who does it connect you to?",
  moment: "Who were they to you?",
  place: "Who is it?",
  food: "Who made it, or who introduced it to you?",
};

const WHO_EXAMPLES: Partial<Record<CategoryKey, string[]>> = {
  object: [
    "My grandmother",
    "A friend I've lost touch with",
    "Someone I never got to meet",
  ],
  moment: ["My best friend", "My dad, before things got complicated"],
  place: ["My grandfather", "A version of myself I miss"],
  food: ["My aunt", "A friend who knew how to cook"],
};

const triggersWhoScreen = (
  category: CategoryKey,
  relationship: string
): boolean => {
  const triggers = WHO_TRIGGER_OPTIONS[category] ?? [];
  return triggers.includes(relationship);
};

const progressFor = (step: Step): number | null => {
  // S4b ("who") holds the progress bar at the position of S4 ("relationship").
  const lookup: Step = step === "who" ? "relationship" : step;
  const idx = PROGRESS_STEPS.indexOf(lookup);
  if (idx === -1) return null;
  // Fill proportionally; final step (signup) sits at 100%.
  return (idx + 1) / PROGRESS_STEPS.length;
};


const NOTE_PLACEHOLDERS: Record<CategoryKey, string> = {
  moment: "What was happening in this moment? What do you want to remember?",
  person: "Who were they to you? What do you want to remember about them?",
  object: "Where did this come from? What does it mean to you?",
  place: "What brought you here? What do you want to remember about it?",
  food: "What tastes stood out? What do you want to remember about the meal?",
  sound: "What makes this sound memorable? What does it remind you of?",
  imprint: "What does this remind you of? Why has it stayed with you?",
};

const TITLE_PLACEHOLDERS: Record<CategoryKey, string> = {
  moment: "Name this moment",
  person: "Their name",
  object: "Name this object",
  place: "Name this place",
  food: "Name this meal",
  sound: "Name this sound",
  imprint: "Name this imprint",
};

// Headline shown on the Title screen (S3), per category.
const TITLE_HEADLINES: Record<CategoryKey, string> = {
  moment: "What would you call this moment?",
  person: "What would you call them?",
  object: "What would you call this?",
  place: "What do you call this place?",
  food: "What would you call this?",
  sound: "What would you call this sound?",
  imprint: "What would you call this?",
};

// Example phrases shown quietly beneath the input as inspiration.
const TITLE_EXAMPLES: Record<CategoryKey, string[]> = {
  moment: [
    "The last summer at the lake",
    "The night everything changed",
  ],
  person: ["Grandma Rose", "Uncle Jim"],
  object: [
    "Mom's pageant crown",
    "Dad's tackle box",
    "The blue chair",
  ],
  place: ["Grandma's back porch", "The corner booth"],
  food: [
    "Mom's rice and beans",
    "The sandwich from that place",
  ],
  sound: ["Dad's whistle", "The screen door"],
  imprint: ["The smell of pine", "That song"],
};

const CATEGORIES: CategoryKey[] = [
  "moment",
  "person",
  "object",
  "place",
  "food",
  "sound",
  "imprint",
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [step, setStep] = useState<Step>("splash");
  const [draft, setDraft] = useState<OnboardingDraft>(emptyOnboardingDraft());
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [persisting, setPersisting] = useState(false);

  // Auth form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  // On mount: rehydrate any draft (e.g. after OAuth round-trip).
  useEffect(() => {
    const existing = loadOnboardingDraft();
    if (existing) {
      setDraft(existing);
      setPhotoFile(getOnboardingPhoto());
      setPhotoPreview(existing.photoPreview);
    }
  }, []);

  // After auth, persist the captured memory and route into the app.
  useEffect(() => {
    if (loading || !user) return;
    const stored = loadOnboardingDraft();
    if (!stored) {
      navigate("/archive", { replace: true });
      return;
    }
    persistDraft(stored).then(() => {
      navigate("/archive", { replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const update = (patch: Partial<OnboardingDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const handlePhotoSelect = (f: File | null) => {
    setPhotoFile(f);
    setOnboardingPhoto(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setPhotoPreview(url);
      update({ photoPreview: url });
    } else {
      setPhotoPreview(null);
      update({ photoPreview: null });
    }
  };

  const persistDraft = async (d: OnboardingDraft) => {
    if (!user || persisting) return;
    setPersisting(true);
    try {
      let photo_url: string | null = null;
      const file = getOnboardingPhoto();
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("memory-photos")
          .upload(path, file);
        if (!upErr) {
          const { data } = supabase.storage.from("memory-photos").getPublicUrl(path);
          photo_url = data.publicUrl;
        }
      }
      const payload: Record<string, any> = {
        user_id: user.id,
        category: d.category as any,
        title: d.title.trim() || null,
        note: (() => {
          const loc = d.emotionalLocation.trim();
          const note = d.note.trim();
          if (loc && note) return `${loc}\n\n${note}`;
          return loc || note || null;
        })(),
        photo_url,
        memory_season: d.memoryDate.season,
        memory_year: d.memoryDate.year,
        memory_month: d.memoryDate.month,
        memory_day: d.memoryDate.day,
        when_text:
          d.memoryDate.yearText && d.memoryDate.yearText.trim()
            ? d.memoryDate.yearText.trim()
            : null,
        who_was_there: d.whoWasThere.trim() || null,
        people: d.people.trim() || null,
        location_name: d.mapLocationName.trim() || null,
        location_lat: d.mapLocationLat,
        location_lng: d.mapLocationLng,
      };
      await (supabase as any).from("touchstones").insert(payload);
    } catch {
      toast.error("Couldn't save your first memory — try again from the archive.");
    } finally {
      clearOnboardingDraft();
      setPersisting(false);
    }
  };

  // ---- Auth handlers ----
  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    saveOnboardingDraft(draft);
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      toast.success("Check your email to confirm your account.");
    } catch (err: any) {
      toast.error(err.message || "Sign up failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    saveOnboardingDraft(draft);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message || "Google sign-in failed");
    }
  };

  const handleApple = async () => {
    saveOnboardingDraft(draft);
    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message || "Apple sign-in failed");
    }
  };

  // ---- Render: while auth is loading or persisting, show a quiet placeholder
  if (loading || persisting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">One moment…</p>
      </div>
    );
  }

  // ---- SPLASH ----
  if (step === "splash") {
    return <Splash onDone={() => setStep("definition")} />;
  }

  // ---- DEFINITION ----
  if (step === "definition") {
    return (
      <Definition
        onContinue={() => setStep("category")}
        onSignIn={() => navigate("/auth")}
      />
    );
  }

  // ---- CATEGORY ----
  if (step === "category") {
    const ACTIVE: CategoryKey[] = ["moment", "object", "place", "food"];
    const COMING: CategoryKey[] = ["person", "sound", "imprint"];
    const pickCategory = (c: CategoryKey) => {
      update({ category: c });
      setStep("time");
    };
    return (
      <LightScreen onBack={() => setStep("definition")}>
        <div className="space-y-2 pt-2 text-center">
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontStyle: "italic",
              fontSize: 15,
              color: "rgba(44,62,80,0.65)",
              margin: 0,
            }}
          >
            Your archive starts with one memory.
          </p>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 28,
              color: "#2C3E50",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            What's worth keeping today?
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ACTIVE.map((c) => (
            <CategoryIconCard
              key={c}
              category={c}
              active={draft.category === c}
              iconSize={30}
              labelSize={11}
              onClick={() => pickCategory(c)}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 sm:max-w-[75%] sm:mx-auto">
          {COMING.map((c) => (
            <CategoryIconCard
              key={c}
              category={c}
              comingSoon
              iconSize={30}
              labelSize={11}
            />
          ))}
        </div>
      </LightScreen>
    );
  }

  // ---- TIME ----
  if (step === "time") {
    const TIME_OPTIONS: { label: string; yearText: string }[] = [
      { label: "A long time ago", yearText: "A long time ago" },
      { label: "A few years back", yearText: "A few years back" },
      { label: "Recently", yearText: "Recently" },
      { label: "It's ongoing", yearText: "Ongoing" },
    ];
    const pickTime = (yearText: string) => {
      update({
        memoryDate: {
          ...emptyMemoryDate(),
          yearText,
        },
      });
      setStep("title");
    };
    return (
      <LightScreen
        onBack={() => setStep("category")}
        progress={progressFor("time")}
      >
        <div className="space-y-2 pt-2 text-center">
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 28,
              color: "#2C3E50",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            When does this belong to?
          </h2>
        </div>
        <div className="space-y-3 pt-2">
          {TIME_OPTIONS.map((opt) => {
            const selected = draft.memoryDate.yearText === opt.yearText;
            return (
              <button
                key={opt.yearText}
                type="button"
                onClick={() => pickTime(opt.yearText)}
                aria-pressed={selected}
                className="w-full text-left transition-colors"
                style={{
                  backgroundColor: selected ? "#2C3E50" : "#E8E4D8",
                  color: selected ? "#F2EEE5" : "#2C3E50",
                  borderRadius: 12,
                  padding: "18px 22px",
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 19,
                  letterSpacing: "0.005em",
                  border: selected
                    ? "1px solid rgba(184,134,11,0.6)"
                    : "1px solid rgba(44,62,80,0.06)",
                  boxShadow: selected
                    ? "0 4px 18px rgba(44,62,80,0.18)"
                    : "0 1px 2px rgba(44,62,80,0.04)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </LightScreen>
    );
  }

  // ---- TITLE (S3) ----
  if (step === "title") {
    const headline = TITLE_HEADLINES[draft.category];
    const examples = TITLE_EXAMPLES[draft.category] ?? [];
    const canAdvance = draft.title.trim().length > 0;
    const advance = () => {
      if (canAdvance) setStep("relationship");
    };
    return (
      <LightScreen
        onBack={() => setStep("time")}
        progress={progressFor("title")}
      >
        <div className="space-y-3 pt-2 text-center">
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 28,
              color: "#2C3E50",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {headline}
          </h2>
        </div>
        <div className="space-y-3 pt-2">
          <Input
            type="text"
            autoFocus
            placeholder={TITLE_PLACEHOLDERS[draft.category]}
            value={draft.title}
            onChange={(e) => update({ title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                advance();
              }
            }}
            className="h-14 text-lg bg-card border-0 placeholder:italic"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "#2C3E50",
            }}
          />
          {examples.length > 0 && (
            <p
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: 13,
                color: "#5B4A3F",
                opacity: 0.75,
                margin: 0,
                textAlign: "center",
                fontStyle: "italic",
              }}
            >
              e.g. {examples.map((s) => `“${s}”`).join(" · ")}
            </p>
          )}
        </div>
        <PrimaryCTA onClick={advance} disabled={!canAdvance}>
          Next
        </PrimaryCTA>
      </LightScreen>
    );
  }

  // ---- RELATIONSHIP (S4) ----
  if (step === "relationship") {
    const headline =
      RELATIONSHIP_HEADLINES[draft.category] ?? "Who was part of this?";
    const options = RELATIONSHIP_OPTIONS[draft.category] ?? [];
    if (options.length === 0) {
      setStep("emotional");
      return null;
    }
    const pickRelationship = (label: string) => {
      update({ whoWasThere: label });
      if (triggersWhoScreen(draft.category, label)) {
        setStep("who");
      } else {
        setStep("emotional");
      }
    };
    return (
      <LightScreen
        onBack={() => setStep("title")}
        progress={progressFor("relationship")}
      >
        <div className="space-y-2 pt-2 text-center">
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 26,
              color: "#2C3E50",
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            {headline}
          </h2>
        </div>
        <div className="space-y-3 pt-2">
          {options.map((opt) => {
            const selected = draft.whoWasThere === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => pickRelationship(opt)}
                aria-pressed={selected}
                className="w-full text-left transition-colors"
                style={{
                  backgroundColor: selected ? "#2C3E50" : "#E8E4D8",
                  color: selected ? "#F2EEE5" : "#2C3E50",
                  borderRadius: 12,
                  padding: "16px 20px",
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 18,
                  letterSpacing: "0.005em",
                  border: selected
                    ? "1px solid rgba(184,134,11,0.6)"
                    : "1px solid rgba(44,62,80,0.06)",
                  boxShadow: selected
                    ? "0 4px 18px rgba(44,62,80,0.18)"
                    : "0 1px 2px rgba(44,62,80,0.04)",
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </LightScreen>
    );
  }

  // ---- WHO (S4b, conditional) ----
  if (step === "who") {
    const headline = WHO_HEADLINES[draft.category] ?? "Who comes to mind?";
    const examples = WHO_EXAMPLES[draft.category] ?? [];
    // The relationship answer was stored in whoWasThere; on this screen the
    // user replaces it with a specific person. Track the field locally so we
    // don't clobber the relationship label until they type or skip.
    const relationshipLabel =
      draft.whoWasThere &&
      (RELATIONSHIP_OPTIONS[draft.category] ?? []).includes(draft.whoWasThere)
        ? draft.whoWasThere
        : "";
    const currentWho =
      draft.whoWasThere === relationshipLabel ? "" : draft.whoWasThere;
    const setWho = (val: string) => update({ whoWasThere: val });
    const advance = () => {
      // If the field is empty, fall back to the relationship label so we
      // don't lose context. Otherwise keep the person the user typed.
      if (!currentWho.trim() && relationshipLabel) {
        update({ whoWasThere: relationshipLabel });
      }
      setStep("emotional");
    };
    const skip = () => {
      // Skipping preserves the relationship label.
      if (relationshipLabel) update({ whoWasThere: relationshipLabel });
      else update({ whoWasThere: "" });
      setStep("emotional");
    };
    return (
      <LightScreen
        onBack={() => setStep("relationship")}
        progress={progressFor("who")}
      >
        <div className="space-y-2 pt-2 text-center">
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 26,
              color: "#2C3E50",
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            {headline}
          </h2>
        </div>
        <div className="space-y-3 pt-2">
          <Input
            type="text"
            autoFocus
            placeholder="Their name, or how you'd describe them"
            value={currentWho}
            onChange={(e) => setWho(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                advance();
              }
            }}
            className="h-14 text-lg bg-card border-0 placeholder:italic"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "#2C3E50",
            }}
          />
          {examples.length > 0 && (
            <p
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: 13,
                color: "#5B4A3F",
                opacity: 0.75,
                margin: 0,
                textAlign: "center",
                fontStyle: "italic",
              }}
            >
              e.g. {examples.map((s) => `“${s}”`).join(" · ")}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <PrimaryCTA onClick={advance} disabled={!currentWho.trim()}>
            Next
          </PrimaryCTA>
          <button
            type="button"
            onClick={skip}
            className="mx-auto text-sm"
            style={{
              fontFamily: "'Jost', sans-serif",
              color: "#5B4A3F",
              opacity: 0.7,
              padding: "8px 12px",
              background: "transparent",
              border: 0,
            }}
          >
            Skip
          </button>
        </div>
      </LightScreen>
    );
  }

  // ---- EMOTIONAL LOCATION (S5) ----
  if (step === "emotional") {
    const headline = EMOTIONAL_HEADLINES[draft.category];
    const examples = EMOTIONAL_EXAMPLES[draft.category] ?? [];
    // Categories without specific S5 copy skip the screen entirely.
    if (!headline) {
      setStep("map");
      return null;
    }
    // The previous step (relationship/who) determines where Back goes.
    const cameFromWho = triggersWhoScreen(draft.category, draft.whoWasThere);
    const back = () => setStep(cameFromWho ? "who" : "relationship");
    const advance = () => setStep("map");
    const skip = () => {
      update({ emotionalLocation: "" });
      setStep("map");
    };
    return (
      <LightScreen onBack={back} progress={progressFor("emotional")}>
        <div className="space-y-2 pt-2 text-center">
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 26,
              color: "#2C3E50",
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            {headline}
          </h2>
        </div>
        <div className="space-y-3 pt-2">
          <Input
            type="text"
            autoFocus
            placeholder="A few words"
            value={draft.emotionalLocation}
            onChange={(e) => update({ emotionalLocation: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                advance();
              }
            }}
            className="h-14 text-lg bg-card border-0 placeholder:italic"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "#2C3E50",
            }}
          />
          {examples.length > 0 && (
            <p
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: 13,
                color: "#5B4A3F",
                opacity: 0.75,
                margin: 0,
                textAlign: "center",
                fontStyle: "italic",
              }}
            >
              e.g. {examples.map((s) => `“${s}”`).join(" · ")}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <PrimaryCTA
            onClick={advance}
            disabled={!draft.emotionalLocation.trim()}
          >
            Next
          </PrimaryCTA>
          <button
            type="button"
            onClick={skip}
            className="mx-auto text-sm"
            style={{
              fontFamily: "'Jost', sans-serif",
              color: "#5B4A3F",
              opacity: 0.7,
              padding: "8px 12px",
              background: "transparent",
              border: 0,
            }}
          >
            Skip
          </button>
        </div>
      </LightScreen>
    );
  }

  // ---- MAP LOCATION (S6) ----
  if (step === "map") {
    return (
      <MapLocationStep
        valueName={draft.mapLocationName}
        valueLat={draft.mapLocationLat}
        valueLng={draft.mapLocationLng}
        onChange={(loc) =>
          update({
            mapLocationName: loc.name,
            mapLocationLat: loc.lat,
            mapLocationLng: loc.lng,
          })
        }
        onBack={() => setStep("emotional")}
        progress={progressFor("map")}
        onAdvance={() => setStep("photo")}
        onSkip={() => {
          update({
            mapLocationName: "",
            mapLocationLat: null,
            mapLocationLng: null,
          });
          setStep("photo");
        }}
      />
    );
  }

  // ---- PHOTO (S8) ----
  if (step === "photo") {
    return (
      <PhotoStep
        category={draft.category}
        preview={photoPreview}
        onSelect={(f) => {
          handlePhotoSelect(f);
          if (f) setStep("details");
        }}
        onSkip={() => {
          handlePhotoSelect(null);
          setStep("details");
        }}
        onContinue={() => setStep("details")}
        onBack={() => setStep("map")}
        progress={progressFor("photo")}
      />
    );
  }

  // ---- NOTE (S9) ----
  if (step === "details") {
    const advance = () => setStep("date");
    const skip = () => {
      update({ note: "" });
      setStep("date");
    };
    return (
      <LightScreen onBack={() => setStep("photo")} progress={progressFor("details")}>
        <div className="space-y-2 pt-2 text-center">
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 26,
              color: "#2C3E50",
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            What do you want to remember about this?
          </h2>
        </div>
        <div className="space-y-3 pt-2">
          <Textarea
            autoFocus
            placeholder="What would you want someone to know about this?"
            value={draft.note}
            onChange={(e) => update({ note: e.target.value })}
            rows={5}
            className="text-base bg-card border-0 placeholder:italic resize-none"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "#2C3E50",
            }}
          />
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontStyle: "italic",
              fontSize: 14,
              color: "rgba(44,62,80,0.7)",
              margin: 0,
              textAlign: "center",
            }}
          >
            One sentence is enough. This is yours.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <PrimaryCTA onClick={advance}>Continue</PrimaryCTA>
          <button
            type="button"
            onClick={skip}
            className="mx-auto text-sm"
            style={{
              fontFamily: "'Jost', sans-serif",
              color: "#5B4A3F",
              opacity: 0.7,
              padding: "8px 12px",
              background: "transparent",
              border: 0,
            }}
          >
            Skip
          </button>
        </div>
      </LightScreen>
    );
  }

  // ---- WHEN (S7) ----
  if (step === "date") {
    const headline = WHEN_HEADLINES[draft.category];
    const examples = WHEN_EXAMPLES[draft.category] ?? [];
    const whenValue = draft.memoryDate.yearText ?? "";
    const setWhen = (val: string) =>
      update({
        memoryDate: { ...draft.memoryDate, yearText: val },
      });
    const advance = () => setStep("artifact");
    return (
      <LightScreen onBack={() => setStep("details")} progress={progressFor("date")}>
        <div className="space-y-2 pt-2 text-center">
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 26,
              color: "#2C3E50",
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            {headline}
          </h2>
        </div>
        <div className="space-y-3 pt-2">
          <Input
            type="text"
            autoFocus
            placeholder="A date, a year, or however you remember it"
            value={whenValue}
            onChange={(e) => setWhen(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                advance();
              }
            }}
            className="h-14 text-lg bg-card border-0 placeholder:italic"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "#2C3E50",
            }}
          />
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontStyle: "italic",
              fontSize: 14,
              color: "rgba(44,62,80,0.7)",
              margin: 0,
              textAlign: "center",
            }}
          >
            Approximate is perfectly fine.
          </p>
          {examples.length > 0 && (
            <p
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: 13,
                color: "#5B4A3F",
                opacity: 0.75,
                margin: 0,
                textAlign: "center",
                fontStyle: "italic",
              }}
            >
              e.g. {examples.map((s) => `“${s}”`).join(" · ")}
            </p>
          )}
        </div>
        <PrimaryCTA onClick={advance}>See it rendered</PrimaryCTA>
      </LightScreen>
    );
  }

  // ---- ARTIFACT REVEAL ----
  if (step === "artifact") {
    return (
      <ArtifactReveal
        draft={draft}
        photoPreview={photoPreview}
        onClaim={() => setStep("signup")}
        peopleValue={draft.people}
        onPeopleChange={(name) => update({ people: name })}
      />
    );
  }

  // ---- SIGN UP ----
  return (
    <LightScreen onBack={() => setStep("artifact")} progress={progressFor("signup")}>
      <div className="text-center space-y-3">
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 30,
            color: "#2C3E50",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Let's keep this safe.
        </h2>
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontSize: 17,
            color: "#5B4A3F",
            margin: 0,
          }}
        >
          It deserves a home.
        </p>
      </div>

      {/* Apple — primary */}
      <Button
        onClick={handleApple}
        className="w-full h-12 text-base gap-3 bg-[#2C3E50] text-[#F2EEE5] hover:bg-[#2C3E50]/90"
      >
        <svg width="18" height="18" viewBox="0 0 384 512" aria-hidden="true" fill="currentColor">
          <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
        </svg>
        Continue with Apple
      </Button>

      {/* Google — primary */}
      <Button
        onClick={handleGoogle}
        className="w-full h-12 text-base gap-3 bg-card text-foreground hover:bg-card/80 border border-border"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.806.54-1.8368.8595-3.0477.8595-2.344 0-4.3282-1.5831-5.036-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z" />
          <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.2823-1.1168-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9573C.3477 6.1731 0 7.5477 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71z" />
          <path fill="#EA4335" d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3459l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z" />
        </svg>
        Continue with Google
      </Button>

      {/* Email reveal */}
      {!showEmail ? (
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => setShowEmail(true)}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
            style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic" }}
          >
            I'd rather use my email
          </button>
        </div>
      ) : (
        <form onSubmit={handleEmailSignup} className="space-y-3 pt-1">
          <Input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 text-base bg-card border-0"
          />
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 text-base bg-card border-0"
          />
          <Input
            type="password"
            placeholder="Password (6+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="h-12 text-base bg-card border-0"
          />
          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 text-base bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {submitting ? "…" : "Create my archive"}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button
          onClick={() => {
            saveOnboardingDraft(draft);
            navigate("/auth");
          }}
          className="text-foreground underline underline-offset-4"
        >
          Sign in
        </button>
      </p>
    </LightScreen>
  );
};

// ---------- Sub-components ----------

/**
 * Splash — full-screen ink intro. Holds 2.5s, then dissolves ivory and advances.
 * Wordmark fades in immediately; gold diamond mark fades in 0.5s after.
 * A static placeholder for the eventual Lottie animation.
 */
const Splash = ({ onDone }: { onDone: () => void }) => {
  const [dissolving, setDissolving] = useState(false);

  useEffect(() => {
    // Begin dissolve at 2.5s, advance once the 0.8s fade completes.
    const startDissolve = window.setTimeout(() => setDissolving(true), 2500);
    const advance = window.setTimeout(() => onDone(), 2500 + 800);
    return () => {
      window.clearTimeout(startDissolve);
      window.clearTimeout(advance);
    };
  }, [onDone]);

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ backgroundColor: "#2C3E50" }}
    >
      <style>{`
        @keyframes ts-splash-wordmark {
          from { opacity: 0; letter-spacing: 0.36em; }
          to { opacity: 1; letter-spacing: 0.28em; }
        }
        @keyframes ts-splash-diamond {
          from { opacity: 0; transform: rotate(45deg) scale(0.6); }
          to { opacity: 1; transform: rotate(45deg) scale(1); }
        }
        .ts-splash-wordmark { animation: ts-splash-wordmark 1.1s ease-out both; }
        .ts-splash-diamond  { animation: ts-splash-diamond 0.9s ease-out 0.5s both; }
      `}</style>

      <div className="flex flex-col items-center gap-7">
        <h1
          className="ts-splash-wordmark"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 600,
            fontSize: "clamp(34px, 8vw, 52px)",
            letterSpacing: "0.28em",
            color: "#F2EEE5",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          Touchstone
        </h1>
        <span
          aria-hidden
          className="ts-splash-diamond"
          style={{
            display: "inline-block",
            width: 14,
            height: 14,
            backgroundColor: "#B8860B",
            boxShadow: "0 0 18px rgba(184,134,11,0.5)",
          }}
        />
      </div>

      {/* Ivory dissolve overlay */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "#F2EEE5",
          opacity: dissolving ? 1 : 0,
          transition: "opacity 0.8s ease-in-out",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

/**
 * Definition — ivory, full-bleed dictionary entry. Playfair throughout.
 * Sub-copy fades in 1s after the entry; quiet gold text CTA below.
 */
const Definition = ({ onContinue, onSignIn }: { onContinue: () => void; onSignIn: () => void }) => (
  <div
    className="flex min-h-screen flex-col px-6 py-12"
    style={{ backgroundColor: "#F2EEE5" }}
  >
    <style>{`
      @keyframes ts-def-in {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .ts-def-entry  { animation: ts-def-in 0.7s ease-out 0.1s both; }
      .ts-def-sub    { animation: ts-def-in 0.7s ease-out 1s both; }
      .ts-def-cta    { animation: ts-def-in 0.6s ease-out 1.5s both; }
    `}</style>

    <div className="flex flex-1 flex-col items-center justify-center">
      <div
        className="ts-def-entry w-full max-w-md"
        style={{ fontFamily: "'Playfair Display', serif", color: "#2C3E50" }}
      >
        {/* Headword + pronunciation */}
        <div className="flex items-baseline flex-wrap gap-x-3 gap-y-1">
          <h1
            style={{
              fontSize: "clamp(34px, 7vw, 44px)",
              fontWeight: 600,
              letterSpacing: "-0.005em",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            touchstone
          </h1>
          <span
            style={{
              fontStyle: "italic",
              fontSize: "clamp(20px, 3.4vw, 26px)",
              color: "rgba(44,62,80,0.6)",
            }}
          >
            (təch-stŏn)
          </span>
        </div>

        {/* Part of speech */}
        <p
          style={{
            fontStyle: "italic",
            fontSize: 18,
            color: "rgba(44,62,80,0.6)",
            margin: "10px 0 26px",
          }}
        >
          noun
        </p>

        {/* Definitions */}
        <ol
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            counterReset: "ts-def",
          }}
        >
          {[
            "a fundamental or quintessential part or feature.",
            "a test or criterion for determining the quality or genuineness of a thing.",
            "a black siliceous stone used to test the purity of precious metals by the streak left on the stone.",
          ].map((d, i) => (
            <li
              key={i}
              style={{
                fontWeight: 400,
                fontSize: 17,
                lineHeight: 1.55,
                color: "#5B4A3F",
                display: "flex",
                gap: 12,
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 18,
                  fontSize: 15,
                  color: "rgba(91,74,63,0.6)",
                  fontStyle: "italic",
                }}
              >
                {i + 1}.
              </span>
              <span>{d}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Sub-copy */}
      <p
        className="ts-def-sub mt-12 text-center"
        style={{
          fontFamily: "'Playfair Display', serif",
          fontStyle: "italic",
          fontSize: 19,
          lineHeight: 1.5,
          color: "rgba(44,62,80,0.78)",
          maxWidth: 360,
        }}
      >
        Your archive starts with one memory.
      </p>
    </div>

    {/* Quiet gold text CTA */}
    <div className="ts-def-cta flex flex-col items-center pb-2 gap-3">
      <button
        type="button"
        onClick={onContinue}
        className="group inline-flex items-center gap-2 transition-opacity hover:opacity-80"
        style={{
          fontFamily: "'Playfair Display', serif",
          fontStyle: "italic",
          color: "#B8860B",
          fontSize: 19,
          padding: "10px 8px",
          letterSpacing: "0.01em",
          background: "transparent",
          border: "none",
        }}
      >
        Let's begin
        <span
          aria-hidden
          className="transition-transform group-hover:translate-x-1"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          →
        </span>
      </button>
      <button
        type="button"
        onClick={onSignIn}
        className="transition-opacity hover:opacity-100"
        style={{
          fontFamily: "'Jost', sans-serif",
          fontSize: 13,
          color: "rgba(91,74,63,0.6)",
          background: "transparent",
          border: "none",
          padding: "4px 8px",
          letterSpacing: "0.01em",
        }}
      >
        Sign in
      </button>
    </div>
  </div>
);

const DarkScreen = ({ children }: { children: React.ReactNode }) => (
  <div
    className="flex min-h-screen items-center justify-center px-6 py-10"
    style={{ backgroundColor: "#2C3E50" }}
  >
    <div className="w-full max-w-md flex items-center justify-center">{children}</div>
  </div>
);

const LightScreen = ({
  children,
  onBack,
  progress,
}: {
  children: React.ReactNode;
  onBack?: () => void;
  /** 0-1 progress fill, or null to hide the bar entirely. */
  progress?: number | null;
}) => (
  <div className="relative min-h-screen bg-background px-6 py-8">
    {/* Slim 2px gold progress bar — pinned to the very top of the screen */}
    {typeof progress === "number" && (
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: "rgba(184,134,11,0.12)",
          zIndex: 50,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
            backgroundColor: "#B8860B",
            transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>
    )}
    <div className="mx-auto max-w-md space-y-6">
      <div className="flex items-center justify-between">
        {onBack ? (
          <button
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            style={{ fontFamily: "Jost, sans-serif", letterSpacing: "0.08em" }}
          >
            ← Back
          </button>
        ) : (
          <span />
        )}
        <span
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 13,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "#2C3E50",
          }}
        >
          Touchstone
        </span>
        <span className="w-10" />
      </div>
      {children}
    </div>
  </div>
);

const Question = ({
  kicker,
  title,
  subtitle,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
}) => (
  <div className="space-y-2 pt-2">
    {kicker && (
      <p
        style={{
          fontFamily: "Jost, sans-serif",
          fontSize: 11,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "#B8860B",
        }}
      >
        {kicker}
      </p>
    )}
    <h2
      style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 26,
        color: "#2C3E50",
        margin: 0,
        lineHeight: 1.25,
      }}
    >
      {title}
    </h2>
    {subtitle && (
      <p className="text-base text-muted-foreground" style={{ fontFamily: "Jost, sans-serif" }}>
        {subtitle}
      </p>
    )}
  </div>
);

const PrimaryCTA = ({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="w-full transition-opacity disabled:opacity-50"
    style={{
      backgroundColor: "#B8860B",
      color: "#F2EEE5",
      borderRadius: 999,
      padding: "14px 28px",
      fontFamily: "Jost, sans-serif",
      fontSize: 15,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      fontWeight: 500,
    }}
  >
    {children}
  </button>
);

/**
 * Artifact Reveal — the most important screen in the product.
 *
 * Sequence (per spec):
 *  1. Full-screen stillness. The artifact renders in. No copy, no buttons.
 *  2. After a beat, "You just made your first Touchstone." fades in.
 *  3. After another beat, the quiet "Let's keep this safe." CTA appears.
 *
 * The progress bar is intentionally not rendered here.
 */
const ArtifactReveal = ({
  draft,
  photoPreview,
  onClaim,
  peopleValue,
  onPeopleChange,
}: {
  draft: OnboardingDraft;
  photoPreview: string | null;
  onClaim: () => void;
  peopleValue: string;
  onPeopleChange: (name: string) => void;
}) => {
  const cat = draft.category;
  const barColor = CATEGORY_BORDER_COLORS[cat] ?? "#B8860B";
  const dateLabel =
    (draft.memoryDate.yearText && draft.memoryDate.yearText.trim()) ||
    formatMemoryDate(draft.memoryDate) ||
    "";
  const noteText = draft.note.trim();
  const emotionalText = draft.emotionalLocation.trim();

  // Sequence:
  //  still  → just the artifact, full-screen stillness
  //  named  → "You just made your first Touchstone." appears
  //  nudge  → "Anyone who'd remember this too?" people prompt appears
  //  cta    → quiet "Let's keep this safe." CTA appears
  const [phase, setPhase] = useState<"still" | "named" | "nudge" | "cta">(
    "still"
  );
  // The nudge fires once; once dismissed (added or skipped) it never comes
  // back, even if the user navigates away and returns.
  const [nudgeDone, setNudgeDone] = useState<boolean>(
    () => peopleValue.trim().length > 0
  );
  const [nudgeMode, setNudgeMode] = useState<"prompt" | "input">("prompt");
  const [nameDraft, setNameDraft] = useState<string>(peopleValue);

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase("named"), 1600);
    const t2 = window.setTimeout(
      () => setPhase((p) => (p === "named" ? "nudge" : p)),
      3000
    );
    const t3 = window.setTimeout(
      () => setPhase((p) => (nudgeDone ? "cta" : p)),
      4400
    );
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the nudge is resolved (added or skipped), advance to the CTA.
  const finishNudge = (name: string | null) => {
    if (name && name.trim()) onPeopleChange(name.trim());
    setNudgeDone(true);
    setPhase("cta");
  };

  return (
    <div
      className="min-h-screen w-full px-6 py-10 flex flex-col items-center"
      style={{ backgroundColor: "#F2EEE5" }}
    >
      <style>{`
        @keyframes ts-artifact-in {
          from { opacity: 0; transform: scale(0.97) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes ts-artifact-fade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ts-artifact-card { animation: ts-artifact-in 0.9s ease-out both; }
        .ts-artifact-line { animation: ts-artifact-fade 0.9s ease-out both; }
      `}</style>

      {/* The artifact itself — a rendered object, not a form. */}
      <div
        className="ts-artifact-card mx-auto w-full max-w-sm overflow-hidden"
        style={{
          backgroundColor: "#E8E4D8",
          borderRadius: 14,
          boxShadow:
            "0 24px 60px rgba(44,62,80,0.18), 0 4px 14px rgba(44,62,80,0.08)",
        }}
      >
        {photoPreview ? (
          <div style={{ aspectRatio: "1 / 1", width: "100%", overflow: "hidden" }}>
            <img
              src={photoPreview}
              alt={draft.title || "Memory"}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        ) : (
          <div
            style={{
              aspectRatio: "1 / 1",
              width: "100%",
              backgroundColor: barColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CategoryIcon category={cat} size={96} color="#F2EEE5" />
          </div>
        )}

        {/* Category stripe */}
        <div style={{ height: 9, width: "100%", backgroundColor: barColor }} />

        <div style={{ padding: 18 }} className="space-y-2">
          {/* Quiet category label */}
          <p
            style={{
              fontFamily: "Jost, sans-serif",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#8A8070",
              margin: 0,
            }}
          >
            {CATEGORY_LABELS[cat]}
          </p>

          {/* Title */}
          {draft.title.trim() && (
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 24,
                fontWeight: 600,
                color: "#2C3E50",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {draft.title.trim()}
            </h3>
          )}

          {/* Date captured */}
          {dateLabel && (
            <p
              style={{
                fontFamily: "Jost, sans-serif",
                fontSize: 12,
                fontWeight: 300,
                color: "rgba(91,74,63,0.7)",
                margin: 0,
                letterSpacing: "0.04em",
              }}
            >
              {dateLabel}
            </p>
          )}

          {/* Emotional location */}
          {emotionalText && (
            <p
              style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: "italic",
                fontSize: 14,
                color: "rgba(44,62,80,0.75)",
                margin: 0,
              }}
            >
              {emotionalText}
            </p>
          )}

          {/* Note / answer */}
          {noteText && (
            <>
              <div
                aria-hidden
                style={{
                  height: 1,
                  width: "100%",
                  backgroundColor: "rgba(91,74,63,0.18)",
                  margin: "10px 0 8px",
                }}
              />
              <p
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontStyle: "italic",
                  fontSize: 16,
                  color: "#2C3E50",
                  margin: 0,
                  lineHeight: 1.55,
                }}
              >
                {noteText}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Confirmation line — appears after a beat */}
      <div
        style={{
          minHeight: 32,
          marginTop: 36,
          textAlign: "center",
          opacity: phase === "still" ? 0 : 1,
          transform: phase === "still" ? "translateY(6px)" : "translateY(0)",
          transition: "opacity 0.9s ease-out, transform 0.9s ease-out",
        }}
      >
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontSize: 19,
            color: "#2C3E50",
            margin: 0,
          }}
        >
          You just made your first Touchstone.
        </p>
      </div>

      {/* People nudge — fires once, between the confirmation line and the CTA */}
      {!nudgeDone && (
        <div
          style={{
            marginTop: 28,
            width: "100%",
            maxWidth: 360,
            opacity: phase === "nudge" || phase === "cta" ? 1 : 0,
            transform:
              phase === "nudge" || phase === "cta"
                ? "translateY(0)"
                : "translateY(6px)",
            transition: "opacity 0.9s ease-out, transform 0.9s ease-out",
            pointerEvents: phase === "nudge" ? "auto" : "none",
          }}
        >
          {nudgeMode === "prompt" ? (
            <div className="text-center space-y-3">
              <p
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontStyle: "italic",
                  fontSize: 17,
                  color: "rgba(44,62,80,0.85)",
                  margin: 0,
                }}
              >
                Anyone who'd remember this too?
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setNudgeMode("input")}
                  style={{
                    backgroundColor: "#E8E4D8",
                    color: "#2C3E50",
                    borderRadius: 999,
                    padding: "10px 18px",
                    fontFamily: "'Jost', sans-serif",
                    fontSize: 14,
                    border: "1px solid rgba(184,134,11,0.4)",
                  }}
                >
                  Add a name
                </button>
                <button
                  type="button"
                  onClick={() => finishNudge(null)}
                  style={{
                    background: "transparent",
                    color: "#5B4A3F",
                    opacity: 0.75,
                    padding: "10px 14px",
                    fontFamily: "'Jost', sans-serif",
                    fontSize: 14,
                    border: 0,
                  }}
                >
                  Skip
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                type="text"
                autoFocus
                placeholder="Their name"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    finishNudge(nameDraft);
                  }
                }}
                className="h-12 text-base bg-card border-0 placeholder:italic"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: "#2C3E50",
                }}
              />
              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => finishNudge(nameDraft)}
                  disabled={!nameDraft.trim()}
                  style={{
                    backgroundColor: "#2C3E50",
                    color: "#F2EEE5",
                    borderRadius: 999,
                    padding: "10px 20px",
                    fontFamily: "'Jost', sans-serif",
                    fontSize: 14,
                    border: 0,
                    opacity: nameDraft.trim() ? 1 : 0.4,
                    cursor: nameDraft.trim() ? "pointer" : "not-allowed",
                  }}
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => finishNudge(null)}
                  style={{
                    background: "transparent",
                    color: "#5B4A3F",
                    opacity: 0.75,
                    padding: "10px 14px",
                    fontFamily: "'Jost', sans-serif",
                    fontSize: 14,
                    border: 0,
                  }}
                >
                  Skip
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: 24,
          opacity: phase === "cta" ? 1 : 0,
          transform: phase === "cta" ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 0.9s ease-out, transform 0.9s ease-out",
          pointerEvents: phase === "cta" ? "auto" : "none",
        }}
      >
        <button
          type="button"
          onClick={onClaim}
          style={{
            background: "transparent",
            border: 0,
            padding: "10px 16px",
            fontFamily: "'Playfair Display', serif",
            fontSize: 16,
            color: "#B8860B",
            letterSpacing: "0.04em",
            cursor: "pointer",
          }}
        >
          Let's keep this safe.
        </button>
      </div>
    </div>
  );
};

/**
 * Map Location screen (S6). Identical across all categories.
 * Asks for permission in-context with a soft Touchstone-voiced line, falls
 * back to freeform typing if denied, and uses the existing Google Places
 * autocomplete component for predictions.
 */
const MapLocationStep = ({
  valueName,
  valueLat,
  valueLng,
  onChange,
  onBack,
  progress,
  onAdvance,
  onSkip,
}: {
  valueName: string;
  valueLat: number | null;
  valueLng: number | null;
  onChange: (loc: { name: string; lat: number | null; lng: number | null }) => void;
  onBack: () => void;
  progress: number | null;
  onAdvance: () => void;
  onSkip: () => void;
}) => {
  const [permissionState, setPermissionState] = useState<
    "idle" | "asking" | "granted" | "denied"
  >("idle");

  // Ask for native geolocation permission once, in-context, after the
  // soft preface has been shown. We don't block the form on the result.
  const askForLocation = () => {
    if (!("geolocation" in navigator)) {
      setPermissionState("denied");
      return;
    }
    setPermissionState("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPermissionState("granted");
        // Only seed coordinates if the user hasn't already picked a place.
        if (!valueName) {
          onChange({
            name: "",
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        }
      },
      () => setPermissionState("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  };

  return (
    <LightScreen onBack={onBack} progress={progress}>
      <div className="space-y-2 pt-2 text-center">
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 26,
            color: "#2C3E50",
            margin: 0,
            lineHeight: 1.25,
          }}
        >
          Whereabouts in the world?
        </h2>
        {permissionState === "idle" && (
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontStyle: "italic",
              fontSize: 14,
              color: "rgba(44,62,80,0.7)",
              margin: 0,
              paddingTop: 4,
            }}
          >
            We'll just need a moment of location access.
          </p>
        )}
      </div>

      {permissionState === "idle" && (
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={askForLocation}
            className="w-full transition-colors"
            style={{
              backgroundColor: "#E8E4D8",
              color: "#2C3E50",
              borderRadius: 12,
              padding: "14px 18px",
              fontFamily: "'Jost', sans-serif",
              fontSize: 14,
              border: "1px solid rgba(184,134,11,0.35)",
            }}
          >
            Use my current location
          </button>
          <button
            type="button"
            onClick={() => setPermissionState("denied")}
            className="mx-auto text-sm"
            style={{
              fontFamily: "'Jost', sans-serif",
              color: "#5B4A3F",
              opacity: 0.7,
              padding: "6px 12px",
              background: "transparent",
              border: 0,
            }}
          >
            I'd rather just type it
          </button>
        </div>
      )}

      <div className="space-y-2 pt-1">
        <LocationAutocomplete
          value={valueName}
          placeholder="Start typing a city, neighborhood, or place..."
          onChange={(loc) =>
            onChange({ name: loc.name, lat: loc.lat, lng: loc.lng })
          }
        />
        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 13,
            color: "#5B4A3F",
            opacity: 0.75,
            margin: 0,
            textAlign: "center",
          }}
        >
          Even a country is enough. This is optional.
        </p>
        {permissionState === "granted" && !valueName && (
          <p
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 12,
              color: "#367588",
              margin: 0,
              textAlign: "center",
            }}
          >
            Got your location — pick a place above to drop a pin.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <PrimaryCTA
          onClick={onAdvance}
          disabled={!valueName.trim() && valueLat === null}
        >
          Next
        </PrimaryCTA>
        <button
          type="button"
          onClick={onSkip}
          className="mx-auto text-sm"
          style={{
            fontFamily: "'Jost', sans-serif",
            color: "#5B4A3F",
            opacity: 0.7,
            padding: "8px 12px",
            background: "transparent",
            border: 0,
          }}
        >
          Skip
        </button>
      </div>
    </LightScreen>
  );
};

/**
 * Photo screen (S8). Category-aware copy and button order. The browser
 * surfaces native OS photo/camera permission prompts when the hidden
 * <input> is activated; we precede that with a soft Touchstone-voiced
 * preface so the prompt feels intentional rather than abrupt.
 */
const PhotoStep = ({
  category,
  preview,
  onSelect,
  onSkip,
  onContinue,
  onBack,
  progress,
}: {
  category: CategoryKey;
  preview: string | null;
  onSelect: (file: File | null) => void;
  onSkip: () => void;
  onContinue: () => void;
  onBack: () => void;
  progress: number | null;
}) => {
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [showPreface, setShowPreface] = useState<"library" | "camera" | null>(null);

  const headline = PHOTO_HEADLINES[category];
  const subcopy = PHOTO_SUBCOPY[category];
  const order = PHOTO_BUTTON_ORDER[category];

  const triggerLibrary = () => libraryRef.current?.click();
  const triggerCamera = () => cameraRef.current?.click();

  const handleAction = (kind: "library" | "camera") => {
    // Show a brief soft preface the first time, then immediately invoke
    // the native picker so the OS permission prompt follows naturally.
    setShowPreface(kind);
    if (kind === "library") triggerLibrary();
    else triggerCamera();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setShowPreface(null);
    if (file) onSelect(file);
    // reset so picking the same file twice still triggers change
    e.target.value = "";
  };

  const buttons: Record<"library" | "camera", { label: string; onClick: () => void }> = {
    library: { label: "Choose from library", onClick: () => handleAction("library") },
    camera: { label: "Take a photo", onClick: () => handleAction("camera") },
  };

  return (
    <LightScreen onBack={onBack} progress={progress}>
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="space-y-2 pt-2 text-center">
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 26,
            color: "#2C3E50",
            margin: 0,
            lineHeight: 1.25,
          }}
        >
          {headline}
        </h2>
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontSize: 14,
            color: "rgba(44,62,80,0.7)",
            margin: 0,
          }}
        >
          {subcopy}
        </p>
      </div>

      {preview && (
        <div className="flex justify-center pt-2">
          <img
            src={preview}
            alt="Selected memory"
            style={{
              maxHeight: 220,
              maxWidth: "100%",
              borderRadius: 12,
              boxShadow: "0 4px 18px rgba(44,62,80,0.18)",
            }}
          />
        </div>
      )}

      {showPreface && (
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontSize: 13,
            color: "rgba(44,62,80,0.7)",
            margin: 0,
            textAlign: "center",
          }}
        >
          {showPreface === "camera"
            ? "To take a photo, we'll need access to your camera."
            : "To add a photo, we'll need access to your library."}
        </p>
      )}

      <div className="flex flex-col gap-2 pt-2">
        {order.map((kind) => {
          const b = buttons[kind];
          return (
            <button
              key={kind}
              type="button"
              onClick={b.onClick}
              className="w-full text-center transition-colors"
              style={{
                backgroundColor: "#E8E4D8",
                color: "#2C3E50",
                borderRadius: 12,
                padding: "16px 20px",
                fontFamily: "'Playfair Display', serif",
                fontSize: 18,
                border: "1px solid rgba(44,62,80,0.06)",
                boxShadow: "0 1px 2px rgba(44,62,80,0.04)",
              }}
            >
              {b.label}
            </button>
          );
        })}
        {preview ? (
          <PrimaryCTA onClick={onContinue}>Continue</PrimaryCTA>
        ) : (
          <button
            type="button"
            onClick={onSkip}
            className="w-full text-center transition-colors"
            style={{
              background: "transparent",
              color: "#5B4A3F",
              borderRadius: 12,
              padding: "14px 20px",
              fontFamily: "'Jost', sans-serif",
              fontSize: 15,
              border: "1px solid rgba(44,62,80,0.12)",
            }}
          >
            Skip for now
          </button>
        )}
      </div>
    </LightScreen>
  );
};

export default Onboarding;
