import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { logEvent } from "@/lib/analytics";
import Wordmark from "@/components/Wordmark";
import PhotoUpload from "@/components/PhotoUpload";
import CategorySelector from "@/components/CategorySelector";
import CategoryFields, { type CategoryFieldValues } from "@/components/CategoryFields";
import MemoryDateInput from "@/components/MemoryDateInput";
import { emptyMemoryDate, type MemoryDate } from "@/lib/memoryDate";
import MemoryArtifact from "@/components/MemoryArtifact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryKey } from "@/components/CategoryIcon";

const NOTE_PLACEHOLDERS: Record<CategoryKey, string> = {
  moment:
    "What was happening around you in this moment? What do you want to remember about how it felt?",
  person:
    "Who is this person to you? What's something about them you'd want someone to know?",
  object: "What's the story behind this? Why does it matter to you?",
  place:
    "What do you remember feeling when you were here? What does this place mean to you?",
  food:
    "What was this dish, and what made it taste memorable? What do you want to remember about it?",
  sound:
    "What is this sound, and how does it make you feel? What does it remind you of?",
  imprint: "Why did this shape who you are?",
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
};

const initialFields: CategoryFieldValues = {
  locationName: "",
  locationLat: null,
  locationLng: null,
  venueName: "",
  relationshipType: "",
  spotifyPick: null,
  bookPick: null,
  imprintSource: "photo",
  imprintType: null,
};

interface CategoryDraft {
  title: string;
  note: string;
  sentiment: string;
  photoFile: File | null;
  photoPreview: string | null;
  fields: CategoryFieldValues;
  memoryDate: MemoryDate;
}

const emptyDraft = (): CategoryDraft => ({
  title: "",
  note: "",
  sentiment: "",
  photoFile: null,
  photoPreview: null,
  fields: { ...initialFields },
  memoryDate: emptyMemoryDate(),
});

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<CategoryKey, CategoryDraft>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<any>(null);

  const current = (category && drafts[category]) || emptyDraft();
  const { title, note, sentiment, photoFile, photoPreview, fields, memoryDate } = current;
  const categorySelected = category !== null;

  const updateDraft = (patch: Partial<CategoryDraft>) => {
    if (!category) return;
    setDrafts((prev) => {
      const existing = prev[category] ?? emptyDraft();
      return { ...prev, [category]: { ...existing, ...patch } };
    });
  };

  const setTitle = (v: string) => updateDraft({ title: v });
  const setNote = (v: string) => updateDraft({ note: v });
  const setSentiment = (v: string) => updateDraft({ sentiment: v });
  const setFields = (
    updater: (prev: CategoryFieldValues) => CategoryFieldValues
  ) => updateDraft({ fields: updater(current.fields) });
  const setMemoryDate = (next: MemoryDate) => updateDraft({ memoryDate: next });

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  const handleCategoryChange = (next: string) => {
    const c = next as CategoryKey;
    if (category === c) {
      // Tapping the active category deselects it → collapses photo zone.
      setCategory(null);
      return;
    }
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
    if (!note.trim() && !title.trim() && !photoFile && !fields.spotifyPick && !fields.bookPick) {
      toast.error("Add a photo, title, or note to save a Touchstone.");
      return;
    }

    setSaving(true);
    try {
      let photo_url: string | null = null;

      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("memory-photos")
          .upload(path, photoFile);
        if (uploadErr) throw uploadErr;
        const { data } = supabase.storage.from("memory-photos").getPublicUrl(path);
        photo_url = data.publicUrl;
      } else if (category === "imprint") {
        // Fall back to Spotify/Book cover art when no photo is uploaded.
        if (fields.imprintSource === "spotify" && fields.spotifyPick?.image) {
          photo_url = fields.spotifyPick.image;
        } else if (fields.imprintSource === "book" && fields.bookPick?.coverUrl) {
          photo_url = fields.bookPick.coverUrl;
        }
      }

      // Auto-derive a title for imprints if user left it blank.
      let resolvedTitle = title.trim();
      if (!resolvedTitle && category === "imprint") {
        if (fields.imprintSource === "spotify" && fields.spotifyPick) {
          resolvedTitle = fields.spotifyPick.title;
        } else if (fields.imprintSource === "book" && fields.bookPick) {
          resolvedTitle = fields.bookPick.title;
        }
      }

      const { data, error } = await (supabase as any)
        .from("touchstones")
        .insert({
          user_id: user.id,
          category: category as any,
          title: resolvedTitle || null,
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
          memory_season: memoryDate.season,
          memory_year: memoryDate.year,
          memory_month: memoryDate.month,
          memory_day: memoryDate.day,
        })
        .select()
        .single();

      if (error) throw error;
      setSaved(data);
      logEvent("capture_completed", {
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
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-5 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Wordmark />
          <button
            onClick={() => navigate("/archive")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Constellation
          </button>
        </div>

        {saved ? (
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
            onClose={reset}
          />
        ) : (
          <>
            <PhotoUpload
              file={photoFile}
              preview={photoPreview}
              onSelect={handlePhotoSelect}
            />

            <CategorySelector value={category} onChange={handleCategoryChange} />

            <CategoryFields
              category={category}
              values={fields}
              onChange={(next) => setFields((prev) => ({ ...prev, ...next }))}
            />

            <MemoryDateInput value={memoryDate} onChange={setMemoryDate} />

            <Input
              type="text"
              placeholder="Name this Touchstone"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12 text-base bg-card border-0"
            />

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
              {saving ? "Saving…" : "Save to Constellation"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
