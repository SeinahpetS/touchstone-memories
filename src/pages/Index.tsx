import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { logEvent } from "@/lib/analytics";
import Wordmark from "@/components/Wordmark";
import ProfileAvatarButton from "@/components/ProfileAvatarButton";
import PhotoUpload from "@/components/PhotoUpload";
import CategorySelector from "@/components/CategorySelector";
import CategoryFields, { type CategoryFieldValues } from "@/components/CategoryFields";
import ImprintTypeSelector from "@/components/ImprintTypeSelector";
import MemoryDateInput from "@/components/MemoryDateInput";
import { emptyMemoryDate, type MemoryDate } from "@/lib/memoryDate";
import MemoryArtifact from "@/components/MemoryArtifact";
import ShareMemorySheet from "@/components/ShareMemorySheet";
import { Share } from "lucide-react";
import PostSaveNudge from "@/components/PostSaveNudge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryKey } from "@/components/CategoryIcon";

// HSL values for each category color, used to drive the active focus-ring color
// on the capture form. Falls back to Old Gold when no category is selected.
// Spec colors: Moment #4A6B8A, People #2E7D5E, Object #8B3A62, Place #C2714F,
// Food #C2714F, Sound #5B4A3F, Imprint #2C3E50.
const CATEGORY_RING_HSL: Record<CategoryKey, string> = {
  moment: "211 31% 42%",   // #4A6B8A Blueprint
  person: "152 46% 33%",   // #2E7D5E Malachite
  object: "326 41% 38%",   // #8B3A62 Plum
  place: "17 49% 53%",     // #C2714F Coral
  food: "17 49% 53%",      // #C2714F Coral
  sound: "25 18% 30%",     // #5B4A3F Walnut
  imprint: "210 30% 22%",  // #2C3E50 Ink
  digital_traces: "192 39% 37%", // #367588 Teal
};

const NOTE_PLACEHOLDERS: Record<CategoryKey, string> = {
  moment:
    "What was happening around you in this moment? What do you want to remember about it?",
  person:
    "Who were they to you? What do you want to remember about them?",
  object:
    "Where did this come from? What does it mean to you?",
  place:
    "What brought you here? What do you want to remember about it?",
  food:
    "What tastes stood out to you? What do you want to remember about the meal?",
  sound:
    "What makes this sound memorable? What does it remind you of?",
  imprint:
    "What does this remind you of? Why has it stayed with you?",
  digital_traces:
    "What is this trace? Why does it matter to you?",
};

const IMPRINT_NOTE_PLACEHOLDERS: Record<string, string> = {
  music: "What does this song mean to you? Why does it stay with you?",
  book: "Why does this book stay with you? What did it change in you?",
  film: "What moment from this film has never left you? Why did it matter?",
  tv: "What did this show mean to you at the time? What did it give you?",
  art:
    "What do you feel when you look at this? What does it say that you couldn't say yourself?",
  quote: "Why does this stay with you? When do you come back to it?",
  poem: "What does this poem make you feel? What line from it lives in you?",
  podcast: "What episode or moment stuck with you? What idea did it leave you with?",
};

const initialFields: CategoryFieldValues = {
  locationName: "",
  locationLat: null,
  locationLng: null,
  venueName: "",
  relationshipType: "",
  spotifyPick: null,
  bookPick: null,
  tmdbPick: null,
  imprintSource: "photo",
  imprintType: null,
};

interface CategoryDraft {
  title: string;
  emotionalTone: string;
  note: string;
  sentiment: string;
  whoWasThere: string;
  photoFile: File | null;
  photoPreview: string | null;
  fields: CategoryFieldValues;
  memoryDate: MemoryDate;
}

const emptyDraft = (): CategoryDraft => ({
  title: "",
  emotionalTone: "",
  note: "",
  sentiment: "",
  whoWasThere: "",
  photoFile: null,
  photoPreview: null,
  fields: { ...initialFields },
  memoryDate: emptyMemoryDate(),
});

