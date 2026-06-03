import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import OnboardingDotIndicator, {
  markOnboardingComplete,
} from "@/components/OnboardingDotIndicator";
import {
  clearOnboardingDraft,
  emptyOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
} from "@/lib/onboardingDraft";

type SubStep = "email" | "password";

const emailSchema = z
  .string()
  .trim()
  .email({ message: "Please enter a valid email." })
  .max(255);

const SIGN_IN_LINK_STYLE: React.CSSProperties = {
  fontFamily: "'Jost', sans-serif",
  fontSize: 12,
  color: "#9E9585",
  marginTop: 20,
  textAlign: "center",
  textDecoration: "none",
};

/**
 * Screen 8 — Create Account (dot 6).
 * Two sub-steps: email → password. Final tap creates the account, migrates
 * the onboarding draft to the new profile, marks onboarding complete, and
 * crossfades to /archive.
 */
const OnboardingCreateAccount = () => {
  const navigate = useNavigate();
  const existing = loadOnboardingDraft() ?? emptyOnboardingDraft();
  const [step, setStep] = useState<SubStep>("email");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  const handleEmailContinue = () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid email.");
      return;
    }
    setError(null);
    setEmail(parsed.data);
    saveOnboardingDraft({ ...existing });
    setStep("password");
  };

  const migrateDraftToProfile = async (userId: string) => {
    const d = loadOnboardingDraft();
    if (!d) return;
    const patch: Record<string, any> = { onboarding_complete: true };
    if (d.firstName && d.firstName.trim()) {
      patch.first_name = d.firstName.trim();
      patch.name = d.firstName.trim();
    }
    if (d.birthMonth) patch.birth_month = d.birthMonth;
    if (d.birthYear) patch.birth_year = d.birthYear;
    if (d.city && d.city.trim()) patch.city = d.city.trim();
    if (d.state) patch.state = d.state;
    if (d.region) patch.region = d.region;
    if (d.country) patch.country = d.country;
    if (d.locationDisplay) patch.location_display = d.locationDisplay;
    if (typeof d.lat === "number") patch.lat = d.lat;
    if (typeof d.lng === "number") patch.lng = d.lng;
    try {
      await (supabase as any).from("profiles").update(patch).eq("id", userId);
    } catch {
      /* non-fatal */
    }
  };

  const handleCreateAccount = async () => {
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const draftName = (existing.firstName ?? "").trim();
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: draftName ? { name: draftName } : undefined,
          emailRedirectTo: window.location.origin,
        },
      });
      if (signUpErr) throw signUpErr;

      const userId = data.user?.id;
      if (data.session && userId) {
        await migrateDraftToProfile(userId);
      }

      markOnboardingComplete();
      clearOnboardingDraft();

      // 400ms crossfade to /archive.
      setFadingOut(true);
      window.setTimeout(() => navigate("/archive"), 400);
    } catch (err: any) {
      setSubmitting(false);
      const msg = err?.message || "Couldn't create your account. Try again.";
      setError(msg);
      toast.error(msg);
    }
  };

  // Dot 6 fills solid on success — pass current=7 so all six dots render filled.
  const dotCurrent = (fadingOut ? 7 : 6) as 1 | 2 | 3 | 4 | 5 | 6;

  return (
    <div
      className="min-h-screen flex flex-col items-center px-6"
      style={{
        backgroundColor: "#F2EEE5",
        opacity: fadingOut ? 0 : 1,
        transition: "opacity 400ms ease",
      }}
    >
      <OnboardingDotIndicator current={dotCurrent} />

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

          <Link to="/auth" style={SIGN_IN_LINK_STYLE}>
            Already have an account? Sign in
          </Link>
        </div>
      )}

      {step === "password" && (
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
            Create a password
          </p>

          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateAccount();
            }}
            placeholder="At least 8 characters"
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
            onClick={handleCreateAccount}
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
            }}
          >
            {submitting ? "Creating…" : "Create My Archive"}
          </button>

          <Link to="/auth" style={SIGN_IN_LINK_STYLE}>
            Already have an account? Sign in
          </Link>
        </div>
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
