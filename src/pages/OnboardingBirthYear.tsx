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
 * Screen 5 — Birth Year (dot 4, unfilled).
 */
const OnboardingBirthYear = () => {
  const navigate = useNavigate();
  const existing = loadOnboardingDraft() ?? emptyOnboardingDraft();
  const [year, setYear] = useState<string>(
    existing.birthYear ? String(existing.birthYear) : ""
  );
  const [submitting, setSubmitting] = useState(false);

  const currentYear = new Date().getFullYear();
  const yearNum = parseInt(year, 10);
  const isValidYear =
    !isNaN(yearNum) && yearNum >= 1900 && yearNum <= currentYear;

  const handleContinue = async () => {
    setSubmitting(true);
    try {
      if (isValidYear) {
        saveOnboardingDraft({ ...existing, birthYear: yearNum });
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          await (supabase as any)
            .from("profiles")
            .update({ birth_year: yearNum })
            .eq("id", session.user.id);
        }
      }
    } finally {
      navigate("/onboarding/location");
    }
  };

  const handleSkip = () => {
    navigate("/onboarding/location");
  };

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
          When were you born
        </p>

        <input
          type="number"
          inputMode="numeric"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleContinue();
          }}
          placeholder="Year"
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
            MozAppearance: "textfield",
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
            animation: "ts-screen5-fade-in 400ms ease both",
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
            animation: "ts-screen5-fade-in 400ms ease both",
          }}
        >
          Skip for now
        </button>
      </div>

      <style>{`
        @keyframes ts-screen5-fade-in { from { opacity: 0 } to { opacity: 1 } }
        input::placeholder {
          color: rgba(30, 46, 62, 0.35);
          font-style: italic;
        }
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default OnboardingBirthYear;
