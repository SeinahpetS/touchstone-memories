import { useNavigate, useSearchParams } from "react-router-dom";

const IVORY = "#F2EEE5";
const CARD_BG = "#E8E4D8";
const NAVY = "#1E2E3E";
const INK = "#2C3E50";
const SECONDARY = "#5B4A3F";
const AEGEAN = "#0E7C86";
const GOLD = "#B8860B";

const WelcomeTouchstones = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const kept = Number(params.get("kept") || "0");

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
        .ts-welcome-stagger > *:nth-child(2) { animation-delay: 240ms; }
        .ts-welcome-stagger > *:nth-child(3) { animation-delay: 400ms; }
        .ts-welcome-stagger > *:nth-child(4) { animation-delay: 560ms; }
        .ts-welcome-stagger > *:nth-child(5) { animation-delay: 720ms; }
      `}</style>

      <div className="mx-auto w-full max-w-md px-6 pt-16 pb-12 flex-1 flex flex-col ts-welcome-stagger">
        {/* Small ornament */}
        <div
          aria-hidden
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginBottom: 24,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 999, background: GOLD, opacity: 0.7 }} />
          <span style={{ width: 6, height: 6, borderRadius: 999, background: AEGEAN, opacity: 0.8 }} />
          <span style={{ width: 6, height: 6, borderRadius: 999, background: GOLD, opacity: 0.7 }} />
        </div>

        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontSize: 32,
            lineHeight: 1.2,
            color: INK,
            textAlign: "center",
            margin: 0,
          }}
        >
          {kept === 1
            ? "Your first Touchstone is yours."
            : "Your first Touchstones are yours."}
        </h1>

        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 16,
            lineHeight: 1.6,
            color: INK,
            textAlign: "center",
            margin: "18px 0 0",
          }}
        >
          A small gift from your own memory.
          Touchstone will keep them safe — quiet, ad-free, and only ever yours.
        </p>

        {/* Vivid block */}
        <div
          style={{
            marginTop: 32,
            background: CARD_BG,
            borderRadius: 14,
            padding: "20px 22px",
            borderLeft: `4px solid ${AEGEAN}`,
          }}
        >
          <p
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: AEGEAN,
              margin: 0,
            }}
          >
            About Vivid
          </p>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontStyle: "italic",
              fontSize: 18,
              color: INK,
              margin: "8px 0 0",
              lineHeight: 1.4,
            }}
          >
            Tell Me A Story is part of Vivid.
          </p>
          <p
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 14,
              lineHeight: 1.55,
              color: SECONDARY,
              margin: "10px 0 0",
            }}
          >
            Vivid is Touchstone's deeper tier — guided story sessions, richer
            artifacts, longer transcripts. You can keep using Touchstone freely
            without it.
          </p>
        </div>

        {/* Manual entry hint */}
        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 14,
            lineHeight: 1.55,
            color: SECONDARY,
            textAlign: "center",
            margin: "26px 0 0",
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
