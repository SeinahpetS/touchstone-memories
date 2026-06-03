import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CategoryIcon, { CATEGORY_LABELS, type CategoryKey } from "@/components/CategoryIcon";

type Artifact = {
  category: string;
  title: string;
  note: string;
};

const IVORY = "#F2EEE5";
const CARD_BG = "#E8E4D8";
const NAVY = "#1E2E3E";
const INK = "#2C3E50";
const SECONDARY = "#5B4A3F";
const AEGEAN = "#0E7C86";
const GOLD = "#B8860B";

const CATEGORY_KEYS: CategoryKey[] = [
  "moment", "person", "object", "place", "food", "sound", "imprint", "digital_traces",
];

const normalizeCategory = (raw: string): CategoryKey => {
  const lower = (raw || "").toLowerCase().trim();
  if (lower === "people") return "person";
  if ((CATEGORY_KEYS as string[]).includes(lower)) return lower as CategoryKey;
  return "moment";
};

const WelcomeTouchstones = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const keptCount = Number(params.get("kept") || "0");

  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const startX = useRef<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    const raw = sessionStorage.getItem("ts_welcome_artifacts");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setArtifacts(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!trackRef.current) return;
    const measure = () => setTrackWidth(trackRef.current?.offsetWidth ?? 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [artifacts.length]);

  const total = artifacts.length;

  const goTo = (next: number) => {
    if (next < 0 || next >= total) return;
    setIndex(next);
    setDrag(0);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
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

  const cardOffsetPx = -index * trackWidth + drag;

  const goArchive = () => {
    navigate("/archive?welcome=1", { replace: true });
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: IVORY }}
    >
      <style>{`
        @keyframes ts-welcome-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ts-welcome-stagger > * {
          opacity: 0;
          animation: ts-welcome-in 600ms ease forwards;
        }
        .ts-welcome-stagger > *:nth-child(1) { animation-delay: 80ms; }
        .ts-welcome-stagger > *:nth-child(2) { animation-delay: 260ms; }
        .ts-welcome-stagger > *:nth-child(3) { animation-delay: 440ms; }
        .ts-welcome-stagger > *:nth-child(4) { animation-delay: 600ms; }
        .ts-welcome-stagger > *:nth-child(5) { animation-delay: 760ms; }
      `}</style>

      <div className="mx-auto w-full max-w-md px-6 pt-14 pb-12 flex-1 flex flex-col ts-welcome-stagger">
        {/* Headline */}
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontSize: 28,
            lineHeight: 1.2,
            color: INK,
            textAlign: "center",
            margin: 0,
          }}
        >
          Look what just unfolded.
        </h1>

        {/* Artifact carousel */}
        <div
          style={{
            marginTop: 28,
            opacity: total > 0 ? 1 : 0,
            transition: "opacity 400ms ease",
          }}
        >
          <div
            ref={trackRef}
            className="relative"
            style={{ minHeight: 320, overflow: "hidden", touchAction: "pan-y" }}
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
              {artifacts.map((a, i) => {
                const catKey = normalizeCategory(a.category);
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
                        borderLeft: `4px solid ${AEGEAN}`,
                        userSelect: "none",
                      }}
                    >
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
                          fontSize: 26,
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
                          fontSize: 15,
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

          {/* Dot indicators */}
          {total > 1 && (
            <div
              aria-hidden
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 6,
                marginTop: 14,
              }}
            >
              {artifacts.map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: i === index ? 18 : 6,
                    height: 6,
                    borderRadius: 999,
                    background: i === index ? GOLD : `${GOLD}66`,
                    opacity: i === index ? 1 : 0.5,
                    transition: "width 220ms ease, opacity 220ms ease",
                  }}
                />
              ))}
            </div>
          )}

          {/* Count label */}
          <p
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: SECONDARY,
              textAlign: "center",
              margin: "10px 0 0",
              opacity: 0.7,
            }}
          >
            {index + 1} of {total}
          </p>
        </div>

        {/* Fallback if no artifact data */}
        {total === 0 && keptCount > 0 && (
          <p
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 14,
              color: SECONDARY,
              textAlign: "center",
              marginTop: 28,
            }}
          >
            {keptCount} {keptCount === 1 ? "artifact" : "artifacts"} saved.
          </p>
        )}

        {/* Vivid trial note */}
        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            fontStyle: "italic",
            fontSize: 13,
            lineHeight: 1.55,
            color: SECONDARY,
            textAlign: "center",
            margin: "24px 0 0",
            opacity: 0.75,
          }}
        >
          Story Unfold is part of your 7-day Vivid trial.
        </p>

        {/* Manual entry hint */}
        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 14,
            lineHeight: 1.55,
            color: SECONDARY,
            textAlign: "center",
            margin: "20px 0 0",
          }}
        >
          You can add a Touchstone anytime with the{" "}
          <span
            aria-hidden
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              borderRadius: 999,
              background: NAVY,
              color: "#D4B36A",
              fontFamily: "'Jost', sans-serif",
              fontSize: 14,
              fontWeight: 500,
              verticalAlign: "middle",
              margin: "0 2px",
            }}
          >
            +
          </span>{" "}
          button — no story required.
        </p>

        <div style={{ marginTop: "auto", paddingTop: 36 }}>
          <button
            onClick={goArchive}
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
              cursor: "pointer",
            }}
          >
            Go to my archive
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeTouchstones;
