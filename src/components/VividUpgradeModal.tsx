import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onDismiss: () => void;
}

// Touchstone palette
const AEGEAN = "#0E7C86";
const BLUEPRINT = "#4A6B8A";
const NAVY = "#1E2E3E";
const GOLD = "#B8860B";
const IVORY = "#F2EEE5";
const OVERLAY = "#0A1520";

const METEOR_COLORS: Array<{ c: string; w: number }> = [
  { c: AEGEAN, w: 5 },
  { c: GOLD, w: 4 },
  { c: IVORY, w: 4 },
  { c: BLUEPRINT, w: 2 },
  { c: NAVY, w: 1 },
];

function weightedPick() {
  const total = METEOR_COLORS.reduce((s, m) => s + m.w, 0);
  let r = Math.random() * total;
  for (const m of METEOR_COLORS) {
    if ((r -= m.w) <= 0) return m.c;
  }
  return AEGEAN;
}

type Meteor = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  trail: Array<{ x: number; y: number }>;
  sparks: Array<{ x: number; y: number; vx: number; vy: number; life: number; max: number }>;
  size: number;
};

type Star = { x: number; y: number; r: number; phase: number; speed: number };

export function VividUpgradeModal({ open, onDismiss }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [leaving, setLeaving] = useState(false);

  // Meteor shower animation
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let frame = 0;
    let nextSpawn = 36 + Math.floor(Math.random() * 110);
    const meteors: Meteor[] = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Background stars
    const stars: Star[] = Array.from({ length: 110 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.1 + 0.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.01 + Math.random() * 0.02,
    }));

    const spawnMeteor = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const angleDeg = 8 + Math.random() * 8; // 8–16°
      const angle = (angleDeg * Math.PI) / 180;
      const speed = 6 + Math.random() * 4;
      meteors.push({
        x: -40 - Math.random() * 80,
        y: Math.random() * H * 0.85,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: weightedPick(),
        trail: [],
        sparks: [],
        size: 1.6 + Math.random() * 1.4,
      });
      void H;
      void W;
    };

    const render = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;

      // Fade backdrop slightly each frame for trail blending
      ctx.fillStyle = "rgba(10, 21, 32, 0.28)";
      ctx.fillRect(0, 0, W, H);

      // Stars twinkle
      for (const s of stars) {
        s.phase += s.speed;
        const alpha = 0.35 + Math.sin(s.phase) * 0.25;
        ctx.beginPath();
        ctx.fillStyle = `rgba(242, 238, 229, ${alpha.toFixed(3)})`;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Spawn
      if (frame >= nextSpawn) {
        spawnMeteor();
        nextSpawn = frame + 36 + Math.floor(Math.random() * 110);
      }

      // Update + draw meteors
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx;
        m.y += m.vy;
        m.trail.unshift({ x: m.x, y: m.y });
        if (m.trail.length > 240) m.trail.pop();

        // Spark emission
        if (Math.random() < 0.55) {
          m.sparks.push({
            x: m.x,
            y: m.y,
            vx: -m.vx * 0.2 + (Math.random() - 0.5) * 1.2,
            vy: -m.vy * 0.2 + (Math.random() - 0.5) * 1.2,
            life: 0,
            max: 18 + Math.random() * 22,
          });
        }

        // Draw trail (tail → head)
        for (let t = m.trail.length - 1; t >= 0; t--) {
          const pt = m.trail[t];
          const k = 1 - t / m.trail.length; // 1 at head, 0 at tail
          const alpha = Math.pow(k, 2.2) * 0.85;
          const radius = Math.max(0.2, m.size * k);
          ctx.beginPath();
          ctx.fillStyle = hexToRgba(m.color, alpha);
          ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Glowing head: white core fading to color
        const headGrad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.size * 6);
        headGrad.addColorStop(0, "rgba(255,255,255,0.95)");
        headGrad.addColorStop(0.35, hexToRgba(m.color, 0.7));
        headGrad.addColorStop(1, hexToRgba(m.color, 0));
        ctx.beginPath();
        ctx.fillStyle = headGrad;
        ctx.arc(m.x, m.y, m.size * 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.arc(m.x, m.y, m.size * 1.1, 0, Math.PI * 2);
        ctx.fill();

        // Sparks
        for (let s = m.sparks.length - 1; s >= 0; s--) {
          const sp = m.sparks[s];
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.life += 1;
          const k = 1 - sp.life / sp.max;
          if (k <= 0) {
            m.sparks.splice(s, 1);
            continue;
          }
          ctx.beginPath();
          ctx.fillStyle = hexToRgba(m.color, k * 0.85);
          ctx.arc(sp.x, sp.y, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }

        if (m.x > W + 80 || m.y > H + 80) {
          meteors.splice(i, 1);
        }
      }

      frame++;
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [open]);

  if (!open) return null;

  const handleDismiss = () => {
    setLeaving(true);
    setTimeout(() => {
      setLeaving(false);
      onDismiss();
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: OVERLAY }}
      role="dialog"
      aria-modal="true"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

      {/* Dismiss */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="absolute right-4 top-4 z-10 rounded-full p-2 text-[#F2EEE5]/55 transition-colors hover:text-[#F2EEE5]"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Modal card */}
      <div
        className="relative z-10 mx-4 w-full px-7 py-8 text-center shadow-2xl"
        style={{
          backgroundColor: IVORY,
          borderRadius: 20,
          maxWidth: 380,
          transition: "opacity 400ms ease, transform 400ms ease",
          opacity: leaving ? 0 : 1,
          transform: leaving ? "scale(0.95)" : "scale(1)",
        }}
      >
        <Starburst />

        <h2 className="font-playfair text-foreground" style={{ marginTop: 18 }}>
          <span className="block text-[20px] font-medium tracking-tight" style={{ color: NAVY }}>
            Your archive is now
          </span>
          <span
            className="block italic"
            style={{
              color: AEGEAN,
              fontSize: 42,
              letterSpacing: "0.2em",
              marginTop: 6,
              lineHeight: 1.05,
            }}
          >
            VIVID
          </span>
        </h2>

        <div
          className="mx-auto"
          style={{ width: 56, height: 1.5, backgroundColor: GOLD, marginTop: 16, marginBottom: 18 }}
        />

        <p
          className="font-jost text-[15px] leading-relaxed"
          style={{ color: NAVY, fontWeight: 300 }}
        >
          Every capture. Every question. Every layer of meaning — yours without limit.
        </p>

        <ul className="mt-6 space-y-2.5 text-left">
          {[
            "Unlimited AI prompts",
            "Ask Your Archive",
            "The heirloom book — coming after launch",
            "Data export",
          ].map((label) => (
            <li key={label} className="flex items-center gap-3 font-jost text-[14px]" style={{ color: NAVY }}>
              <span
                aria-hidden="true"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  backgroundColor: AEGEAN,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontWeight: 300 }}>{label}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={handleDismiss}
          className="mt-7 w-full font-jost text-[15px] transition-opacity hover:opacity-90"
          style={{
            backgroundColor: NAVY,
            color: IVORY,
            borderRadius: 999,
            padding: "14px 20px",
            letterSpacing: "0.01em",
          }}
        >
          Take me to my constellation →
        </button>
      </div>
    </div>
  );
}

function Starburst() {
  // Aegean circles + Old Gold rays
  const size = 72;
  const cx = size / 2;
  const cy = size / 2;
  const rays = 12;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto"
      aria-hidden="true"
    >
      {Array.from({ length: rays }).map((_, i) => {
        const a = (i / rays) * Math.PI * 2;
        const x1 = cx + Math.cos(a) * 16;
        const y1 = cy + Math.sin(a) * 16;
        const x2 = cx + Math.cos(a) * 34;
        const y2 = cy + Math.sin(a) * 34;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={GOLD}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={cx} cy={cy} r={14} fill={AEGEAN} />
      <circle cx={cx} cy={cy} r={6} fill={IVORY} opacity={0.85} />
      <circle cx={cx} cy={cy} r={3} fill={AEGEAN} />
    </svg>
  );
}

function hexToRgba(hex: string, a: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
