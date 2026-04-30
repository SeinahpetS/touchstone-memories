import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CategoryIcon, {
  CategoryIconCard,
  CATEGORY_BORDER_COLORS,
  CATEGORY_LABELS,
  type CategoryKey,
} from "@/components/CategoryIcon";
import PhotoUpload from "@/components/PhotoUpload";
import AudioUpload from "@/components/AudioUpload";
import CategoryFields, { type CategoryFieldValues } from "@/components/CategoryFields";
import ImprintTypeSelector from "@/components/ImprintTypeSelector";
import MemoryDateInput from "@/components/MemoryDateInput";
import { emptyMemoryDate, formatMemoryDate, type MemoryDate } from "@/lib/memoryDate";
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
  const navigate = useNavigate();
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
  const [savedId, setSavedId] = useState<string | null>(null);
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
      setSavedId(null);
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

      const { data: inserted, error: insertErr } = await (supabase as any)
        .from("touchstones")
        .insert(payload)
        .select("id")
        .single();
      if (insertErr) throw insertErr;

      setSavedId(inserted?.id ?? null);
      setConfirmed(true);
      playSaveFeedback();
      onSaved?.();
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

  // Build values for confirmation card
  const cardCategoryColor = CATEGORY_BORDER_COLORS[category] ?? "#B8860B";
  const cardCategoryLabel = CATEGORY_LABELS[category] ?? category;
  const cardDateLabel =
    (memoryDate.yearText && memoryDate.yearText.trim()) ||
    formatMemoryDate(memoryDate) ||
    "";
  const cardTitle =
    title.trim() ||
    (category === "imprint"
      ? fields.spotifyPick?.title ||
        fields.bookPick?.title ||
        fields.tmdbPick?.title ||
        ""
      : "");
  const cardAnswer = whoWasThere.trim();

  const handleEdit = () => {
    if (savedId) navigate(`/?edit=${savedId}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{
        backgroundColor: confirmed
          ? "rgba(28,22,14,0.72)"
          : "rgba(44,62,80,0.55)",
        transition: "background-color 0.2s ease-out",
      }}
      onClick={confirmed ? onClose : onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add a Touchstone"
    >
      {confirmed ? (
        <>
          <style>{`
            @keyframes ts-fadeInUp {
              from { opacity: 0; transform: translateY(8px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes ts-cardIn {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
            @keyframes ts-goldPulse {
              0%   { box-shadow: 0 0 0 0 rgba(184,134,11,0); }
              35%  { box-shadow: 0 0 28px 6px rgba(184,134,11,0.55); }
              100% { box-shadow: 0 0 0 0 rgba(184,134,11,0); }
            }
            .ts-confirm-text { animation: ts-fadeInUp 0.4s ease-out 0.35s both; }
            .ts-confirm-card {
              animation: ts-cardIn 0.3s ease-out both, ts-goldPulse 2.4s ease-out 0.3s 1 both;
            }
            .ts-confirm-actions { animation: ts-fadeInUp 0.4s ease-out 0.6s both; }
          `}</style>
          <div
            className="flex flex-col items-center justify-center w-full px-6"
            onClick={(e) => e.stopPropagation()}
            role="status"
            aria-live="polite"
          >
            {/* Confirmation text — gold on dark plaque for legibility */}
            <div
              className="ts-confirm-text flex flex-col items-center text-center mb-5"
              style={{
                backgroundColor: "rgba(20,16,10,0.78)",
                padding: "10px 22px 12px",
                borderRadius: 999,
                border: "1px solid rgba(184,134,11,0.35)",
                boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
              }}
            >
              <p
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontStyle: "italic",
                  color: "#E8C36A",
                  fontSize: 18,
                  lineHeight: 1.3,
                  letterSpacing: "0.01em",
                  margin: 0,
                  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                }}
              >
                {CONFIRMATION}
              </p>
            </div>

            {/* Memory artifact card — mirrors MemoryCard structure */}
            <div
              className="ts-confirm-card w-full sm:max-w-sm overflow-hidden"
              style={{
                backgroundColor: "#E8E4D8",
                borderRadius: 12,
                boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
              }}
            >
              {/* Photo / icon-fallback frame — 1:1 square */}
              {photoPreview && category !== "sound" ? (
                <div style={{ aspectRatio: "1 / 1", width: "100%", overflow: "hidden" }}>
                  <img
                    src={photoPreview}
                    alt={cardTitle || "Memory"}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center",
                      display: "block",
                    }}
                  />
                </div>
              ) : (
                <div
                  aria-hidden
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
                      width: 64,
                      height: 64,
                      borderRadius: 12,
                      backgroundColor: "#2C3E50",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CategoryIcon category={category} size={34} color="#B8860B" />
                  </span>
                </div>
              )}

              {/* 3px category bar */}
              <div
                aria-hidden
                style={{
                  height: 9,
                  width: "100%",
                  backgroundColor: cardCategoryColor,
                }}
              />

              {/* Body */}
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
                    <CategoryIcon category={category} size={16} color="#B8860B" />
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
                    {cardCategoryLabel}
                  </span>
                </div>

                {cardTitle && (
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
                    {cardTitle}
                  </h3>
                )}

                {cardDateLabel && (
                  <p
                    style={{
                      fontFamily: "Jost, sans-serif",
                      fontSize: 12,
                      fontWeight: 300,
                      color: "rgba(91,74,63,0.65)",
                      margin: 0,
                    }}
                  >
                    {cardDateLabel}
                  </p>
                )}

                {cardAnswer && (
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
                        fontSize: 12,
                        color: "rgba(91,74,63,0.7)",
                        margin: "0 0 4px",
                      }}
                    >
                      {PROMPT}
                    </p>
                    <p
                      style={{
                        fontFamily: "Jost, sans-serif",
                        fontSize: 14,
                        lineHeight: 1.5,
                        color: "#2C3E50",
                        margin: 0,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {cardAnswer}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="ts-confirm-actions mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="h-11 px-5 rounded-md transition-colors"
                style={{
                  fontFamily: "Jost, sans-serif",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontSize: 12,
                  color: "#F2EEE5",
                  backgroundColor: "rgba(242,238,229,0.08)",
                  border: "1px solid rgba(242,238,229,0.35)",
                }}
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleEdit}
                disabled={!savedId}
                className="h-11 px-5 rounded-md transition-colors"
                style={{
                  fontFamily: "Jost, sans-serif",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontSize: 12,
                  color: "#1C160E",
                  backgroundColor: "#B8860B",
                  border: "1px solid #B8860B",
                  opacity: savedId ? 1 : 0.5,
                }}
              >
                Edit
              </button>
            </div>
          </div>
        </>
      ) : (
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto"
        style={{
          backgroundColor: "#FAF8F3",
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

            {/* 2. Category grid — top row of 4, bottom row of 3 centered */}
            {(() => {
              const topRow = CATEGORIES.slice(0, 4);
              const bottomRow = CATEGORIES.slice(4);
              const renderCard = (c: CategoryKey) => (
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
              );
              return (
                <div className="mb-5 space-y-2">
                  <div className="grid grid-cols-4 gap-2">
                    {topRow.map(renderCard)}
                  </div>
                  <div
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
                    }}
                  >
                    {bottomRow.map((c, i) => (
                      <div
                        key={c}
                        style={{
                          gridColumn: `${i * 2 + 2} / span 2`,
                        }}
                      >
                        {renderCard(c)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

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
