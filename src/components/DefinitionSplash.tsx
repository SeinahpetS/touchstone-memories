import { useEffect } from "react";

/**
 * Splash — Screen 1 of onboarding.
 * Centered "touchstone" wordmark on #F2EEE5.
 * No dot indicator. Auto-advances after 5s; outer crossfade is 400ms.
 */
type Props = {
  onBegin?: () => void;
};

const DefinitionSplash = ({ onBegin }: Props) => {
  useEffect(() => {
    if (!onBegin) return;
    const t = setTimeout(() => onBegin(), 5000);
    return () => clearTimeout(t);
  }, [onBegin]);

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: "#F2EEE5" }}
    >
      <h1
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: "0.15em",
          color: "#1E2E3E",
          margin: 0,
          lineHeight: 1,
        }}
      >
        touchstone
      </h1>
    </div>
  );
};

export default DefinitionSplash;
