import { useEffect, useMemo, useRef, useState } from "react";

const rand = (a: number, b: number) => a + Math.random() * (b - a);

type Flake = {
  size: number; points: string; opacity: number; left: number; top: number;
  delay: number; fall: number; dur: number; sway: number; cycles: number;
  rot: number; flips: number; phase: number;
};

const makeFlakes = (): Flake[] =>
  Array.from({ length: 14 }, () => {
    const size = rand(6, 14);
    const top = rand(0, 25);
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const j = () => rand(0, size * 0.3);
    const pts = [
      [j(), j()], [size - j(), j()], [size - j(), size - j()], [j(), size - j()],
    ].map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
    return {
      size, points: pts, opacity: rand(0.45, 0.9),
      left: rand(20, 80), top, delay: rand(0, 600),
      fall: vh * (1 - top / 100) + size, dur: rand(2400, 3600),
      sway: rand(10, 16) * (Math.random() < 0.5 ? -1 : 1),
      cycles: rand(1, 2), rot: rand(-160, 160), flips: Math.round(rand(2, 3)),
      phase: Math.random() * Math.PI * 2,
    };
  });

/** One-time falling gold leaf. Calls onStart as the first flake begins. */
const GoldLeafBurst = ({ onStart }: { onStart?: () => void }) => {
  const flakes = useMemo(makeFlakes, []);
  const refs = useRef<(SVGSVGElement | null)[]>([]);
  const [alive, setAlive] = useState(true);

  useEffect(() => {
    const first = Math.min(...flakes.map((f) => f.delay));
    const last = Math.max(...flakes.map((f) => f.delay + f.dur));
    const t1 = window.setTimeout(() => onStart?.(), first);
    const t2 = window.setTimeout(() => setAlive(false), last + 50);
    const anims = flakes.map((f, i) => {
      const el = refs.current[i];
      if (!el) return null;
      const steps = 40;
      const frames: Keyframe[] = [];
      for (let s = 0; s <= steps; s++) {
        const p = s / steps;
        const eased = 1 - Math.pow(1 - p, 3);
        const x = f.sway * Math.sin(f.phase + p * f.cycles * Math.PI * 2) - f.sway * Math.sin(f.phase);
        const sx = 1 - 0.85 * (0.5 - 0.5 * Math.cos(p * f.flips * Math.PI * 2));
        const op = p < 0.85 ? f.opacity : f.opacity * (1 - (p - 0.85) / 0.15);
        frames.push({
          transform: `translate(${x.toFixed(2)}px, ${(eased * f.fall).toFixed(2)}px) rotate(${(eased * f.rot).toFixed(1)}deg) scaleX(${sx.toFixed(3)})`,
          opacity: op,
        });
      }
      return el.animate(frames, { duration: f.dur, delay: f.delay, easing: "linear", fill: "both" });
    });
    return () => { clearTimeout(t1); clearTimeout(t2); anims.forEach((a) => a?.cancel()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!alive) return null;
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
      {flakes.map((f, i) => (
        <svg
          key={i}
          ref={(el) => (refs.current[i] = el)}
          width={f.size}
          height={f.size}
          style={{ position: "absolute", left: `${f.left}%`, top: `${f.top}%`, opacity: 0 }}
        >
          <polygon points={f.points} fill="#B8860B" />
        </svg>
      ))}
    </div>
  );
};

export default GoldLeafBurst;
