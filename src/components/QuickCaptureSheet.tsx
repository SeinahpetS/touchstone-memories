import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CategoryIconCard, type CategoryKey } from "@/components/CategoryIcon";
import { cn } from "@/lib/utils";

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

const PROMPT = "Who else would remember this?";
const CONFIRMATION = "Saved. Part of your story now.";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const QuickCaptureSheet = ({ open, onClose, onSaved }: Props) => {
  const { user } = useAuth();
  const [category, setCategory] = useState<CategoryKey>("moment");
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCategory("moment");
      setAnswer("");
      setSaving(false);
      setConfirmed(false);
      setError(null);
    }
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleSave = async () => {
    if (!user) return;
    const trimmed = answer.trim();
    if (!trimmed || trimmed.length > 1000) {
      setError("Add a short note before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: insertErr } = await supabase.from("touchstones").insert({
      user_id: user.id,
      category: category as any,
      ai_prompt: PROMPT,
      ai_answer: trimmed,
      note: trimmed,
    });
    setSaving(false);
    if (insertErr) {
      setError("Couldn't save right now. Try again.");
      return;
    }
    setConfirmed(true);
    onSaved?.();
    window.setTimeout(() => {
      onClose();
    }, 1800);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: "rgba(44,62,80,0.55)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Quick capture"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl"
        style={{
          backgroundColor: "#F2EEE5",
          padding: "24px 22px 28px",
          boxShadow: "0 -12px 40px rgba(0,0,0,0.18)",
          border: "1px solid rgba(184,134,11,0.25)",
        }}
      >
        {confirmed ? (
          <div className="py-10 flex flex-col items-center text-center">
            <span
              aria-hidden
              className="inline-block h-3 w-3 rotate-45 mb-5"
              style={{ backgroundColor: "#B8860B" }}
            />
            <p
              style={{
                fontFamily: "'Playfair Display', serif",
                color: "#2C3E50",
                fontSize: 22,
                lineHeight: 1.35,
              }}
            >
              {CONFIRMATION}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: "#2C3E50",
                  fontSize: 20,
                }}
              >
                Hold a moment
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

            {/* Category grid 4x2 */}
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

            {/* Prompt */}
            <p
              style={{
                fontFamily: "'Playfair Display', serif",
                color: "#2C3E50",
                fontSize: 18,
                lineHeight: 1.4,
                marginBottom: 10,
              }}
            >
              {PROMPT}
            </p>

            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              maxLength={1000}
              rows={4}
              autoFocus
              placeholder="A name, a face, a feeling…"
              className="w-full rounded-lg p-3 outline-none resize-none"
              style={{
                backgroundColor: "#E8E4D8",
                border: "1px solid rgba(184,134,11,0.3)",
                color: "#2C3E50",
                fontFamily: "'Source Sans 3', sans-serif",
                fontSize: 16,
              }}
            />

            {error && (
              <p
                className="mt-2 text-sm"
                style={{ color: "#E07A5F", fontFamily: "'Source Sans 3', sans-serif" }}
              >
                {error}
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !answer.trim()}
              className={cn(
                "mt-5 w-full h-12 rounded-md transition-colors text-base",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                (saving || !answer.trim()) && "opacity-60 cursor-not-allowed"
              )}
              style={{ fontFamily: "Jost, sans-serif", letterSpacing: "0.04em" }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default QuickCaptureSheet;
