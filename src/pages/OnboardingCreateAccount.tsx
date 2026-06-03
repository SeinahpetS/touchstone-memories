import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import OnboardingDotIndicator from "@/components/OnboardingDotIndicator";
import {
  emptyOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
} from "@/lib/onboardingDraft";

type SubStep = "email" | "password" | "confirm";

const emailSchema = z
  .string()
  .trim()
  .email({ message: "Please enter a valid email." })
  .max(255);

/**
 * Screen 8 — Create Account (dot 6).
 * Three sub-steps share a single screen: email → password → confirm.
 * Only 8a (email) is implemented so far.
 */
const OnboardingCreateAccount = () => {
  const navigate = useNavigate();
  const existing = loadOnboardingDraft() ?? emptyOnboardingDraft();
  const [step, setStep] = useState<SubStep>("email");
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleEmailContinue = () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid email.");
      return;
    }
    setError(null);
    saveOnboardingDraft({ ...existing, /* email kept in component state */ });
    // Persist email into draft via a side channel until 8b/8c are defined.
    try {
      sessionStorage.setItem("ts_signup_email", parsed.data);
    } catch {
      /* ignore */
    }
    setStep("password");
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center px-6"
      style={{ backgroundColor: "#F2EEE5" }}
    >
      <OnboardingDotIndicator current={6} />

      <h1
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 52,
          letterSpacing: "0.15em",
          color: "#1E2E3E",
          margin: 0,
          marginTop: 96,
          marginBottom: 64,
          textAlign: "center",
        }}
      >
        touchstone
      </h1>

      {step === "email" && (
        <div
          className="w-full max-w-sm flex flex-col items-center"
          style={{ animation: "ts-screen8-fade-in 400ms ease both" }}
        >
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
            Your email
          </p>

          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleEmailContinue();
            }}
            placeholder="you@example.com"
            autoFocus
            className="w-full text-center bg-transparent focus:outline-none"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: "italic",
              fontSize: 20,
              color: "#1E2E3E",
              border: "none",
              borderBottom: "1px solid #B8860B",
              padding: "8px 0",
              borderRadius: 0,
            }}
          />

          {error && (
            <p
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: 12,
                color: "#B05242",
                marginTop: 12,
                textAlign: "center",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleEmailContinue}
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
              cursor: "pointer",
            }}
          >
            Continue
          </button>
        </div>
      )}

      {step !== "email" && (
        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 12,
            color: "#9E9585",
            marginTop: 40,
            textAlign: "center",
          }}
        >
          Next sub-step coming soon.
        </p>
      )}

      <style>{`
        @keyframes ts-screen8-fade-in { from { opacity: 0 } to { opacity: 1 } }
        input::placeholder {
          color: rgba(30, 46, 62, 0.35);
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default OnboardingCreateAccount;