const WHO_WAS_THERE_CATEGORIES: CategoryKey[] = ["moment", "person", "place", "food", "sound"];

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const [category, setCategory] = useState<CategoryKey>("moment");
  const [drafts, setDrafts] = useState<Partial<Record<CategoryKey, CategoryDraft>>>({
    moment: emptyDraft(),
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<any>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const current = drafts[category] ?? emptyDraft();
  const { title, emotionalTone, note, sentiment, whoWasThere, photoFile, photoPreview, fields, memoryDate } = current;

  const updateDraft = (patch: Partial<CategoryDraft>) => {
    setDrafts((prev) => {
      const existing = prev[category] ?? emptyDraft();
      return { ...prev, [category]: { ...existing, ...patch } };
    });
  };

  const setTitle = (v: string) => updateDraft({ title: v });
  const setEmotionalTone = (v: string) => updateDraft({ emotionalTone: v.slice(0, 20) });
  const setNote = (v: string) => updateDraft({ note: v });
  const setSentiment = (v: string) => updateDraft({ sentiment: v });
  const setWhoWasThere = (v: string) => updateDraft({ whoWasThere: v });
  const setFields = (
    updater: (prev: CategoryFieldValues) => CategoryFieldValues
  ) => updateDraft({ fields: updater(current.fields) });
  const setMemoryDate = (next: MemoryDate) => updateDraft({ memoryDate: next });

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  // Hydrate draft from existing touchstone when editing.
  useEffect(() => {
    if (!user || !editId) return;
    let cancelled = false;
    const load = async () => {
      setEditLoading(true);
      const { data, error } = await (supabase as any)
        .from("touchstones")
        .select("*")
        .eq("id", editId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setEditLoading(false);
      if (error || !data) {
        toast.error("Couldn't load that Touchstone for editing.");
        navigate("/", { replace: true });
        return;
      }
      const cat = data.category as CategoryKey;
      const draft: CategoryDraft = {
        title: data.title ?? "",
        emotionalTone: data.emotional_tone ?? "",
        note: data.note ?? "",
        sentiment: data.sentiment ?? "",
        whoWasThere: data.who_was_there ?? "",
        photoFile: null,
        photoPreview: data.photo_url ?? null,
        fields: {
          ...initialFields,
          locationName: data.location_name ?? "",
          locationLat: data.location_lat ?? null,
          locationLng: data.location_lng ?? null,
          venueName: data.venue_name ?? "",
          relationshipType:
            (data.relationship_type as "personal" | "professional" | "") ?? "",
        },
        memoryDate: {
          season: data.memory_season ?? null,
          year: data.memory_year ?? null,
          month: data.memory_month ?? null,
          day: data.memory_day ?? null,
          yearText: data.when_text ?? (data.memory_year ? String(data.memory_year) : null),
        },
      };
      setCategory(cat);
      setDrafts({ [cat]: draft });
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [editId, user, navigate]);

  const handleCategoryChange = (next: string) => {
    const c = next as CategoryKey;
    setDrafts((prev) => (prev[c] ? prev : { ...prev, [c]: emptyDraft() }));
    setCategory(c);
    logEvent("capture_started", { category: c });
  };

  const handlePhotoSelect = (file: File | null) => {
    if (file) {
      const url = URL.createObjectURL(file);
      updateDraft({ photoFile: file, photoPreview: url });
    } else {
      updateDraft({ photoFile: null, photoPreview: null });
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!note.trim() && !title.trim() && !photoFile && !fields.spotifyPick && !fields.bookPick && !fields.tmdbPick) {
      toast.error("Add a photo, title, or note to save a Touchstone.");
      return;
    }

    setSaving(true);
    try {
      let photo_url: string | null = editId ? current.photoPreview ?? null : null;

      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("memory-photos")
          .upload(path, photoFile);
        if (uploadErr) throw uploadErr;
        const { data } = supabase.storage.from("memory-photos").getPublicUrl(path);
        photo_url = data.publicUrl;
      } else if (!editId && category === "imprint") {
        // Fall back to Spotify/Book/TMDB cover art when no photo is uploaded.
        if (fields.imprintSource === "spotify" && fields.spotifyPick?.image) {
          photo_url = fields.spotifyPick.image;
        } else if (fields.imprintSource === "book" && fields.bookPick?.coverUrl) {
          photo_url = fields.bookPick.coverUrl;
        } else if (fields.imprintSource === "tmdb" && fields.tmdbPick?.image) {
          photo_url = fields.tmdbPick.image;
        }
      }

      // Auto-derive a title for imprints if user left it blank.
      let resolvedTitle = title.trim();
      if (!resolvedTitle && category === "imprint") {
        if (fields.imprintSource === "spotify" && fields.spotifyPick) {
          resolvedTitle = fields.spotifyPick.title;
        } else if (fields.imprintSource === "book" && fields.bookPick) {
          resolvedTitle = fields.bookPick.title;
        } else if (fields.imprintSource === "tmdb" && fields.tmdbPick) {
          resolvedTitle = fields.tmdbPick.title;
        }
      }

      // Auto-fill the memory year for TMDB picks if the user hasn't set one.
      const resolvedMemoryYear =
        memoryDate.year ??
        (category === "imprint" &&
        fields.imprintSource === "tmdb" &&
        fields.tmdbPick?.year
          ? fields.tmdbPick.year
          : null);

      const payload: Record<string, any> = {
        category: category as any,
        title: resolvedTitle || null,
        emotional_tone: emotionalTone.trim() || null,
        note: note.trim() || null,
        sentiment: sentiment || null,
        photo_url,
        location_name: fields.locationName.trim() || null,
        location_lat: fields.locationLat,
        location_lng: fields.locationLng,
        venue_name: fields.venueName.trim() || null,
        relationship_type:
          category === "person" && fields.relationshipType
            ? fields.relationshipType
            : null,
        spotify_id:
          category === "imprint" && fields.imprintSource === "spotify"
            ? fields.spotifyPick?.id ?? null
            : null,
        openlibrary_id:
          category === "imprint" && fields.imprintSource === "book"
            ? fields.bookPick?.id ?? null
            : null,
        tmdb_id:
          category === "imprint" && fields.imprintSource === "tmdb"
            ? fields.tmdbPick?.id ?? null
            : null,
        memory_season: memoryDate.season,
        memory_year: resolvedMemoryYear,
        memory_month: memoryDate.month,
        memory_day: memoryDate.day,
        when_text: memoryDate.yearText && memoryDate.yearText.trim()
          ? memoryDate.yearText.trim()
          : null,
        who_was_there:
          WHO_WAS_THERE_CATEGORIES.includes(category) && whoWasThere.trim()
            ? whoWasThere.trim()
            : null,
      };

      let data: any;
      let error: any;
      if (editId) {
        ({ data, error } = await (supabase as any)
          .from("touchstones")
          .update(payload)
          .eq("id", editId)
          .eq("user_id", user.id)
          .select()
          .single());
      } else {
        ({ data, error } = await (supabase as any)
          .from("touchstones")
          .insert({ ...payload, user_id: user.id })
          .select()
          .single());
      }

      if (error) throw error;
      setSaved(data);
      toast.success("Touchstone added to your Constellation!");
      logEvent(editId ? "memory_updated" : "capture_completed", {
        category,
        has_photo: !!photo_url,
        has_note: !!note.trim(),
      });
      logEvent("artifact_viewed", { memory_id: data.id, category });
    } catch (err: any) {
      toast.error(err.message || "Failed to save Touchstone.");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setSaved(null);
    setCategory("moment");
    setDrafts({ moment: emptyDraft() });
    if (editId) navigate("/archive");
  };

  if (loading || editLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  const ringHsl = CATEGORY_RING_HSL[category] ?? "43 88% 38%";

  return (
    <div
      className="min-h-screen bg-background"
      style={{ ["--ring" as any]: ringHsl }}
    >
      <div className="mx-auto max-w-lg px-5 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate("/archive")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {editId ? "Cancel" : "Constellation"}
          </button>
          <Wordmark />
          <ProfileAvatarButton />
        </div>

        {saved && (
          <div className="flex justify-end -mt-4">
            <button
              onClick={() => setShareOpen(true)}
              className="flex flex-col items-center gap-1"
              aria-label="Share"
            >
              <Share className="h-5 w-5" style={{ color: "#1E2E3E" }} />
              <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, color: "#1E2E3E" }}>
                Share
              </span>
            </button>
          </div>
        )}

        {saved ? (
          <>
            <MemoryArtifact
              photoUrl={saved.photo_url}
              category={saved.category}
              title={saved.title}
              note={saved.note}
              createdAt={saved.created_at}
              memoryDate={{
                season: saved.memory_season ?? null,
                year: saved.memory_year ?? null,
                month: saved.memory_month ?? null,
                day: saved.memory_day ?? null,
              }}
            />
            <PostSaveNudge
              memoryId={saved.id}
              hasDate={Boolean(saved.memory_season || saved.memory_year || saved.memory_month)}
              hasPeople={Boolean(saved.people && String(saved.people).trim())}
              initialDate={{
                season: saved.memory_season ?? null,
                year: saved.memory_year ?? null,
                month: saved.memory_month ?? null,
                day: saved.memory_day ?? null,
              }}
              onPatched={(patch) => setSaved((prev: any) => ({ ...prev, ...patch }))}
            />
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <button
                onClick={() => {
                  const id = saved.id;
                  setSaved(null);
                  navigate(`/?edit=${id}`);
                }}
                className="rounded-full bg-primary px-6 py-3 text-base text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={reset}
                className="rounded-full bg-primary px-6 py-3 text-base text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Capture another
              </button>
              <button
                onClick={() => navigate("/archive")}
                className="rounded-full bg-primary px-6 py-3 text-base text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <PhotoUpload
              file={photoFile}
              preview={photoPreview}
              onSelect={handlePhotoSelect}
            />

            <CategorySelector value={category} onChange={handleCategoryChange} />

            {/* Field 1 — Name */}
            <Input
              type="text"
              placeholder="Name this Touchstone"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12 text-base bg-card border-0 placeholder:italic"
            />

            {/* Imprint sub-type — appears right after Name */}
            {category === "imprint" && (
              <ImprintTypeSelector
                value={fields.imprintType}
                onChange={(t) => {
                  const source: CategoryFieldValues["imprintSource"] =
                    t === "music"
                      ? "spotify"
                      : t === "book"
                      ? "book"
                      : t === "film" || t === "tv"
                      ? "tmdb"
                      : "photo";
                  setFields((prev) => ({
                    ...prev,
                    imprintType: t,
                    imprintSource: source,
                  }));
                }}
              />
            )}

            {/* Field 2 — Date */}
            <MemoryDateInput value={memoryDate} onChange={setMemoryDate} />

            {/* Field 3 — Location & other category-specific fields */}
            <CategoryFields
              category={category}
              values={fields}
              onChange={(next) => setFields((prev) => ({ ...prev, ...next }))}
            />

            {/* Who else was there? — for selected categories only */}
            {WHO_WAS_THERE_CATEGORIES.includes(category) && (
              <Input
                type="text"
                autoComplete="off"
                placeholder="Who else was there?"
                value={whoWasThere}
                onChange={(e) => setWhoWasThere(e.target.value)}
                className="h-12 text-base bg-card border-0 placeholder:italic"
              />
            )}

            {/* Emotional tone — one-word feeling */}
            <Input
              type="text"
              maxLength={20}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="A few words how this feels."
              value={emotionalTone}
              onChange={(e) => setEmotionalTone(e.target.value)}
              className="h-12 text-base bg-card border-0 placeholder:italic"
            />

            {/* Field 4 — Note */}
            <Textarea
              placeholder={
                category === "imprint" && fields.imprintType
                  ? IMPRINT_NOTE_PLACEHOLDERS[fields.imprintType]
                  : NOTE_PLACEHOLDERS[category]
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[120px] text-base bg-card border-0 resize-none placeholder:italic"
            />

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-14 text-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving
                ? editId
                  ? "Updating…"
                  : "Saving…"
                : editId
                ? "Save changes"
                : "Save to Constellation"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
