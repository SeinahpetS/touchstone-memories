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
import MemoryArtifact from "@/components/MemoryArtifact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryKey } from "@/components/CategoryIcon";

const NOTE_PLACEHOLDERS: Record<CategoryKey, string> = {
  moment: "What made this worth keeping?",
  person: "What made this worth keeping?",
  object: "What made this worth keeping?",
  place: "What made this worth keeping?",
  food: "What made it taste memorable?",
  sound: "What made this worth keeping?",
  imprint: "Why did this shape who you are?",
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

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [category, setCategory] = useState<CategoryKey>("moment");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [fields, setFields] = useState<CategoryFieldValues>(initialFields);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  const handleCategoryChange = (next: string) => {
    const c = next as CategoryKey;
    setCategory(c);
    logEvent("capture_started", { category: c });
  };

  const handlePhotoSelect = (file: File | null) => {
    setPhotoFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    } else {
      setPhotoPreview(null);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!note.trim() && !title.trim() && !photoFile && !fields.spotifyPick && !fields.bookPick) {
      toast.error("Add a photo, title, or note to save a touchstone.");
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
      toast.error(err.message || "Failed to save touchstone.");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setSaved(null);
    setCategory("moment");
    setTitle("");
    setNote("");
    setSentiment("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setFields(initialFields);
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

            <Input
              type="text"
              placeholder="Name this touchstone"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12 text-base bg-card border-0"
            />

            <Textarea
              placeholder={NOTE_PLACEHOLDERS[category]}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[120px] text-base bg-card border-0 resize-none"
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
