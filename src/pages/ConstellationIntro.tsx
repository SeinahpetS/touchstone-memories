import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * 5-screen constellation onboarding. Sits between sign-up and the archive.
 * All transitions are pure opacity dissolves. Mobile-first, max-width 600px.
 *
 * Screen 1: tap-to-reveal 5 lines, then tap to advance.
 * Screens 2-4: full-screen dissolve, single tap advances.
 * Screen 5: CTA to save first touchstone.
 */

const BG = "#1E2E3E";
const TEXT = "#F2EEE5";
const GOLD = "#B8860B";

const SCREEN1_LINES = [
  "Every star looks like just a star...",
  "...until you see what it's part of.",
  "Your touchstones are the same.",
  "Each one a point of light...",
  "...all of them quietly forming a constellation\nentirely your own.",
];

type Phase = "s1" | "s2" | "s3" | "s4" | "s5";

const Dissolve = ({
  show,
  children,
  delay = 0,
  className = "",
}: {
  show: boolean;
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => (
  <div
    className={className}
    style={{
      opacity: show ? 1 : 0,
      transition: `opacity 900ms ease-out ${delay}ms`,
    }}
  >
    {children}
  </div>
);

const ConstellationIntro = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("s1");
  const [linesShown, setLinesShown] = useState(0);
  const [ghostHidden, setGhostHidden] = useState(false);
  // dissolve-in state for full-screen screens
  const [s2In, setS2In] = useState(false);
  const [s3In, setS3In] = useState(false);
  const [s4In, setS4In] = useState(false);
  const [s5In, setS5In] = useState(false);

  useEffect(() => {
    if (phase === "s2") setTimeout(() => setS2In(true), 30);
    if (phase === "s3") setTimeout(() => setS3In(true), 30);
    if (phase === "s4") setTimeout(() => setS4In(true), 30);
    if (phase === "s5") setTimeout(() => setS5In(true), 30);
  }, [phase]);

  const handleS1Tap = () => {
    if (!ghostHidden) setGhostHidden(true);
    if (linesShown < SCREEN1_LINES.length) {
      setLinesShown((n) => n + 1);
    } else {
      setPhase("s2");
    }
  };

  const advance = (next: Phase) => () => setPhase(next);

  const startSave = () => {
    navigate("/welcome", { state: { skipToWalkthrough: true } });
  };

  return (
    <div
      onClick={
        phase === "s1"
          ? handleS1Tap
          : phase === "s2"
          ? advance("s3")
          : phase === "s3"
          ? advance("s4")
          : phase === "s4"
          ? advance("s5")
          : undefined
      }
      style={{
        background: BG,
        color: TEXT,
        minHeight: "100dvh",
        width: "100%",
        cursor: phase === "s5" ? "default" : "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
      className="flex items-center justify-center"
    >
      <div
        className="w-full flex flex-col items-center justify-center px-6 py-10"
        style={{ maxWidth: 600, minHeight: "100dvh" }}
      >
        {phase === "s1" && (
          <div className="flex flex-col items-center w-full">
            <div
              aria-label="constellation-placeholder"
              data-testid="constellation-placeholder"
              style={{
                width: 240,
                height: 240,
                borderRadius: "50%",
                background: BG,
                border: `1px solid ${GOLD}55`,
                marginBottom: 56,
              }}
            />
            <div
              className="flex flex-col items-center text-center"
              style={{ gap: 18, minHeight: 280 }}
            >
              {SCREEN1_LINES.map((line, i) => (
                <Dissolve key={i} show={i < linesShown}>
                  <p
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 20,
                      lineHeight: 1.5,
                      color: TEXT,
                      margin: 0,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {line}
                  </p>
                </Dissolve>
              ))}
            </div>
            <div
              style={{
                marginTop: 40,
                opacity: ghostHidden ? 0 : 0.4,
                transition: "opacity 600ms ease-out",
                fontFamily: "Jost, sans-serif",
                fontSize: 12,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: TEXT,
              }}
            >
              tap to continue
            </div>
          </div>
        )}

        {phase === "s2" && (
          <Dissolve show={s2In} className="w-full text-center">
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 26,
                lineHeight: 1.45,
                color: TEXT,
                margin: 0,
                fontWeight: 500,
              }}
            >
              Touchstone holds everything that made you who you are, and reveals why it still matters.
            </h1>
            <p
              style={{
                marginTop: 28,
                fontFamily: "Jost, sans-serif",
                fontSize: 14,
                lineHeight: 1.6,
                color: TEXT,
                opacity: 0.6,
              }}
            >
              A living archive of the moments, people, and things that shaped you.
            </p>
          </Dissolve>
        )}

        {phase === "s3" && (
          <Dissolve show={s3In} className="w-full text-center">
            <p
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 21,
                lineHeight: 1.7,
                color: TEXT,
                margin: 0,
                fontWeight: 400,
              }}
            >
              A meal you'd travel back for. The light on a specific afternoon you almost forgot to look up and see. The conversation that changed the way you thought. A voice you're afraid of forgetting. The moment just before everything was different.
            </p>
            <p
              style={{
                marginTop: 32,
                fontFamily: "Jost, sans-serif",
                fontSize: 14,
                lineHeight: 1.6,
                color: TEXT,
                opacity: 0.6,
              }}
            >
              If it moved you, it belongs here.
            </p>
          </Dissolve>
        )}

        {phase === "s4" && (
          <Dissolve show={s4In} className="w-full text-center">
            <p
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 23,
                lineHeight: 1.55,
                color: TEXT,
                margin: 0,
                fontWeight: 400,
              }}
            >
              No rules. No streaks. No right way to do this. Some weeks you'll save ten things. Some weeks, one. Touchstone keeps them all, patiently.
            </p>
          </Dissolve>
        )}

        {phase === "s5" && (
          <Dissolve show={s5In} className="w-full text-center flex flex-col items-center">
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 28,
                lineHeight: 1.4,
                color: TEXT,
                margin: 0,
                fontWeight: 500,
              }}
            >
              What's one thing from today worth keeping?
            </h2>
            <button
              type="button"
              onClick={startSave}
              style={{
                marginTop: 48,
                width: "100%",
                maxWidth: 420,
                background: GOLD,
                color: "#FFFFFF",
                fontFamily: "Jost, sans-serif",
                fontSize: 15,
                letterSpacing: "0.06em",
                padding: "16px 20px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
              }}
            >
              Save your first touchstone.
            </button>
          </Dissolve>
        )}
      </div>
    </div>
  );
};

export default ConstellationIntro;
