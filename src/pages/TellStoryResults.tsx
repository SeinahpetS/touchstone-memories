import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import CategoryIcon, { CATEGORY_LABELS, type CategoryKey } from "@/components/CategoryIcon";
import { playSaveFeedback } from "@/lib/saveFeedback";

type Artifact = {
  category: string;
  title: string;
  note: string;
};

const NAVY = "#1E2E3E";
const IVORY = "#F2EEE5";
const CARD_BG = "#E8E4D8";
const MUTED = "#C9C3B5";
const GOLD = "#B8860B";
const SECONDARY = "#5B4A3F";

const CATEGORY_KEYS: CategoryKey[] = [
  "moment", "person", "object", "place", "food", "sound", "imprint", "digital_traces",
];

const normalizeCategory = (raw: string): CategoryKey => {
  const lower = (raw || "").toLowerCase().trim();
  if (lower === "people") return "person";
  if ((CATEGORY_KEYS as string[]).includes(lower)) return lower as CategoryKey;
  return "moment";
};

const TellStoryResults = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Mutable deck — front of deck is deck[0].
  const [deck, setDeck] = useState<Artifact[]>([]);
  const [originalCount, setOriginalCount] = useState(0);
  const [decisions, setDecisions] = useState<("kept" | "skipped")[]>([]);
  // Number of right-swipes (navigation forward) that can still be undone via swipe-left.
  const [historyCount, setHistoryCount] = useState(0);

  // Card drag/exit animation state.
  const [drag, setDrag] = useState(0);
  const [exiting, setExiting] = useState<null | "left" | "right" | "decided">(null);
  const startX = useRef<number | null>(null);

  // Keep-this-touchstone confirmation state.
  const [confirming, setConfirming] = useState(false);

  // Edit overlay state.
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editCategory, setEditCategory] = useState<CategoryKey>("moment");
  const [editPrivate, setEditPrivate] = useState(false);
  const [editPerson, setEditPerson] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("ts_story_artifacts");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const moments = parsed.filter((a: Artifact) => a.category?.toLowerCase() === "moment");
          const others = parsed.filter((a: Artifact) => a.category?.toLowerCase() !== "moment");
          const ordered = [...moments, ...others];
          setDeck(ordered);
          setOriginalCount(ordered.length);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const current = deck[0];
  const done = originalCount > 0 && deck.length === 0;

  // Swipe right: rotate front card to back of deck (navigation only).
  const swipeRight = () => {
    if (exiting || confirming || deck.length <= 1) return;
    setExiting("right");
    setTimeout(() => {
      setDeck((d) => (d.length > 1 ? [...d.slice(1), d[0]] : d));
      setHistoryCount((h) => h + 1);
      setDrag(0);
      setExiting(null);
    }, 220);
  };

  // Swipe left: undo last forward swipe — bring card from back to front.
  const swipeLeft = () => {
    if (exiting || confirming || historyCount <= 0 || deck.length <= 1) return;
    setExiting("left");
    setTimeout(() => {
      setDeck((d) =>
        d.length > 1 ? [d[d.length - 1], ...d.slice(0, -1)] : d
      );
      setHistoryCount((h) => Math.max(0, h - 1));
      setDrag(0);
      setExiting(null);
    }, 220);
  };

  const removeFrontCard = () => {
    setDeck((d) => d.slice(1));
    // After removal, historyCount no longer applies to a previous card from this position.
    setHistoryCount(0);
    setDrag(0);
    setExiting(null);
  };

  // Skip — remove card, no save.
  const handleSkip = () => {
    if (exiting || confirming || !current) return;
    setExiting("decided");
    setTimeout(() => {
      setDecisions((d) => [...d, "skipped"]);
      removeFrontCard();
    }, 220);
  };

  // Keep this Touchstone — confirmation animation, save to Supabase, advance.
  const runKeepConfirmation = async (artifactOverride?: Artifact) => {
    const artifact = artifactOverride ?? current;
    if (!artifact || !user) {
      toast.error("Sign in to save your Touchstones.");
      return;
    }
    setConfirming(true);
    playSaveFeedback();

    // Persist to Supabase during the confirmation animation.
    try {
      const payload: Record<string, any> = {
        user_id: user.id,
        category: normalizeCategory(artifact.category),
        title: artifact.title?.trim() || null,
        note: artifact.note?.trim() || null,
      };
      const { error } = await (supabase as any).from("touchstones").insert(payload);
      if (error) throw error;
    } catch (err: any) {
      toast.error(err?.message || "Couldn't save that Touchstone.");
      setConfirming(false);
      return;
    }

    // Confirmation duration: 800ms checkmark, then slide away.
    setTimeout(() => {
      setExiting("decided");
      setTimeout(() => {
        setDecisions((d) => [...d, "kept"]);
        setConfirming(false);
        removeFrontCard();
      }, 260);
    }, 850);
  };

  // Pointer handlers — direction is navigation only.
  const onPointerDown = (e: React.PointerEvent) => {
    if (exiting || confirming) return;
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    // Block leftward drag past 0 on the first (no-previous) card.
    if (dx < 0 && historyCount <= 0) {
      setDrag(Math.max(dx * 0.2, -24)); // small resistance
    } else {
      setDrag(dx);
    }
  };
  const onPointerUp = () => {
    if (startX.current === null) return;
    const d = drag;
    startX.current = null;
    if (d > 100) swipeRight();
    else if (d < -100 && historyCount > 0) swipeLeft();
    else setDrag(0);
  };

  // Edit flow.
  const openEdit = () => {
    if (!current) return;
    setEditTitle(current.title || "");
    setEditNote(current.note || "");
    setEditCategory(normalizeCategory(current.category));
    setEditPrivate(false);
    setEditPerson("");
    setEditing(true);
  };

  const handleEditSave = async () => {
    const updated: Artifact = {
      category: editCategory,
      title: editTitle.trim(),
      note: editNote.trim(),
    };
    // Update the front card with revised content, then trigger keep confirmation.
    setDeck((d) => (d.length > 0 ? [updated, ...d.slice(1)] : d));
    setEditing(false);
    // Slight delay so the user sees the revised card before the pulse begins.
    setTimeout(() => {
      void runKeepConfirmation(updated);
    }, 80);
  };

  const dots = useMemo(() => {
    const decided = decisions.length;
    return Array.from({ length: originalCount }).map((_, i) => (
      <span
        key={i}
        style={{
          width: 8,
          height: 8,
          borderRadius: 9999,
          background: i < decided ? NAVY : MUTED,
          opacity: i < decided ? 1 : 0.7,
          transition: "background 200ms",
        }}
      />
    ));
  }, [originalCount, decisions]);

  if (originalCount === 0) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ backgroundColor: IVORY }}
      >
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            color: "#2C3E50",
            fontSize: 20,
            textAlign: "center",
          }}
        >
          No story found. Tell me one first.
        </p>
        <button
          onClick={() => navigate("/tell-a-story")}
          style={{
            marginTop: 20,
            background: NAVY,
            color: GOLD,
            borderRadius: 9999,
            padding: "12px 28px",
            fontFamily: "'Jost', sans-serif",
            border: "none",
          }}
        >
          Tell a story
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ backgroundColor: IVORY }}
      >
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            color: NAVY,
            fontSize: 28,
            textAlign: "center",
            margin: 0,
          }}
        >
          That's everything we found.
        </p>
        <button
          onClick={() => navigate("/tell-a-story")}
          style={{
            marginTop: 32,
            background: "transparent",
            color: SECONDARY,
            border: `1.5px solid ${SECONDARY}`,
            borderRadius: 9999,
            padding: "14px 32px",
            fontFamily: "'Jost', sans-serif",
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          Something's missing — add another
        </button>
      </div>
    );
  }

  const remaining = deck.length;
  const rotation = drag * 0.05;
  const exitX =
    exiting === "right" || exiting === "decided"
      ? 600
      : exiting === "left"
        ? -600
        : drag;
  const exitRot = exiting && exiting !== "decided" ? (exiting === "right" ? 18 : -18) : rotation;
  const currentCatKey = normalizeCategory(current.category);
  const decidedCount = decisions.length;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: IVORY }}>
      <div className="mx-auto w-full max-w-lg px-5 pt-8 pb-10 flex-1 flex flex-col">
        {/* Card stack */}
        <div
          className="relative flex-1 flex items-center justify-center"
          style={{ minHeight: 380, marginTop: 24 }}
        >
          {remaining > 2 && (
            <div
              aria-hidden
              style={{
                position: "absolute",
                width: "86%",
                height: 300,
                background: CARD_BG,
                borderRadius: 16,
                opacity: 0.5,
                transform: "translateY(20px) scale(0.92)",
                boxShadow: "0 4px 16px rgba(30,46,62,0.06)",
              }}
            />
          )}
          {remaining > 1 && (
            <div
              aria-hidden
              style={{
                position: "absolute",
                width: "92%",
                height: 320,
                background: CARD_BG,
                borderRadius: 16,
                opacity: 0.75,
                transform: "translateY(10px) scale(0.96)",
                boxShadow: "0 6px 18px rgba(30,46,62,0.08)",
              }}
            />
          )}

          {/* Active card */}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              position: "relative",
              width: "100%",
              background: CARD_BG,
              borderRadius: 16,
              padding: "28px 28px 24px",
              display: "flex",
              flexDirection: "column",
              minHeight: 340,
              boxShadow: confirming
                ? `0 12px 30px rgba(30,46,62,0.12), 0 0 0 3px ${GOLD}`
                : "0 12px 30px rgba(30,46,62,0.12)",
              transform: `translateX(${exitX}px) rotate(${exitRot}deg)`,
              transition:
                exiting || drag === 0
                  ? "transform 220ms ease-out, box-shadow 600ms ease-in-out"
                  : "box-shadow 600ms ease-in-out",
              touchAction: "pan-y",
              cursor: "grab",
              userSelect: "none",
            }}
          >
            {/* Navigation hints */}
            <div
              style={{
                position: "absolute",
                top: 18,
                right: 18,
                padding: "4px 10px",
                border: `2px solid ${NAVY}`,
                color: NAVY,
                borderRadius: 6,
                fontFamily: "'Jost', sans-serif",
                fontSize: 11,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                opacity: drag > 30 ? Math.min(1, drag / 120) : 0,
                transform: "rotate(8deg)",
              }}
            >
              Next →
            </div>
            {historyCount > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 18,
                  left: 18,
                  padding: "4px 10px",
                  border: `2px solid ${SECONDARY}`,
                  color: SECONDARY,
                  borderRadius: 6,
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 11,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  opacity: drag < -30 ? Math.min(1, -drag / 120) : 0,
                  transform: "rotate(-8deg)",
                }}
              >
                ← Back
              </div>
            )}

            {/* Category icon + label (top left of card content area) */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, marginBottom: 16 }}>
              <CategoryIcon category={currentCatKey} size={20} color={NAVY} />
              <p
                style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: NAVY,
                  margin: 0,
                }}
              >
                {CATEGORY_LABELS[currentCatKey] ?? current.category}
              </p>
            </div>

            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                color: NAVY,
                fontSize: 32,
                lineHeight: 1.15,
                margin: "0 0 16px",
                textAlign: "left",
              }}
            >
              {current.title}
            </h2>
            <p
              style={{
                fontFamily: "'Jost', sans-serif",
                fontWeight: 400,
                color: "#2C3E50",
                fontSize: 16,
                lineHeight: 1.55,
                margin: 0,
                textAlign: "left",
              }}
            >
              {current.note}
            </p>

            {/* Buttons */}
            <div
              style={{
                marginTop: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                paddingTop: 20,
              }}
            >
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleSkip}
                  disabled={confirming}
                  style={{
                    flex: 1,
                    height: 44,
                    background: "transparent",
                    color: NAVY,
                    border: `1.5px solid ${NAVY}`,
                    borderRadius: 8,
                    fontFamily: "'Jost', sans-serif",
                    fontSize: 15,
                    cursor: confirming ? "not-allowed" : "pointer",
                    opacity: confirming ? 0.5 : 1,
                  }}
                >
                  Skip
                </button>
                <button
                  onClick={openEdit}
                  disabled={confirming}
                  style={{
                    flex: 1,
                    height: 44,
                    background: "transparent",
                    color: NAVY,
                    border: `1.5px solid ${NAVY}`,
                    borderRadius: 8,
                    fontFamily: "'Jost', sans-serif",
                    fontSize: 15,
                    cursor: confirming ? "not-allowed" : "pointer",
                    opacity: confirming ? 0.5 : 1,
                  }}
                >
                  Edit
                </button>
              </div>
              <button
                onClick={() => runKeepConfirmation()}
                disabled={confirming}
                style={{
                  width: "100%",
                  height: 48,
                  background: NAVY,
                  color: IVORY,
                  border: "none",
                  borderRadius: 8,
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 15,
                  cursor: confirming ? "not-allowed" : "pointer",
                  opacity: confirming ? 0.7 : 1,
                }}
              >
                Keep this Touchstone
              </button>
            </div>

            {/* Center checkmark on confirmation */}
            {confirming && (
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                  animation: "ts-check-fade 800ms ease forwards",
                }}
              >
                <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                  <circle cx="36" cy="36" r="32" stroke={GOLD} strokeWidth="3" fill="none" opacity="0.4" />
                  <polyline
                    points="22,38 32,48 52,26"
                    stroke={GOLD}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
                <style>{`@keyframes ts-check-fade {
                  0% { opacity: 0; transform: scale(0.85); }
                  30% { opacity: 1; transform: scale(1); }
                  80% { opacity: 1; transform: scale(1); }
                  100% { opacity: 0; transform: scale(1.02); }
                }`}</style>
              </div>
            )}
          </div>
        </div>

        {/* Progress dots — now below the card stack */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {dots}
        </div>
        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            color: SECONDARY,
            fontSize: 12,
            textAlign: "center",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            margin: "8px 0 0",
          }}
        >
          {Math.min(decidedCount + 1, originalCount)} of {originalCount}
        </p>

      </div>

      {/* Edit overlay */}
      {editing && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setEditing(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              background: IVORY,
              borderRadius: 16,
              padding: 28,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                color: NAVY,
                fontSize: 24,
                margin: "0 0 18px",
              }}
            >
              Edit Touchstone
            </h3>

            <label style={{ display: "block", fontFamily: "'Jost', sans-serif", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: SECONDARY, marginBottom: 6 }}>
              Title
            </label>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${MUTED}`,
                fontFamily: "'Jost', sans-serif",
                fontSize: 15,
                marginBottom: 16,
                background: "#fff",
                color: NAVY,
              }}
            />

            <label style={{ display: "block", fontFamily: "'Jost', sans-serif", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: SECONDARY, marginBottom: 6 }}>
              Description
            </label>
            <textarea
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              rows={5}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${MUTED}`,
                fontFamily: "'Jost', sans-serif",
                fontSize: 15,
                marginBottom: 16,
                background: "#fff",
                color: NAVY,
                resize: "vertical",
              }}
            />

            <label style={{ display: "block", fontFamily: "'Jost', sans-serif", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: SECONDARY, marginBottom: 6 }}>
              Category
            </label>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value as CategoryKey)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${MUTED}`,
                fontFamily: "'Jost', sans-serif",
                fontSize: 15,
                marginBottom: 16,
                background: "#fff",
                color: NAVY,
              }}
            >
              {CATEGORY_KEYS.map((k) => (
                <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>
              ))}
            </select>

            <label style={{ display: "block", fontFamily: "'Jost', sans-serif", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: SECONDARY, marginBottom: 6 }}>
              Person association
            </label>
            <input
              value={editPerson}
              onChange={(e) => setEditPerson(e.target.value)}
              placeholder="Optional"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${MUTED}`,
                fontFamily: "'Jost', sans-serif",
                fontSize: 15,
                marginBottom: 16,
                background: "#fff",
                color: NAVY,
              }}
            />

            <label style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "'Jost', sans-serif", fontSize: 14, color: NAVY, marginBottom: 24 }}>
              <input
                type="checkbox"
                checked={editPrivate}
                onChange={(e) => setEditPrivate(e.target.checked)}
              />
              Private
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setEditing(false)}
                style={{
                  background: "transparent",
                  color: NAVY,
                  border: `1.5px solid ${NAVY}`,
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                style={{
                  background: NAVY,
                  color: IVORY,
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TellStoryResults;
