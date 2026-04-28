import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CategoryIconCard, type CategoryKey } from "@/components/CategoryIcon";
import PhotoUpload from "@/components/PhotoUpload";
import AudioUpload from "@/components/AudioUpload";
import CategoryFields, { type CategoryFieldValues } from "@/components/CategoryFields";
import ImprintTypeSelector from "@/components/ImprintTypeSelector";
import MemoryDateInput from "@/components/MemoryDateInput";
import { emptyMemoryDate, type MemoryDate } from "@/lib/memoryDate";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { playSaveFeedback } from "@/lib/saveFeedback";

const CATEGORIES: CategoryKey[] = [
  "moment",
  "person",
  "object",
  "place",
  "food",
  "sound",
  "imprint",
];

const PLURAL_LABELS: Record<CategoryKey, string> = {
  moment: "Moments",
  person: "People",
  object: "Objects",
  place: "Places",
  food: "Foods",
  sound: "Sounds",
  imprint: "Imprints",
};

const NOTE_PLACEHOLDERS: Record<CategoryKey, string> = {
  moment:
    "What was happening around you in this moment? What do you want to remember about it?",
  person: "Who were they to you? What do you want to remember about them?",
  object: "Where did this come from? What does it mean to you?",
  place: "What brought you here? What do you want to remember about it?",
  food: "What tastes stood out to you? What do you want to remember about the meal?",
  sound: "What makes this sound memorable? What does it remind you of?",
  imprint: "What does this remind you of? Why has it stayed with you?",
};

const IMPRINT_NOTE_PLACEHOLDERS: Record<string, string> = {
  music: "What does this song mean to you? Why does it stay with you?",
  book: "Why does this book stay with you? What did it change in you?",
  film: "What moment from this film has never left you? Why did it matter?",
  tv: "What did this show mean to you at the time? What did it give you?",
  art: "What do you feel when you look at this? What does it say that you couldn't say yourself?",
  quote: "Why does this stay with you? When do you come back to it?",
  poem: "What does this poem make you feel? What line from it lives in you?",
  podcast: "What episode or moment stuck with you? What idea did it leave you with?",
};

const PROMPT = "Who else would remember this?";
const CONFIRMATION = "Saved. Part of your story now.";

