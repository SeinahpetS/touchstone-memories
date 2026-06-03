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
 * Screen 4 — Name (dot 3).
 */
const OnboardingName = () => {
  const navigate = useNavigate();
  const existing = loadOnboardingDraft() ?? emptyOnboardingDraft();
  const [name, setName] = useState<string>(existing.firstName ?? "");
  const [submitting, setSubmitting] = useState(false);

  const canContinue = name.trim().length > 0 && !submitting;

  const handleContinue = async () => {
    if (!canContinue) return;
    const trimmed = name.trim();
    setSubmitting(true);
    try {
      // Always save to draft so the value persists through signup.
      saveOnboardingDraft({ ...existing, firstName: trimmed });

      // If a session already exists, write directly to profiles too.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await (supabase as any)
          .from("profiles")
          .update({ first_name: trimmed, name: trimmed })
          .eq("id", session.user.id);
      }
    } finally {
      // Advance regardless; draft will be persisted post-signup if needed.
      // Next screen (dot 4) wiring will follow once specified.
      navigate("/onboarding/birth");
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "#F2EEE5" }}
    >
      <OnboardingDotIndicator current={3} />

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
          What shall we call you
        </p>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleContinue();
          }}
          placeholder="Your name"
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
          disabled={!canContinue}
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
            cursor: canContinue ? "pointer" : "not-allowed",
            opacity: canContinue ? 1 : 0.4,
            transition: "opacity 200ms ease",
            animation: "ts-screen4-fade-in 400ms ease both",
          }}
        >
          Continue
        </button>
      </div>

      <style>{`
        @keyframes ts-screen4-fade-in { from { opacity: 0 } to { opacity: 1 } }
        input::placeholder {
          color: rgba(30, 46, 62, 0.35);
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default OnboardingName;
