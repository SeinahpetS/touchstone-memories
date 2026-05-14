import { useEffect, useMemo, useRef, useState } from "react";
import Wordmark from "./Wordmark";

type QuoteSpec = {
  text: string;
  baseSize: number;
  width: number;
  color: string;
};

type StarSpec = {
  size: number;
  color: string;
};

const QUOTES: QuoteSpec[] = [
  {
    text: "I don't want to post it. I just want to keep it somewhere it won't disappear.",
    baseSize: 16,
    width: 190,
    color: "rgba(30,46,62,0.95)",
  },
  {
    text: "She asked if we could stay five more minutes. We stayed twenty.",
    baseSize: 16,
    width: 182,
    color: "rgba(30,46,62,0.92)",
  },
  {
    text: "Ethan said the most Ethan thing today. His little lisp somehow made it even cuter.",
    baseSize: 14,
    width: 178,
    color: "rgba(30,46,62,0.88)",
  },
  {
    text: "This is the last summer they'll all be this age at the same time.",
    baseSize: 14,
    width: 180,
    color: "rgba(30,46,62,0.87)",
  },
  {
    text: "I want to take a mental snapshot — the morning sun through the kitchen window while making breakfast for Isabelle.",
    baseSize: 12,
    width: 168,
    color: "rgba(30,46,62,0.72)",
  },
  {
    text: "Mum told me she used to take a solo road trip every year after college. Just her and the car. I never knew that.",
    baseSize: 12,
    width: 165,
    color: "rgba(30,46,62,0.70)",
  },
  {
    text: "Dad had a word for that feeling when a trip is almost over but you're still in it. I can't remember it now.",
    baseSize: 12,
    width: 168,
    color: "rgba(30,46,62,0.74)",
  },
  {
    text: "Something about today felt like it mattered. I don't know why yet.",
    baseSize: 12,
    width: 160,
    color: "rgba(30,46,62,0.62)",
  },
];

const STARS: StarSpec[] = [
  { size: 18, color: "#B8860B" },
  { size: 12, color: "#1E2E3E" },
  { size: 16, color: "#B8860B" },
  { size: 10, color: "#4A6B8A" },
  { size: 17, color: "#B8860B" },
  { size: 9, color: "#1E2E3E" },
  { size: 14, color: "#4A6B8A" },
  { size: 11, color: "#B8860B" },
];

const GAP = 12;
const TOP_EXCLUDE = 44;
const BOTTOM_EXCLUDE = 36;
const CENTER_W = 300;
const CENTER_H = 170;

type Rect = { x: number; y: number; w: number; h: number };