const WHO_WAS_THERE_CATEGORIES: CategoryKey[] = [
  "moment",
  "person",
  "place",
  "food",
  "sound",
];

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

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const QuickCaptureSheet = ({ open, onClose, onSaved }: Props) => {
  const { user } = useAuth();
  const [category, setCategory] = useState<CategoryKey>("moment");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [emotionalTone, setEmotionalTone] = useState("");
  const [whoWasThere, setWhoWasThere] = useState("");
  const [memoryDate, setMemoryDate] = useState<MemoryDate>(emptyMemoryDate());
  const [fields, setFields] = useState<CategoryFieldValues>({ ...initialFields });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCategory("moment");
      setTitle("");
      setNote("");
      setEmotionalTone("");
      setWhoWasThere("");
      setMemoryDate(emptyMemoryDate());
      setFields({ ...initialFields });
      setPhotoFile(null);
      setPhotoPreview(null);
      setSaving(false);
      setConfirmed(false);
      setError(null);
    }
  }, [open]);

  // Manage object URL for preview
  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const canSave =
    !!photoFile ||
    title.trim().length > 0 ||
    note.trim().length > 0 ||
    !!fields.spotifyPick ||
    !!fields.bookPick ||
    !!fields.tmdbPick;

  const handleSave = async () => {
    if (!user) return;
    if (!canSave) {
      setError("Add a photo, title, or answer before saving.");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      let photo_url: string | null = null;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("memory-photos")
          .upload(path, photoFile);
        if (uploadErr) throw uploadErr;
        const { data } = supabase.storage
          .from("memory-photos")
          .getPublicUrl(path);
        photo_url = data.publicUrl;
      } else if (category === "imprint") {
        if (fields.imprintSource === "spotify" && fields.spotifyPick?.image) {
          photo_url = fields.spotifyPick.image;
        } else if (fields.imprintSource === "book" && fields.bookPick?.coverUrl) {
          photo_url = fields.bookPick.coverUrl;
        } else if (fields.imprintSource === "tmdb" && fields.tmdbPick?.image) {
          photo_url = fields.tmdbPick.image;
        }
      }

      // Auto-derive title for imprints if blank
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

      const resolvedMemoryYear =
        memoryDate.year ??
        (category === "imprint" &&
        fields.imprintSource === "tmdb" &&
        fields.tmdbPick?.year
          ? fields.tmdbPick.year
          : null);

      const payload: Record<string, any> = {
        user_id: user.id,
        category: category as any,
        title: resolvedTitle || null,
        emotional_tone: emotionalTone.trim() || null,
        note: note.trim() || null,
        ai_prompt: PROMPT,
        ai_answer: whoWasThere.trim() || null,
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
        when_text:
          memoryDate.yearText && memoryDate.yearText.trim()
            ? memoryDate.yearText.trim()
            : null,
        who_was_there:
          WHO_WAS_THERE_CATEGORIES.includes(category) && whoWasThere.trim()
            ? whoWasThere.trim()
            : null,
      };

      const { error: insertErr } = await (supabase as any)
        .from("touchstones")
        .insert(payload);
      if (insertErr) throw insertErr;

      setConfirmed(true);
      playSaveFeedback();
      onSaved?.();
      window.setTimeout(() => {
        onClose();
      }, 1800);
    } catch (e) {
      setError("Couldn't save right now. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const notePlaceholder =
    category === "imprint" && fields.imprintType
      ? IMPRINT_NOTE_PLACEHOLDERS[fields.imprintType]
      : NOTE_PLACEHOLDERS[category];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: confirmed ? "rgba(20,18,16,0.92)" : "rgba(44,62,80,0.55)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add a Touchstone"
    >
      {confirmed ? (
        <div
          className="animate-fade-in flex flex-col items-center text-center px-8"
          onClick={(e) => e.stopPropagation()}
          role="status"
          aria-live="polite"
        >
          <span
            aria-hidden
            className="inline-block h-3 w-3 rotate-45 mb-5"
            style={{ backgroundColor: "#B8860B" }}
          />
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "#B8860B",
              fontSize: 26,
              lineHeight: 1.35,
              letterSpacing: "0.01em",
            }}
          >
            {CONFIRMATION}
          </p>
        </div>
      ) : (
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto"
        style={{
          backgroundColor: "#F2EEE5",
          padding: "24px 22px 28px",
          boxShadow: "0 -12px 40px rgba(0,0,0,0.18)",
          border: "1px solid rgba(184,134,11,0.25)",
        }}
      >
        <>
            <div className="flex items-center justify-between mb-4">
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: "#2C3E50",
                  fontSize: 20,
                }}
              >
                Add a Touchstone
              </h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="text-sm uppercase tracking-[0.12em]"
                style={{ color: "#5B4A3F", fontFamily: "Jost, sans-serif" }}
              >
                Close
              </button>
            </div>

            {/* 1. Photo / Audio upload */}
            <div className="mb-5">
              {category === "sound" ? (
                <AudioUpload file={photoFile} onSelect={setPhotoFile} />
              ) : (
                <PhotoUpload
                  file={photoFile}
                  preview={photoPreview}
                  onSelect={setPhotoFile}
                />
              )}
            </div>

            {/* 2. Category grid */}
            <div className="grid grid-cols-4 gap-2 mb-5">
              {CATEGORIES.map((c) => (
                <CategoryIconCard
                  key={c}
                  category={c}
                  label={PLURAL_LABELS[c]}
                  className="w-full !min-w-0 !px-[8px] !py-[14px] !gap-1.5"
                  iconSize={26}
                  labelSize={10}
                  active={category === c}
                  onClick={() => setCategory(c)}
                />
              ))}
            </div>

            {/* 3. Title */}
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Name this Touchstone"
              className="h-12 text-base bg-card border-0 placeholder:italic mb-4"
            />

            {/* Imprint sub-type */}
            {category === "imprint" && (
              <div className="mb-4">
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
              </div>
            )}

            {/* Date */}
            <div className="mb-4">
              <MemoryDateInput value={memoryDate} onChange={setMemoryDate} />
            </div>

            {/* Category-specific fields (location, relationship, restaurant, imprint search) */}
            <div className="mb-4">
              <CategoryFields
                category={category}
                values={fields}
                onChange={(next) => setFields((prev) => ({ ...prev, ...next }))}
              />
            </div>

            {/* Emotional tone */}
            <Input
              type="text"
              maxLength={20}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="A few words how this feels."
              value={emotionalTone}
              onChange={(e) => setEmotionalTone(e.target.value.slice(0, 20))}
              className="h-12 text-base bg-card border-0 placeholder:italic mb-4"
            />

            {/* Note — category-specific placeholder */}
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={notePlaceholder}
              className="min-h-[120px] text-base bg-card border-0 resize-none placeholder:italic mb-5"
            />

            <Input
              type="text"
              autoComplete="off"
              value={whoWasThere}
              onChange={(e) => setWhoWasThere(e.target.value)}
              placeholder={PROMPT}
              className="h-12 text-base bg-card border-0 placeholder:italic"
            />

            {error && (
              <p
                className="mt-2 text-sm"
                style={{
                  color: "#E07A5F",
                  fontFamily: "'Source Sans 3', sans-serif",
                }}
              >
                {error}
              </p>
            )}

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving || !canSave}
              className={cn(
                "mt-5 w-full h-12 rounded-md transition-colors text-base",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                (saving || !canSave) && "opacity-60 cursor-not-allowed"
              )}
              style={{ fontFamily: "Jost, sans-serif", letterSpacing: "0.04em" }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </>
      </div>
      )}
    </div>
  );
};

export default QuickCaptureSheet;
