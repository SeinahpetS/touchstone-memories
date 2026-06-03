import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingDotIndicator from "@/components/OnboardingDotIndicator";

/**
 * Screen 7 — "Your story is ready to keep." (dot 5, fills on arrival).
 * Auto-advances after 2s with a 400ms crossfade to Screen 8.
 */
const OnboardingStoryReady = () => {
  const navigate = useNavigate();
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const tStart = window.setTimeout(() => setFadingOut(true), 2000);
    const tNav = window.setTimeout(() => navigate("/onboarding/create-account"), 2400);
    return () => {
      window.clearTimeout(tStart);
      window.clearTimeout(tNav);
    };
  }, [navigate]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{
        backgroundColor: "#F2EEE5",
        opacity: fadingOut ? 0 : 1,
        transition: "opacity 400ms ease",
      }}
    >
      <OnboardingDotIndicator current={6} />

      <p
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontStyle: "italic",
          fontSize: 28,
          color: "#2C3E50",
          textAlign: "center",
          margin: 0,
          animation: "ts-screen7-fade-in 600ms ease both",
        }}
      >
        Your story is ready to keep.
      </p>

      <style>{`
        @keyframes ts-screen7-fade-in { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  );
};

export default OnboardingStoryReady;
