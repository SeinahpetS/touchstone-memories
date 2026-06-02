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
    text: "She asked if we could stay for ten more minutes to watch the meteor shower. We ended up staying for a couple hours.",
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
    text: "This time next year we'll all be living in different cities.",
    baseSize: 14,
    width: 180,
    color: "rgba(30,46,62,0.87)",
  },
  {
    text: "One of my favorite things about the summer is the way the morning sun comes through the kitchen window.",
    baseSize: 12,
    width: 168,
    color: "rgba(30,46,62,0.72)",
  },
  {
    text: "Did you know mom used to take a solo road trip every year in college? Just her and her car.",
    baseSize: 12,
    width: 165,
    color: "rgba(30,46,62,0.70)",
  },
  {
    text: "There's that one photo I can't find of my dad wearing his favorite shirt at the cabin. That's how I picture him now.",
    baseSize: 18,
    width: 220,
    color: "rgba(30,46,62,0.88)",
  },
  {
    text: "Whoa! I used to have one of these when I was a kid!",
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
  { size: 15, color: "#B8860B" },
  { size: 10, color: "#1E2E3E" },
  { size: 13, color: "#4A6B8A" },
  { size: 17, color: "#B8860B" },
  { size: 9, color: "#1E2E3E" },
  { size: 16, color: "#4A6B8A" },
  { size: 11, color: "#B8860B" },
  { size: 14, color: "#1E2E3E" },
];