function rectsOverlap(a: Rect, b: Rect, gap = GAP) {
  return !(
    a.x + a.w + gap <= b.x ||
    b.x + b.w + gap <= a.x ||
    a.y + a.h + gap <= b.y ||
    b.y + b.h + gap <= a.y
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function computeFontSize(q: QuoteSpec) {
  const wc = q.text.trim().split(/\s+/).length;
  if (wc <= 8) return q.baseSize + 6;
  if (wc <= 14) return q.baseSize + 2;
  return q.baseSize * 0.85;
}

function estimateQuoteHeight(q: QuoteSpec, fontSize: number) {
  // Rough: ~6 chars per inch at given font; estimate lines via width.
  const avgCharW = fontSize * 0.5;
  const charsPerLine = Math.max(1, Math.floor(q.width / avgCharW));
  const lines = Math.max(1, Math.ceil(q.text.length / charsPerLine));
  return Math.ceil(lines * fontSize * 1.35);
}

type Placed =
  | {
      kind: "quote";
      idx: number;
      quote: QuoteSpec;
      fontSize: number;
      rect: Rect;
    }
  | {
      kind: "star";
      idx: number; // matches quote idx
      star: StarSpec;
      rect: Rect;
    };

function FourPointStar({ size, color }: StarSpec) {
  const r = size / 2;
  const inner = r * 0.28;
  const points: string[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : inner;
    const x = r + radius * Math.cos(angle);
    const y = r + radius * Math.sin(angle);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block" }}
    >
      <polygon points={points.join(" ")} fill={color} />
    </svg>
  );
}

interface OnboardingIntroScreenProps {
  onBegin: () => void;
  onSkip: () => void;
}

const OnboardingIntroScreen = ({ onBegin, onSkip }: OnboardingIntroScreenProps) => {
  const screenRef = useRef<HTMLDivElement>(null);
  const [placements, setPlacements] = useState<Placed[]>([]);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [order, setOrder] = useState<number[]>([]);
  const [showClosing, setShowClosing] = useState(false);
  const [dimmed, setDimmed] = useState(false);
  const [closingStage, setClosingStage] = useState(0); // 0 none, 1 first line, 2 + second line, 3 + wordmark
  const [quotesDone, setQuotesDone] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  // Compute placements once on mount
  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    const W = el.offsetWidth;
    const H = el.offsetHeight;
    // Scale quotes/stars up on larger screens. Baseline is ~390px wide phone.
    const scale = Math.min(2.6, Math.max(1, W / 420));

    const occupied: Rect[] = [];
    // Center reservation
    occupied.push({
      x: (W - CENTER_W) / 2,
      y: (H - CENTER_H) / 2,
      w: CENTER_W,
      h: CENTER_H,
    });

    const minY = TOP_EXCLUDE;
    const maxY = H - BOTTOM_EXCLUDE;

    const quoteOrder = shuffle(QUOTES.map((_, i) => i));
    const starAssignment = shuffle(STARS.slice());

    const placed: Placed[] = [];

    const tryPlace = (w: number, h: number): Rect | null => {
      for (let attempt = 0; attempt < 600; attempt++) {
        if (w >= W || h >= maxY - minY) return null;
        const x = Math.random() * (W - w);
        const y = minY + Math.random() * (maxY - minY - h);
        const rect = { x, y, w, h };
        let ok = true;
        for (const o of occupied) {
          if (rectsOverlap(rect, o)) {
            ok = false;
            break;
          }
        }
        if (ok) return rect;
      }
      return null;
    };

    quoteOrder.forEach((qi) => {
      const quote = QUOTES[qi];
      const fontSize = computeFontSize(quote) * scale;
      const width = quote.width * scale;
      const h = estimateQuoteHeight({ ...quote, width }, fontSize);
      const qRect = tryPlace(width, h);
      if (!qRect) return;
      occupied.push(qRect);
      placed.push({ kind: "quote", idx: qi, quote, fontSize, rect: qRect });
    });

    // Place stars independently, spread across the full screen via grid-jitter
    const starCount = starAssignment.length;
    const cols = Math.ceil(Math.sqrt(starCount * (W / Math.max(1, maxY - minY))));
    const rows = Math.ceil(starCount / cols);
    const cellW = W / cols;
    const cellH = (maxY - minY) / rows;
    const cells: { cx: number; cy: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells.push({ cx: c, cy: r });
      }
    }
    const shuffledCells = shuffle(cells).slice(0, starCount);

    starAssignment.forEach((baseStar, i) => {
      const star = { ...baseStar, size: baseStar.size * scale };
      const cell = shuffledCells[i];
      let sRect: Rect | null = null;
      for (let attempt = 0; attempt < 80; attempt++) {
        const jitterX = Math.random() * Math.max(0, cellW - star.size);
        const jitterY = Math.random() * Math.max(0, cellH - star.size);
        const x = cell.cx * cellW + jitterX;
        const y = minY + cell.cy * cellH + jitterY;
        const rect = { x, y, w: star.size, h: star.size };
        let ok = true;
        for (const o of occupied) {
          if (rectsOverlap(rect, o)) {
            ok = false;
            break;
          }
        }
        if (ok) {
          sRect = rect;
          break;
        }
      }
      if (!sRect) sRect = tryPlace(star.size, star.size);
      if (!sRect) return;
      occupied.push(sRect);
      placed.push({ kind: "star", idx: i, star, rect: sRect });
    });

    setPlacements(placed);
    setOrder(quoteOrder.filter((qi) => placed.some((p) => p.kind === "quote" && p.idx === qi)));
  }, []);

  // Reveal sequence
  useEffect(() => {
    if (order.length === 0) return;
    const timers: number[] = [];
    let cumulative = 0;
    order.forEach((qi, i) => {
      timers.push(
        window.setTimeout(() => {
          setRevealedIds((prev) => {
            const next = new Set(prev);
            next.add(`q-${qi}`);
            return next;
          });
        }, cumulative),
      );
      timers.push(
        window.setTimeout(() => {
          setRevealedIds((prev) => {
            const next = new Set(prev);
            next.add(`s-${i}`);
            return next;
          });
        }, cumulative + 437),
      );
      cumulative += 1150;
      if (i === order.length - 1) {
        // Two beats after last reveal, then fade quotes to 0
        const dimAt = cumulative + 1400;
        timers.push(window.setTimeout(() => setDimmed(true), dimAt));
        // After fade completes (~1.4s), reveal closing in stages
        const closingStart = dimAt + 1500;
        timers.push(window.setTimeout(() => { setShowClosing(true); setClosingStage(1); }, closingStart));
        timers.push(window.setTimeout(() => setClosingStage(2), closingStart + 1800));
        timers.push(window.setTimeout(() => setClosingStage(3), closingStart + 3600));
      }
    });
    return () => timers.forEach((t) => clearTimeout(t));
  }, [order]);

  const wordmark = useMemo(
    () => (
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: '"Playfair Display", Georgia, serif',
          fontStyle: "italic",
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "#B8860B",
          opacity: 0.75,
          pointerEvents: "none",
          zIndex: 5,
        }}
      >
        Touchstone
      </div>
    ),
    [],
  );

  return (
    <div
      ref={screenRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        background: "#F2EEE5",
        overflow: "hidden",
        fontFamily: '"Playfair Display", Georgia, serif',
      }}
    >
      {wordmark}

      {placements.map((p) => {
        if (p.kind === "quote") {
          const id = `q-${p.idx}`;
          const visible = revealedIds.has(id);
          return (
            <div
              key={id}
              style={{
                position: "absolute",
                left: p.rect.x,
                top: p.rect.y,
                width: p.rect.w,
                fontFamily: '"Playfair Display", Georgia, serif',
                fontStyle: "italic",
                fontSize: p.fontSize,
                lineHeight: 1.35,
                color: p.quote.color,
                opacity: dimmed ? 0 : visible ? 1 : 0,
                transition: dimmed
                  ? "opacity 1.4s ease"
                  : "opacity 1.1s ease",
              }}
            >
              {p.quote.text}
            </div>
          );
        }
        const id = `s-${p.idx}`;
        const visible = revealedIds.has(id);
        return (
          <div
            key={id}
            style={{
              position: "absolute",
              left: p.rect.x,
              top: p.rect.y,
              width: p.rect.w,
              height: p.rect.h,
              opacity: dimmed ? 0 : visible ? 1 : 0,
              transition: dimmed ? "opacity 1.4s ease" : "opacity 1.1s ease",
            }}
          >
            <FourPointStar size={p.star.size} color={p.star.color} />
          </div>
        );
      })}

      {!showClosing && (
        <button
          onClick={onSkip}
          style={{
            position: "absolute",
            bottom: 12,
            right: 16,
            fontFamily: '"Playfair Display", Georgia, serif',
            fontStyle: "italic",
            fontSize: 11,
            color: "#4A6B8A",
            opacity: 0.45,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
            zIndex: 5,
          }}
        >
          Skip →
        </button>
      )}

      {showClosing && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 1.5rem",
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontStyle: "italic",
              fontSize: "clamp(20px, 5vw, 26px)",
              color: "#1E2E3E",
              marginBottom: "0.6rem",
              opacity: closingStage >= 1 ? 1 : 0,
              transition: "opacity 1.6s ease",
            }}
          >
            Your story has parts worth remembering.
          </div>
          <div
            style={{
              margin: "2.4rem 0 0",
              transform: "scale(3)",
              transformOrigin: "center",
              opacity: closingStage >= 2 ? 1 : 0,
              transition: "opacity 1.8s ease",
            }}
          >
            <Wordmark />
          </div>
          <div
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontStyle: "italic",
              fontSize: "clamp(18px, 3.8vw, 22px)",
              color: "#B8860B",
              marginTop: "3.2rem",
              opacity: closingStage >= 3 ? 1 : 0,
              transition: "opacity 1.6s ease",
            }}
          >
            Everything that made you. Still here.
          </div>
          <button
            onClick={onBegin}
            style={{
              marginTop: "3.2rem",
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 14,
              color: "#F2EEE5",
              background: "#1E2E3E",
              border: "none",
              borderRadius: 6,
              padding: "0.75rem 2rem",
              cursor: "pointer",
              opacity: closingStage >= 3 ? 1 : 0,
              transition: "opacity 1.4s ease",
              pointerEvents: closingStage >= 3 ? "auto" : "none",
            }}
          >
            Begin →
          </button>
        </div>
      )}

      <style>{`
        @keyframes ts-intro-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default OnboardingIntroScreen;
