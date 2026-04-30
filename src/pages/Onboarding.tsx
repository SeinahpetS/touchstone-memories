import { useEffect, useMemo, useState } from "react";
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

// Per-category copy for the Relationship screen (S4).
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
      };
      await (supabase as any).from("touchstones").insert(payload);
      toast.success("Your first Touchstone is saved.");
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
    return <Definition onContinue={() => setStep("category")} />;
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
      setStep("photo");
      return null;
    }
    // The previous step (relationship/who) determines where Back goes.
    const cameFromWho = triggersWhoScreen(draft.category, draft.whoWasThere);
    const back = () => setStep(cameFromWho ? "who" : "relationship");
    const advance = () => setStep("photo");
    const skip = () => {
      update({ emotionalLocation: "" });
      setStep("photo");
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

  // ---- PHOTO ----
  if (step === "photo") {
    return (
      <LightScreen onBack={() => setStep("emotional")} progress={progressFor("photo")}>

        <Question
          kicker="Step 2 of 4"
          title="Add a photo, if you have one."
          subtitle="Optional — you can also skip this."
        />
        <PhotoUpload
          file={photoFile}
          preview={photoPreview}
          onSelect={handlePhotoSelect}
        />
        <div className="flex flex-col gap-3 pt-2">
          <PrimaryCTA onClick={() => setStep("details")}>
            {photoPreview ? "Continue" : "Skip for now"}
          </PrimaryCTA>
        </div>
      </LightScreen>
    );
  }

  // ---- DETAILS (note) ----
  if (step === "details") {
    return (
      <LightScreen onBack={() => setStep("photo")} progress={progressFor("details")}>
        <Question
          kicker="Step 3 of 4"
          title="Anything you want to remember?"
          subtitle="A few words — whatever you want to keep. Optional."
        />
        <Textarea
          placeholder={NOTE_PLACEHOLDERS[draft.category]}
          value={draft.note}
          onChange={(e) => update({ note: e.target.value })}
          rows={5}
          className="text-base bg-card border-0 placeholder:italic resize-none"
        />
        <PrimaryCTA onClick={() => setStep("date")}>
          Continue
        </PrimaryCTA>
      </LightScreen>
    );
  }

  if (step === "date") {
    return (
      <LightScreen onBack={() => setStep("details")} progress={progressFor("date")}>
        <Question
          kicker="Step 4 of 4"
          title="When was this?"
          subtitle="Approximate is fine. Skip if you'd rather not say."
        />
        <MemoryDateInput
          value={draft.memoryDate}
          onChange={(d) => update({ memoryDate: d })}
        />
        <PrimaryCTA onClick={() => setStep("artifact")}>See it rendered</PrimaryCTA>
      </LightScreen>
    );
  }

  // ---- ARTIFACT REVEAL ----
  if (step === "artifact") {
    return (
      <LightScreen>
        <ArtifactReveal
          draft={draft}
          photoPreview={photoPreview}
          onClaim={() => setStep("signup")}
          onEdit={() => setStep("details")}
        />
      </LightScreen>
    );
  }

  // ---- SIGN UP ----
  return (
    <LightScreen onBack={() => setStep("artifact")} progress={progressFor("signup")}>
      <div className="text-center space-y-2">
        <p
          style={{
            fontFamily: "Jost, sans-serif",
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "#B8860B",
          }}
        >
          One last step
        </p>
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 26,
            color: "#2C3E50",
            margin: 0,
          }}
        >
          Keep this Touchstone forever.
        </h2>
        <p className="text-base text-muted-foreground">
          Create a private archive — only you can see it.
        </p>
      </div>

      <Button
        onClick={handleGoogle}
        variant="outline"
        className="w-full h-12 text-base gap-3"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.806.54-1.8368.8595-3.0477.8595-2.344 0-4.3282-1.5831-5.036-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z" />
          <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.2823-1.1168-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9573C.3477 6.1731 0 7.5477 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71z" />
          <path fill="#EA4335" d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3459l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z" />
        </svg>
        Continue with Google
      </Button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-sm text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleEmailSignup} className="space-y-3">
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
const Definition = ({ onContinue }: { onContinue: () => void }) => (
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
    <div className="ts-def-cta flex justify-center pb-2">
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

const ArtifactReveal = ({
  draft,
  photoPreview,
  onClaim,
  onEdit,
}: {
  draft: OnboardingDraft;
  photoPreview: string | null;
  onClaim: () => void;
  onEdit: () => void;
}) => {
  const cat = draft.category;
  const barColor = CATEGORY_BORDER_COLORS[cat] ?? "#B8860B";
  const dateLabel =
    (draft.memoryDate.yearText && draft.memoryDate.yearText.trim()) ||
    formatMemoryDate(draft.memoryDate) ||
    "";

  return (
    <div className="space-y-6 pt-4">
      <style>{`
        @keyframes ts-onb-cardIn {
          from { opacity: 0; transform: scale(0.96) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes ts-onb-pulse {
          0% { box-shadow: 0 12px 30px rgba(0,0,0,0.12), 0 0 0 0 rgba(184,134,11,0); }
          40% { box-shadow: 0 12px 30px rgba(0,0,0,0.18), 0 0 28px 6px rgba(184,134,11,0.55); }
          100% { box-shadow: 0 12px 30px rgba(0,0,0,0.12), 0 0 0 0 rgba(184,134,11,0); }
        }
        @keyframes ts-onb-fade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ts-onb-confirm { animation: ts-onb-fade 0.5s ease-out 0.1s both; }
        .ts-onb-card {
          animation: ts-onb-cardIn 0.45s ease-out both, ts-onb-pulse 2.6s ease-out 0.4s 1 both;
        }
        .ts-onb-actions { animation: ts-onb-fade 0.5s ease-out 0.7s both; }
      `}</style>

      <div className="ts-onb-confirm text-center space-y-1">
        <p
          style={{
            fontFamily: "Jost, sans-serif",
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "#B8860B",
          }}
        >
          Saved
        </p>
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontSize: 20,
            color: "#2C3E50",
            margin: 0,
          }}
        >
          Part of your story now.
        </p>
      </div>

      {/* Card mirrors MemoryCard structure */}
      <div
        className="ts-onb-card mx-auto w-full max-w-sm overflow-hidden"
        style={{ backgroundColor: "#E8E4D8", borderRadius: 12 }}
      >
        {photoPreview ? (
          <div style={{ aspectRatio: "1 / 1", width: "100%", overflow: "hidden" }}>
            <img
              src={photoPreview}
              alt={draft.title || "Memory"}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        ) : (
          <div
            style={{
              aspectRatio: "1 / 1",
              width: "100%",
              backgroundColor: "#E4E2DC",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                width: 72,
                height: 72,
                borderRadius: 12,
                backgroundColor: "#2C3E50",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CategoryIcon category={cat} size={38} color="#B8860B" />
            </span>
          </div>
        )}

        <div style={{ height: 9, width: "100%", backgroundColor: barColor }} />

        <div style={{ padding: 14 }} className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                backgroundColor: "#2C3E50",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CategoryIcon category={cat} size={16} color="#B8860B" />
            </span>
            <span
              style={{
                fontFamily: "Jost, sans-serif",
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#8A8070",
              }}
            >
              {CATEGORY_LABELS[cat]}
            </span>
          </div>

          {draft.title.trim() && (
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 20,
                fontWeight: 600,
                color: "#2C3E50",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {draft.title.trim()}
            </h3>
          )}
          {dateLabel && (
            <p
              style={{
                fontFamily: "Jost, sans-serif",
                fontSize: 12,
                fontWeight: 300,
                color: "rgba(91,74,63,0.65)",
                margin: 0,
              }}
            >
              {dateLabel}
            </p>
          )}
          {draft.note.trim() && (
            <>
              <div
                aria-hidden
                style={{
                  height: 1,
                  width: "100%",
                  backgroundColor: "rgba(91,74,63,0.15)",
                  margin: "8px 0 6px",
                }}
              />
              <p
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontStyle: "italic",
                  fontSize: 15,
                  color: "#2C3E50",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {draft.note.trim()}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="ts-onb-actions space-y-3">
        <PrimaryCTA onClick={onClaim}>Claim this Touchstone</PrimaryCTA>
        <button
          onClick={onEdit}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          style={{ fontFamily: "Jost, sans-serif", letterSpacing: "0.1em" }}
        >
          Edit
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
