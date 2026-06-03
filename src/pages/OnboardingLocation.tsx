import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import OnboardingDotIndicator from "@/components/OnboardingDotIndicator";
import {
  emptyOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
} from "@/lib/onboardingDraft";

/**
 * Screen 6 — Location (dot 4, completes on Continue or Skip).
 */
const OnboardingLocation = () => {
  const navigate = useNavigate();
  const existing = loadOnboardingDraft() ?? emptyOnboardingDraft();
  const [city, setCity] = useState<string>(existing.city ?? "");
  const [submitting, setSubmitting] = useState(false);

  const advance = () => navigate("/onboarding/welcome");

  const handleContinue = async () => {
    setSubmitting(true);
    try {
      const trimmed = city.trim();
      if (trimmed) {
        saveOnboardingDraft({
          ...existing,
          city: trimmed,
          locationDisplay: trimmed,
        });
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          await (supabase as any)
            .from("profiles")
            .update({ city: trimmed, location_display: trimmed })
            .eq("id", session.user.id);
        }
      }
    } finally {
      advance();
    }
  };

  const handleSkip = () => advance();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "#F2EEE5" }}
    >
      <OnboardingDotIndicator current={4} />

      <div className="w-full max-w-sm flex flex-col items-center">
        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#9E9585",
            margin: 0,
            marginBottom: 28,
            textAlign: "center",
          }}
        >
          Where are you based
        </p>

        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleContinue();
          }}
          placeholder="City or town"
          autoFocus
          className="w-full text-center bg-transparent focus:outline-none"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: "italic",
            fontSize: 24,
            color: "#1E2E3E",
            border: "none",
            borderBottom: "1px solid #B8860B",
            padding: "8px 0",
            borderRadius: 0,
          }}
        />

        <button
          type="button"
          onClick={handleContinue}
          disabled={submitting}
          className="w-full"
          style={{
            marginTop: 40,
            height: 52,
            backgroundColor: "#1E2E3E",
            color: "#F2EEE5",
            border: "none",
            borderRadius: 12,
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 16,
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1,
            transition: "opacity 200ms ease",
            animation: "ts-screen6-fade-in 400ms ease both",
          }}
        >
          Continue
        </button>

        <button
          type="button"
          onClick={handleSkip}
          className="mt-4"
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 12,
            color: "#9E9585",
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
            textUnderlineOffset: 3,
            animation: "ts-screen6-fade-in 400ms ease both",
          }}
        >
          Skip for now
        </button>
      </div>

      <style>{`
        @keyframes ts-screen6-fade-in { from { opacity: 0 } to { opacity: 1 } }
        input::placeholder {
          color: rgba(30, 46, 62, 0.35);
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default OnboardingLocation;
