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

type Decision = "kept" | "removed" | null;

const NAVY = "#1E2E3E";
const IVORY = "#F2EEE5";
const CARD_BG = "#E8E4D8";
const MUTED = "#C9C3B5";
const AEGEAN = "#0E7C86";
const SECONDARY = "#5B4A3F";
const INK = "#2C3E50";

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

  const [cards, setCards] = useState<Artifact[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"reveal" | "decide" | "saving">("reveal");
  const [saving, setSaving] = useState(false);

  // Swipe state for horizontal carousel
  const [drag, setDrag] = useState(0);
  const startX = useRef<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    const raw = sessionStorage.getItem("ts_story_artifacts");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Order moments first, others after
        const moments = parsed.filter((a: Artifact) => a.category?.toLowerCase() === "moment");
        const others = parsed.filter((a: Artifact) => a.category?.toLowerCase() !== "moment");
        const ordered = [...moments, ...others].slice(0, 3); // first session = up to 3
        setCards(ordered);
        setDecisions(new Array(ordered.length).fill(null));
      }
    } catch { /* ignore */ }
  }, []);

  // Measure track width for swipe math
  useEffect(() => {
    if (!trackRef.current) return;
    const measure = () => setTrackWidth(trackRef.current?.offsetWidth ?? 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [cards.length]);

  // Reveal → decide phase transition (after stagger settles)
  useEffect(() => {
    if (phase !== "reveal" || cards.length === 0) return;
    const totalStagger = 380 + cards.length * 220 + 420; // last card fades in + breathing room
    const t = window.setTimeout(() => setPhase("decide"), totalStagger);
    return () => window.clearTimeout(t);
  }, [phase, cards.length]);

  const total = cards.length;
  const current = cards[index];
  const allDecided = decisions.length > 0 && decisions.every((d) => d !== null);

  const goTo = (next: number) => {
    if (next < 0 || next >= total) return;
    setIndex(next);
    setDrag(0);
  };

  const setDecision = (i: number, d: Decision) => {
    setDecisions((prev) => {
      const copy = [...prev];
      copy[i] = d;
      return copy;
    });
  };

  const advanceAfterDecision = (i: number) => {
    // Find next undecided card; if none, stay (the finish CTA will appear).
    const after = decisions
      .map((d, idx) => ({ d, idx }))
      .find((x) => x.idx > i && x.d === null);
    if (after) {
      window.setTimeout(() => goTo(after.idx), 240);
    } else {
      const beforeUndecided = decisions
        .map((d, idx) => ({ d, idx }))
        .find((x) => x.idx < i && x.d === null);
      if (beforeUndecided) {
        window.setTimeout(() => goTo(beforeUndecided.idx), 240);
      }
    }
  };

  const handleKeep = () => {
    if (phase !== "decide") return;
    playSaveFeedback();
    setDecision(index, "kept");
    advanceAfterDecision(index);
  };

  const handleRemove = () => {
    if (phase !== "decide") return;
    setDecision(index, "removed");
    advanceAfterDecision(index);
  };

  const handleFinish = async () => {
    if (!user) {
      toast.error("Sign in to keep your Touchstones.");
      return;
    }
    const kept = cards.filter((_, i) => decisions[i] === "kept");

    if (kept.length === 0) {
      // All removed → archive empty state path
      sessionStorage.removeItem("ts_story_artifacts");
      navigate("/archive?firstrun_empty=1", { replace: true });
      return;
    }

    setPhase("saving");
    setSaving(true);
    try {
      const rows = kept.map((a) => ({
        user_id: user.id,
        category: normalizeCategory(a.category),
        title: a.title?.trim() || null,
        note: a.note?.trim() || null,
      }));
      const { error } = await (supabase as any).from("touchstones").insert(rows);
      if (error) throw error;
      sessionStorage.removeItem("ts_story_artifacts");
      navigate(`/welcome-touchstones?kept=${kept.length}`, { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Couldn't save your Touchstones.");
      setSaving(false);
      setPhase("decide");
    }
  };

  // Pointer handlers for horizontal swipe between cards
  const onPointerDown = (e: React.PointerEvent) => {
    if (phase !== "decide") return;
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    // Resist at edges
    if ((dx > 0 && index === 0) || (dx < 0 && index === total - 1)) {
      setDrag(dx * 0.25);
    } else {
      setDrag(dx);
    }
  };
  const onPointerUp = () => {
    if (startX.current === null) return;
    const d = drag;
    startX.current = null;
    const threshold = Math.max(60, trackWidth * 0.18);
    if (d < -threshold && index < total - 1) goTo(index + 1);
    else if (d > threshold && index > 0) goTo(index - 1);
    else setDrag(0);
  };

  if (cards.length === 0) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ backgroundColor: IVORY }}
      >
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            color: INK,
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
            color: "#D4B36A",
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

  // Card width = full track; offset slides whole strip
  const cardOffsetPx = -index * trackWidth + drag;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: IVORY }}>
      <style>{`
        @keyframes ts-reveal-in {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ts-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="mx-auto w-full max-w-lg px-5 pt-10 pb-10 flex-1 flex flex-col">
        {/* Header copy — fades in early */}
        <div
          style={{
            opacity: phase === "reveal" ? 1 : 1,
            animation: "ts-fade-up 500ms ease both",
            textAlign: "center",
            marginBottom: 28,
          }}
        >
          <p
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: SECONDARY,
              margin: 0,
            }}
          >
            Here's what we found
          </p>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontStyle: "italic",
              fontSize: 26,
              color: INK,
              margin: "10px 0 0",
              lineHeight: 1.25,
            }}
          >
            Your first Touchstones.
          </h1>
        </div>

        {/* Card carousel track */}
        <div
          ref={trackRef}
          className="relative flex-1"
          style={{ minHeight: 360, overflow: "hidden", touchAction: "pan-y" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            style={{
              display: "flex",
              width: `${100 * Math.max(total, 1)}%`,
              transform: `translateX(${cardOffsetPx}px)`,
              transition: drag === 0 ? "transform 320ms cubic-bezier(.22,.61,.36,1)" : "none",
              height: "100%",
            }}
          >
            {cards.map((a, i) => {
              const catKey = normalizeCategory(a.category);
              const decision = decisions[i];
              const revealDelay = 380 + i * 220;
              return (
                <div
                  key={i}
                  style={{
                    width: trackWidth || "100%",
                    flexShrink: 0,
                    paddingRight: 0,
                    display: "flex",
                    alignItems: "stretch",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      background: CARD_BG,
                      borderRadius: 16,
                      padding: "26px 26px 24px",
                      display: "flex",
                      flexDirection: "column",
                      boxShadow: "0 10px 26px rgba(30,46,62,0.10)",
                      opacity: 0,
                      animation: `ts-reveal-in 520ms ease ${revealDelay}ms forwards`,
                      position: "relative",
                      borderLeft:
                        decision === "kept"
                          ? `4px solid ${AEGEAN}`
                          : decision === "removed"
                            ? `4px solid ${MUTED}`
                            : `4px solid transparent`,
                      transition: "border-color 240ms ease, opacity 240ms ease",
                      filter: decision === "removed" ? "opacity(0.55)" : "none",
                      userSelect: "none",
                    }}
                  >
                    {decision && (
                      <span
                        style={{
                          position: "absolute",
                          top: 14,
                          right: 14,
                          fontFamily: "'Jost', sans-serif",
                          fontSize: 10,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: decision === "kept" ? AEGEAN : SECONDARY,
                          opacity: 0.85,
                        }}
                      >
                        {decision === "kept" ? "Kept" : "Removed"}
                      </span>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, marginBottom: 14 }}>
                      <CategoryIcon category={catKey} size={20} color={NAVY} />
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
                        {CATEGORY_LABELS[catKey] ?? a.category}
                      </p>
                    </div>

                    <h2
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        color: NAVY,
                        fontSize: 28,
                        lineHeight: 1.18,
                        margin: "0 0 14px",
                        textAlign: "left",
                      }}
                    >
                      {a.title}
                    </h2>
                    <p
                      style={{
                        fontFamily: "'Jost', sans-serif",
                        color: INK,
                        fontSize: 16,
                        lineHeight: 1.55,
                        margin: 0,
                        textAlign: "left",
                      }}
                    >
                      {a.note}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress + edit hint */}
        <div style={{ marginTop: 18, textAlign: "center" }}>
          <p
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: SECONDARY,
              margin: 0,
            }}
          >
            {index + 1} of {total}
          </p>
          <div
            aria-hidden
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 6,
              marginTop: 8,
            }}
          >
            {cards.map((_, i) => (
              <span
                key={i}
                style={{
                  width: i === index ? 18 : 6,
                  height: 6,
                  borderRadius: 999,
                  background:
                    decisions[i] === "kept"
                      ? AEGEAN
                      : decisions[i] === "removed"
                        ? MUTED
                        : INK,
                  opacity: i === index ? 1 : 0.35,
                  transition: "width 220ms ease, background 220ms ease, opacity 220ms ease",
                }}
              />
            ))}
          </div>
          <p
            style={{
              fontFamily: "'Jost', sans-serif",
              fontStyle: "italic",
              fontSize: 12,
              color: SECONDARY,
              opacity: 0.7,
              margin: "12px 0 0",
            }}
          >
            You can edit any of these later.
          </p>
        </div>

        {/* Action row */}
        <div
          style={{
            marginTop: 22,
            opacity: phase === "decide" ? 1 : 0,
            transform: phase === "decide" ? "translateY(0)" : "translateY(6px)",
            transition: "opacity 360ms ease, transform 360ms ease",
            pointerEvents: phase === "decide" ? "auto" : "none",
          }}
        >
          {!allDecided ? (
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleRemove}
                style={{
                  flex: 1,
                  height: 48,
                  background: "transparent",
                  color: SECONDARY,
                  border: `1.5px solid ${SECONDARY}`,
                  borderRadius: 10,
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 15,
                  cursor: "pointer",
                  opacity: 0.85,
                }}
              >
                Remove
              </button>
              <button
                onClick={handleKeep}
                style={{
                  flex: 1.4,
                  height: 48,
                  background: AEGEAN,
                  color: IVORY,
                  border: "none",
                  borderRadius: 10,
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 15,
                  cursor: "pointer",
                  letterSpacing: "0.02em",
                }}
              >
                Keep This
              </button>
            </div>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving}
              style={{
                width: "100%",
                height: 52,
                background: NAVY,
                color: "#D4B36A",
                border: "none",
                borderRadius: 10,
                fontFamily: "'Jost', sans-serif",
                fontSize: 16,
                letterSpacing: "0.04em",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving…" : "Continue"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TellStoryResults;
