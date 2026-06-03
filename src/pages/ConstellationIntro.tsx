import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingDotIndicator from "@/components/OnboardingDotIndicator";

type ConstellationIntroProps = { onComplete?: () => void };

const BG = "#F2EEE5";
const NAVY = "#1E2E3E";
const IVORY = "#F2EEE5";
const GOLD = "#B8860B";
const INK = "#2C3E50";

type StarKey =
  | "Alkaid"
  | "Mizar"
  | "Alioth"
  | "Megrez"
  | "Dubhe"
  | "Merak"
  | "Phecda";

const STARS: Record<StarKey, { cx: number; cy: number; r: number }> = {
  Alkaid: { cx: 96, cy: 225, r: 5 },
  Mizar: { cx: 160, cy: 182, r: 4.5 },
  Alioth: { cx: 203, cy: 190, r: 5.5 },
  Megrez: { cx: 296, cy: 190, r: 3.5 },
  Dubhe: { cx: 441, cy: 133, r: 5.5 },
  Merak: { cx: 450, cy: 208, r: 3.5 },
  Phecda: { cx: 340, cy: 236, r: 3.5 },
};

const LINES: Array<{ id: string; from: StarKey; to: StarKey }> = [
  { id: "l1", from: "Alkaid", to: "Mizar" },
  { id: "l2", from: "Mizar", to: "Alioth" },
  { id: "l3", from: "Alioth", to: "Megrez" },
  { id: "l4", from: "Megrez", to: "Dubhe" },
  { id: "l5", from: "Dubhe", to: "Merak" },
  { id: "l6", from: "Merak", to: "Phecda" },
  { id: "l7", from: "Phecda", to: "Megrez" },
];

const REVEAL: Array<{ star: StarKey; text: string | null }> = [
  { star: "Alkaid", text: "Every star looks like just a star..." },
  { star: "Dubhe", text: "...until you see what it's part of." },
  { star: "Mizar", text: "Your touchstones are the same." },
  { star: "Merak", text: "Each one a point of light..." },
  { star: "Alioth", text: "...all of them quietly forming a constellation" },
  { star: "Phecda", text: "entirely your own." },
  { star: "Megrez", text: null },
];

// Deterministic pseudo-random scatter for background stars.
const makeBgStars = (count: number) => {
  let seed = 1337;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const stars: Array<{ cx: number; cy: number; r: number; o: number }> = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      cx: rand() * 552,
      cy: rand() * 340,
      r: 0.7 + rand() * 1.2,
      o: 0.15 + rand() * 0.15,
    });
  }
  return stars;
};

