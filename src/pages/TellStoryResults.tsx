import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

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

const TellStoryResults = () => {
  const navigate = useNavigate();
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [index, setIndex] = useState(0);
  const [decisions, setDecisions] = useState<("kept" | "skipped")[]>([]);
  const [drag, setDrag] = useState(0);
  const [exiting, setExiting] = useState<null | "left" | "right">(null);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("ts_story_artifacts");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Ensure Moment is first
          const moments = parsed.filter((a: Artifact) => a.category?.toLowerCase() === "moment");
          const others = parsed.filter((a: Artifact) => a.category?.toLowerCase() !== "moment");
          setArtifacts([...moments, ...others]);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const current = artifacts[index];
  const done = artifacts.length > 0 && index >= artifacts.length;

  const advance = (decision: "kept" | "skipped") => {
    setExiting(decision === "kept" ? "right" : "left");
    setTimeout(() => {
      setDecisions((d) => [...d, decision]);
      setIndex((i) => i + 1);
      setDrag(0);
      setExiting(null);
    }, 220);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (exiting) return;
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    setDrag(e.clientX - startX.current);
  };
  const onPointerUp = () => {
    if (startX.current === null) return;
    const d = drag;
    startX.current = null;
    if (d > 100) advance("kept");
    else if (d < -100) advance("skipped");
    else setDrag(0);
  };

  const dots = useMemo(() => {
    return artifacts.map((_, i) => {
      const decided = i < decisions.length;
      return (
        <span
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 9999,
            background: decided ? NAVY : MUTED,
            opacity: decided ? 1 : 0.7,
            transition: "background 200ms",
          }}
        />
      );
    });
  }, [artifacts, decisions]);

  if (artifacts.length === 0) {
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
    const keptCount = decisions.filter((d) => d === "kept").length;
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ backgroundColor: IVORY }}
      >
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            color: NAVY,
            fontSize: 32,
            textAlign: "center",
            margin: 0,
          }}
        >
          {keptCount > 0 ? `${keptCount} kept.` : "All set."}
        </h1>
        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            color: SECONDARY,
            marginTop: 10,
            textAlign: "center",
          }}
        >
          {keptCount > 0
            ? "Your memories are safe in the archive."
            : "Nothing saved this time."}
        </p>
        <button
          onClick={() => {
            sessionStorage.removeItem("ts_story_draft");
            sessionStorage.removeItem("ts_story_artifacts");
            navigate("/archive");
          }}
          style={{
            marginTop: 28,
            background: NAVY,
            color: GOLD,
            borderRadius: 9999,
            padding: "14px 32px",
            fontFamily: "'Jost', sans-serif",
            fontSize: 16,
            border: "none",
          }}
        >
          Back to archive
        </button>
      </div>
    );
  }

  const remaining = artifacts.length - index;
  const rotation = drag * 0.05;
  const exitX = exiting === "right" ? 600 : exiting === "left" ? -600 : drag;
  const exitRot = exiting ? (exiting === "right" ? 18 : -18) : rotation;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: IVORY }}
    >
      <div className="mx-auto w-full max-w-lg px-5 pt-8 pb-10 flex-1 flex flex-col">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-2">
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
            margin: "8px 0 24px",
          }}
        >
          {index + 1} of {artifacts.length}
        </p>

        {/* Card stack */}
        <div
          className="relative flex-1 flex items-center justify-center"
          style={{ minHeight: 380 }}
        >
          {/* Background stack hints */}
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
              padding: 28,
              boxShadow: "0 12px 30px rgba(30,46,62,0.12)",
              transform: `translateX(${exitX}px) rotate(${exitRot}deg)`,
              transition: exiting || drag === 0 ? "transform 220ms ease-out" : "none",
              touchAction: "pan-y",
              cursor: "grab",
              userSelect: "none",
            }}
          >
            {/* Swipe labels */}
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
                fontSize: 12,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                opacity: drag < -30 ? Math.min(1, -drag / 120) : 0,
                transform: "rotate(-12deg)",
              }}
            >
              Skip
            </div>
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
                fontSize: 12,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                opacity: drag > 30 ? Math.min(1, drag / 120) : 0,
                transform: "rotate(12deg)",
              }}
            >
              Keep
            </div>

            <p
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: NAVY,
                margin: "0 0 14px",
              }}
            >
              {current.category}
            </p>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                color: NAVY,
                fontSize: 32,
                lineHeight: 1.15,
                margin: "0 0 16px",
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
              }}
            >
              {current.note}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => advance("skipped")}
            style={{
              background: "transparent",
              color: SECONDARY,
              border: `1.5px solid ${SECONDARY}`,
              borderRadius: 9999,
              padding: "12px 26px",
              fontFamily: "'Jost', sans-serif",
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Skip
          </button>
          <button
            onClick={() => advance("kept")}
            style={{
              background: NAVY,
              color: GOLD,
              border: "none",
              borderRadius: 9999,
              padding: "12px 28px",
              fontFamily: "'Jost', sans-serif",
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Keep this one
          </button>
        </div>
      </div>
    </div>
  );
};

export default TellStoryResults;
