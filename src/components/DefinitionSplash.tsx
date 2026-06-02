import touchstoneLogo from "@/assets/touchstone-logo.svg";

/**
 * DefinitionSplash — definition card shown on app launch.
 * Waits for the user to tap "Begin" before advancing.
 */
type Props = {
  onBegin?: () => void;
};

const DefinitionSplash = ({ onBegin }: Props) => (
  <div
    className="flex min-h-screen flex-col px-6 py-12"
    style={{ backgroundColor: "#F2EEE5" }}
  >
    <style>{`
      @keyframes ts-def-in {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .ts-def-logo   { animation: ts-def-in 0.7s ease-out 0s both; }
      .ts-def-entry  { animation: ts-def-in 0.7s ease-out 0.1s both; }
      .ts-def-sub    { animation: ts-def-in 0.7s ease-out 1s both; }
      .ts-def-begin  { animation: ts-def-in 0.7s ease-out 1.25s both; }
    `}</style>

    <div className="flex flex-1 flex-col items-center justify-center">
      <img
        src={touchstoneLogo}
        alt="Touchstone"
        width={156}
        height={156}
        className="ts-def-logo"
        style={{ width: 156, height: 156, marginBottom: 24, objectFit: "contain" }}
      />

      <div
        className="ts-def-entry w-full max-w-md"
        style={{
          color: "#2C3E50",
          backgroundColor: "#FAFAF8",
          borderRadius: 12,
          padding: 32,
          boxShadow:
            "0 1px 2px rgba(91,74,63,0.08), 0 12px 28px rgba(91,74,63,0.16), 0 32px 64px -16px rgba(91,74,63,0.18)",
        }}
      >
        <div className="flex items-baseline flex-nowrap gap-x-3 gap-y-1 whitespace-nowrap">
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(36px, 7.4vw, 48px)",
              fontWeight: 700,
              letterSpacing: "-0.005em",
              margin: 0,
              lineHeight: 1.1,
              color: "#2C3E50",
            }}
          >
            touch
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: "0.132em",
                height: "0.132em",
                margin: "0 0.12em",
                verticalAlign: "0.32em",
                backgroundColor: "#B8860B",
                transform: "rotate(45deg)",
              }}
            />
            stone
          </h1>
          <span
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 18,
              color: "rgba(44,62,80,0.55)",
              letterSpacing: "0.02em",
            }}
          >
            (təch-stōn)
          </span>
        </div>

        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            fontStyle: "italic",
            fontSize: 18,
            color: "rgba(44,62,80,0.55)",
            margin: "8px 0 24px",
            letterSpacing: "0.01em",
          }}
        >
          noun
        </p>

        <ol
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {[
            "a fundamental or quintessential part or feature.",
            "a test or criterion for determining the quality or genuineness of a thing.",
            "a black siliceous stone used to test the purity of precious metals by the streak left on the stone.",
          ].map((d, i) => (
            <li
              key={i}
              style={{
                fontFamily: "'Jost', sans-serif",
                fontWeight: 400,
                fontSize: 16,
                lineHeight: 1.6,
                color: "#2C3E50",
                display: "flex",
                gap: 12,
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 18,
                  fontSize: 14,
                  color: "rgba(44,62,80,0.45)",
                }}
              >
                {i + 1}.
              </span>
              <span>{d}</span>
            </li>
          ))}
        </ol>
      </div>

      <p
        className="ts-def-sub mt-12 text-center mx-auto"
        style={{
          fontFamily: "'Playfair Display', serif",
          fontStyle: "italic",
          fontSize: 19,
          lineHeight: 1.5,
          color: "rgba(44,62,80,0.78)",
          maxWidth: 360,
          whiteSpace: "pre-line",
        }}
      >
        A touchstone tests what's real.{"\n"}Some things are too valuable to leave only to memory.
      </p>

      <button
        type="button"
        onClick={onBegin}
        className="ts-def-begin"
        style={{
          marginTop: 16,
          background: "#B8860B",
          border: "none",
          borderRadius: 9999,
          padding: "10px 28px",
          cursor: "pointer",
          fontFamily: "'Playfair Display', serif",
          fontStyle: "italic",
          fontSize: 18,
          color: "#FAFAF8",
        }}
      >
        Show Me
      </button>
    </div>
  </div>
);

export default DefinitionSplash;