const ConstellationIntro = ({ onComplete }: ConstellationIntroProps = {}) => {
  const navigate = useNavigate();
  const bgStars = useMemo(() => makeBgStars(80), []);

  // step = number of taps consumed. 0..7 reveals stars/text. 8 = draw lines. 9 = pulsing.
  const [step, setStep] = useState(0);
  const [linesDrawn, setLinesDrawn] = useState(0);
  const [pulsing, setPulsing] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, []);

  const lineRefs = useRef<Record<string, SVGLineElement | null>>({});
  const blurRef = useRef<SVGFEGaussianBlurElement | null>(null);
  const groupRef = useRef<SVGGElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pulseStartRef = useRef<number>(0);

  const revealedStars = new Set(REVEAL.slice(0, step).map((r) => r.star));
  const revealedTexts = REVEAL.slice(0, step)
    .map((r) => r.text)
    .filter((t): t is string => !!t);

  // Trigger line-draw sequence after the 7th tap.
  useEffect(() => {
    if (step !== REVEAL.length) return;
    let cancelled = false;
    LINES.forEach((line, i) => {
      setTimeout(() => {
        if (cancelled) return;
        setLinesDrawn(i + 1);
      }, i * 250);
    });
    const totalDraw = LINES.length * 250 + 400 + 300;
    const t = setTimeout(() => {
      if (!cancelled) setPulsing(true);
    }, totalDraw);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [step]);

  // Pulse loop.
  useEffect(() => {
    if (!pulsing) return;
    pulseStartRef.current = performance.now();
    const REST_OPACITY = 0.45;
    const PEAK_OPACITY = 1;
    const REST_WIDTH = 1.5;
    const PEAK_WIDTH = 2.5;
    const REST_BLUR = 0;
    const PEAK_BLUR = 4.5;

    const tick = (now: number) => {
      const t = (now - pulseStartRef.current) % 3000;
      let k: number;
      if (t < 1000) {
        const p = t / 1000;
        k = p * p; // ease in
      } else if (t < 2500) {
        k = 1;
      } else {
        const p = (t - 2500) / 500;
        k = 1 - p * (2 - p); // ease out
      }
      const op = REST_OPACITY + (PEAK_OPACITY - REST_OPACITY) * k;
      const w = REST_WIDTH + (PEAK_WIDTH - REST_WIDTH) * k;
      const b = REST_BLUR + (PEAK_BLUR - REST_BLUR) * k;
      Object.values(lineRefs.current).forEach((el) => {
        if (!el) return;
        el.setAttribute("stroke-opacity", String(op));
        el.setAttribute("stroke-width", String(w));
      });
      if (blurRef.current) {
        blurRef.current.setAttribute("stdDeviation", String(b));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [pulsing]);

  const handleTap = () => {
    if (leaving) return;
    if (pulsing) {
      // Final tap: stop pulse, reset, fade out, navigate.
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      Object.values(lineRefs.current).forEach((el) => {
        if (!el) return;
        el.setAttribute("stroke-opacity", "0.45");
        el.setAttribute("stroke-width", "1.5");
      });
      if (blurRef.current) blurRef.current.setAttribute("stdDeviation", "0");
      setPulsing(false);
      setLeaving(true);
      setTimeout(() => {
        if (onComplete) onComplete();
        else navigate("/welcome");
      }, 400);
      return;
    }
    if (step < REVEAL.length) {
      setStep((s) => s + 1);
    }
  };

  return (
    <div
      onClick={handleTap}
      style={{
        background: BG,
        minHeight: "100dvh",
        width: "100%",
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        opacity: leaving ? 0 : mounted ? 1 : 0,
        transition: "opacity 400ms ease",
      }}
    >
      <OnboardingDotIndicator current={1} />
      <div
        style={{
          background: NAVY,
          borderRadius: 16,
          width: "100%",
          maxWidth: 552,
          height: 340,
          overflow: "hidden",
          pointerEvents: "none",
          flexShrink: 0,
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 552 340"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter
              id="line-glow"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur
                id="glow-blur"
                ref={blurRef}
                stdDeviation="0"
                result="blur"
              />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {bgStars.map((s, i) => (
            <circle
              key={i}
              cx={s.cx}
              cy={s.cy}
              r={s.r}
              fill={IVORY}
              opacity={s.o}
            />
          ))}

          <g ref={groupRef} filter="url(#line-glow)">
            {LINES.map((line, i) => {
              const a = STARS[line.from];
              const b = STARS[line.to];
              const visible = i < linesDrawn;
              return (
                <line
                  key={line.id}
                  ref={(el) => (lineRefs.current[line.id] = el)}
                  x1={a.cx}
                  y1={a.cy}
                  x2={b.cx}
                  y2={b.cy}
                  stroke={GOLD}
                  strokeWidth={1.5}
                  strokeOpacity={visible ? 0.5 : 0}
                  style={{ transition: "stroke-opacity 400ms ease" }}
                />
              );
            })}
          </g>

          {(Object.keys(STARS) as StarKey[]).map((k) => {
            const s = STARS[k];
            return (
              <circle
                key={k}
                cx={s.cx}
                cy={s.cy}
                r={s.r}
                fill={IVORY}
                style={{
                  opacity: revealedStars.has(k) ? 1 : 0,
                  transition: "opacity 400ms ease",
                }}
              />
            );
          })}
        </svg>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 552,
          padding: "24px 24px 0",
          pointerEvents: "none",
        }}
      >
        <div
          id="text-area"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            minHeight: 220,
            justifyContent: "flex-start",
          }}
        >
          {revealedTexts.map((t, i) => (
            <p
              key={i}
              style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: "italic",
                fontSize: 17,
                color: INK,
                textAlign: "center",
                lineHeight: 1.6,
                margin: 0,
                animation: "ts-ci-fade 400ms ease forwards",
                opacity: 0,
              }}
            >
              {t}
            </p>
          ))}
        </div>
        <p
          style={{
            fontFamily: "Jost, sans-serif",
            fontSize: 12,
            color: INK,
            opacity: 0.4,
            letterSpacing: "0.08em",
            textAlign: "center",
            marginTop: 24,
          }}
        >
          tap anywhere to continue
        </p>
      </div>
      <style>{`@keyframes ts-ci-fade { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </div>
  );
};

export default ConstellationIntro;