const GAP = 12;
const TOP_EXCLUDE = 44;
const BOTTOM_EXCLUDE = 36;
const SIDE_EXCLUDE = 20;
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
  
  const [closingStage, setClosingStage] = useState(0); // 0 none, 1 first line, 2 + second line, 3 + wordmark
  const [quotesDone, setQuotesDone] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [ripple, setRipple] = useState(false);
  
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleRemember = () => {
    if (advancing) return;
    setRipple(true);

    const root = screenRef.current;
    if (root) {
      const items = Array.from(
        root.querySelectorAll<HTMLElement>("[data-fadeable]"),
      );
      items.forEach((el) => {
        const delay = Math.random() * 800;
        window.setTimeout(() => {
          el.style.transition = "opacity 400ms ease-in-out";
          el.style.opacity = "0";
        }, delay);
      });
      const wm = root.querySelector<HTMLElement>("[data-wordmark]");
      if (wm) {
        window.setTimeout(() => {
          wm.style.transition = "opacity 400ms ease-in-out";
          wm.style.opacity = "0";
        }, 900);
      }
    }

    // Mount Begin screen (hidden) and reveal at 1500ms
    window.setTimeout(() => setAdvancing(true), 1300);
  };

  // Compute placements once on mount
  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    const W = el.offsetWidth;
    const H = el.offsetHeight;
    // Baseline scale from viewport width (no upper cap — we want quotes to
    // grow with the canvas so the screen never feels empty).
    const baseScale = Math.max(1, W / 420);

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
    const minX = SIDE_EXCLUDE;
    const maxX = W - SIDE_EXCLUDE;
    const usableW = maxX - minX;
    const usableH = maxY - minY;

    const quoteOrder = shuffle(QUOTES.map((_, i) => i));

    const placed: Placed[] = [];

    // Decide grid first so we can scale items to fill their cells. We want
    // quotes to take spatial priority, so we pick a column count keyed off the
    // number of quotes and the viewport aspect ratio.
    const qCount = QUOTES.length;
    const aspect = W / Math.max(1, usableH);
    const cols = Math.max(2, Math.round(Math.sqrt(qCount * aspect * 2)));
    const quoteRows = Math.max(2, Math.ceil(qCount / cols));
    // Add extra rows of stars so the full canvas is covered.
    const rows = Math.max(quoteRows, Math.ceil((qCount + STARS.length) / cols));
    const cellW = usableW / cols;
    const cellH = usableH / rows;

    // Rescale quotes so each one approximately fills its cell width.
    // This eliminates the "tiny quotes lost in big empty cells" problem on
    // wide viewports.
    type Item =
      | { kind: "quote"; idx: number; quote: QuoteSpec; fontSize: number; w: number; h: number }
      | { kind: "star"; idx: number; star: StarSpec; w: number; h: number };

    const items: Item[] = [];
    quoteOrder.forEach((qi) => {
      const quote = QUOTES[qi];
      const targetW = Math.min(cellW * 0.88, 520);
      const widthScale = Math.max(baseScale, targetW / quote.width);
      const width = quote.width * widthScale;
      const fontSize = computeFontSize(quote) * widthScale;
      const h = estimateQuoteHeight({ ...quote, width }, fontSize);
      items.push({ kind: "quote", idx: qi, quote, fontSize, w: width, h });
    });

    // Fill remaining cells with stars (cycle through STARS list as needed).
    const totalCells = rows * cols;
    const starsNeeded = Math.max(STARS.length, totalCells - qCount + 4);
    const starScale = baseScale;
    for (let i = 0; i < starsNeeded; i++) {
      const base = STARS[i % STARS.length];
      const star = { ...base, size: base.size * starScale };
      items.push({ kind: "star", idx: i, star, w: star.size, h: star.size });
    }

    // Interleave: alternate quote, star, quote, star ... so neighbors in the
    // placement order (which gets cells in sequence) mix the two kinds.
    const quotesQ = items.filter((it) => it.kind === "quote");
    const starsQ = items.filter((it) => it.kind === "star");
    const interleaved: Item[] = [];
    while (quotesQ.length || starsQ.length) {
      if (quotesQ.length) interleaved.push(quotesQ.shift()!);
      if (starsQ.length) interleaved.push(starsQ.shift()!);
    }
    const cells: { cx: number; cy: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) cells.push({ cx: c, cy: r });
    }
    const shuffledCells = shuffle(cells);

    const tryPlaceFree = (w: number, h: number): Rect | null => {
      for (let attempt = 0; attempt < 400; attempt++) {
        if (w >= usableW || h >= usableH) return null;
        const x = minX + Math.random() * (usableW - w);
        const y = minY + Math.random() * (usableH - h);
        const rect = { x, y, w, h };
        if (!occupied.some((o) => rectsOverlap(rect, o))) return rect;
      }
      return null;
    };

    interleaved.forEach((it, i) => {
      const cell = shuffledCells[i % shuffledCells.length];
      let rect: Rect | null = null;
      for (let attempt = 0; attempt < 60; attempt++) {
        const cx = minX + cell.cx * cellW;
        const cy = minY + cell.cy * cellH;
        const maxJX = Math.max(0, cellW - it.w);
        const maxJY = Math.max(0, cellH - it.h);
        const x = Math.max(minX, Math.min(maxX - it.w, cx + Math.random() * maxJX));
        const y = Math.max(minY, Math.min(maxY - it.h, cy + Math.random() * maxJY));
        const candidate = { x, y, w: it.w, h: it.h };
        if (!occupied.some((o) => rectsOverlap(candidate, o))) {
          rect = candidate;
          break;
        }
      }
      if (!rect) rect = tryPlaceFree(it.w, it.h);
      if (!rect) return;
      occupied.push(rect);
      if (it.kind === "quote") {
        placed.push({ kind: "quote", idx: it.idx, quote: it.quote, fontSize: it.fontSize, rect });
      } else {
        placed.push({ kind: "star", idx: it.idx, star: it.star, rect });
      }
    });

    // Guarantee a minimum number of quotes are visible. If grid placement
    // dropped any, retry with relaxed constraints (shrinking width if needed)
    // until we hit MIN_QUOTES or run out of quote candidates.
    const MIN_QUOTES = Math.min(4, QUOTES.length);
    const placedQuoteIdx = new Set(
      placed.filter((p) => p.kind === "quote").map((p) => (p as any).idx as number)
    );
    if (placedQuoteIdx.size < MIN_QUOTES) {
      const remaining = quoteOrder.filter((qi) => !placedQuoteIdx.has(qi));
      for (const qi of remaining) {
        if (placedQuoteIdx.size >= MIN_QUOTES) break;
        const quote = QUOTES[qi];
        const fontSize = computeFontSize(quote) * scale;
        let width = quote.width * scale;
        let rect: Rect | null = null;
        for (let shrink = 0; shrink < 4 && !rect; shrink++) {
          const h = estimateQuoteHeight({ ...quote, width }, fontSize);
          rect = tryPlaceFree(width, h);
          if (!rect) width *= 0.85;
        }
        if (rect) {
          occupied.push(rect);
          placed.push({ kind: "quote", idx: qi, quote, fontSize, rect });
          placedQuoteIdx.add(qi);
        }
      }
    }

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
      const starA = i * 2;
      const starB = i * 2 + 1;
      timers.push(
        window.setTimeout(() => {
          setRevealedIds((prev) => {
            const next = new Set(prev);
            next.add(`s-${starA}`);
            return next;
          });
        }, cumulative + 400),
      );
      timers.push(
        window.setTimeout(() => {
          setRevealedIds((prev) => {
            const next = new Set(prev);
            next.add(`s-${starB}`);
            return next;
          });
        }, cumulative + 750),
      );
      cumulative += 1150;
      if (i === order.length - 1) {
        timers.push(window.setTimeout(() => setQuotesDone(true), cumulative + 600));
      }
    });
    return () => timers.forEach((t) => clearTimeout(t));
  }, [order]);

  // Staged closing reveal:
  //   stage 1 — "Your story unfolds one piece at a time." fades in
  //   stage 2 — Touchstone wordmark fades in slowly
  //   stage 3 — "Everything that made you." letter-by-letter reveal
  //   stage 4 — "Still here." + Begin button fade in
  const [everythingVisible, setEverythingVisible] = useState(false);
  const EVERYTHING_TEXT = "The pieces you want to remember, \nand the things you don\u2019t want to forget.";
  const EVERYTHING_FADE_MS = 1400;

  useEffect(() => {
    if (!advancing) return;
    const timers: number[] = [];
    setShowClosing(true);
    timers.push(window.setTimeout(() => setClosingStage(1), 100));
    timers.push(window.setTimeout(() => setClosingStage(2), 1400));
    timers.push(
      window.setTimeout(() => {
        setClosingStage(3);
        setEverythingVisible(true);
      }, 3400),
    );
    timers.push(
      window.setTimeout(
        () => setClosingStage(4),
        3400 + EVERYTHING_FADE_MS + 400,
      ),
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, [advancing]);


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
          transition: "opacity 200ms ease",
        }}
        data-wordmark
      >
        Touchstone
      </div>
    ),
    [],
  );

  const revealAllNow = () => {
    if (quotesDone || advancing) return;
    const all = new Set<string>();
    placements.forEach((p) => {
      all.add(p.kind === "quote" ? `q-${p.idx}` : `s-${p.idx}`);
    });
    setRevealedIds(all);
    setQuotesDone(true);
  };

  return (
    <div
      ref={screenRef}
      onClick={revealAllNow}
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        background: "#F2EEE5",
        overflow: "hidden",
        fontFamily: '"Playfair Display", Georgia, serif',
      }}
    >
      <div
        style={{
          opacity: ripple ? 0 : 1,
          transition: "opacity 200ms ease",
        }}
      >
        {wordmark}
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: ripple ? "none" : "auto",
        }}
      >
        {placements.map((p) => {
          if (p.kind === "quote") {
            const id = `q-${p.idx}`;
            const visible = revealedIds.has(id);
            return (
              <div
                key={id}
                data-fadeable
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
                  opacity: visible ? 1 : 0,
                  transition: "opacity 1.1s ease",
                }}
              >
                {`\u201C${p.quote.text}\u201D`}
              </div>
            );
          }
          const id = `s-${p.idx}`;
          const visible = revealedIds.has(id);
          return (
            <div
              key={id}
              data-fadeable
              style={{
                position: "absolute",
                left: p.rect.x,
                top: p.rect.y,
                width: p.rect.w,
                height: p.rect.h,
                opacity: visible ? 1 : 0,
                transition: "opacity 1.1s ease",
              }}
            >
              <FourPointStar size={p.star.size} color={p.star.color} />
            </div>
          );
        })}
      </div>


      {!showClosing && !ripple && (
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

      {!showClosing && quotesDone && (
        <button
          ref={buttonRef}
          onClick={handleRemember}
          disabled={ripple}
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            
            fontFamily: '"Playfair Display", Georgia, serif',
            fontStyle: "italic",
            fontSize: 22,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#F2EEE5",
            background: "#4A6B8A",
            border: "none",
            borderRadius: 999,
            padding: "1.4rem 4rem",
            cursor: "pointer",
            zIndex: 30,
            opacity: ripple ? 0 : undefined,
            filter: ripple ? "blur(8px)" : undefined,
            transform: ripple
              ? "translate(-50%, -50%) scale(1.1)"
              : "translate(-50%, -50%)",
            transition:
              "opacity 700ms ease-out, filter 700ms ease-out, transform 700ms ease-out",
            animation: ripple
              ? undefined
              : "ts-intro-fade 1.2s ease both, ts-remember-pulse 2s ease-in-out infinite",
          }}
        >
          Remember...
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
            zIndex: 27,
            background: "#F2EEE5",
            opacity: 1,
            transition: "opacity 700ms ease-in-out",
          }}
        >
          <div
            style={{
              margin: "2.4rem 0 0",
              transform: "scale(3)",
              transformOrigin: "center",
              opacity: closingStage >= 2 ? 1 : 0,
              transition: "opacity 1800ms ease",
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
              minHeight: "1.4em",
              textAlign: "center",
              maxWidth: "32rem",
              opacity: everythingVisible ? 1 : 0,
              transition: `opacity ${EVERYTHING_FADE_MS}ms ease`,
              whiteSpace: "pre-wrap",
            }}
          >
            {EVERYTHING_TEXT}
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
              opacity: closingStage >= 4 ? 1 : 0,
              transition: "opacity 1400ms ease",
              pointerEvents: closingStage >= 4 ? "auto" : "none",
            }}
          >
            Start Keeping Them
          </button>
        </div>
      )}

      <style>{`
        @keyframes ts-intro-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes ts-remember-pulse {
          0%, 100% { box-shadow: 0 2px 16px rgba(30,46,62,0.18); }
          50% { box-shadow: 0 2px 24px rgba(30,46,62,0.42); }
        }
        @keyframes ts-ripple {
          from { width: 0; height: 0; opacity: 0; }
          to { width: 250vmax; height: 250vmax; opacity: 0.6; }
        }
        @keyframes ts-whiteout {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default OnboardingIntroScreen;
