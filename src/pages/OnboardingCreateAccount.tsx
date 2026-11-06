import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import OnboardingDotIndicator, {
  markOnboardingComplete,
} from "@/components/OnboardingDotIndicator";
import {
  clearOnboardingDraft,
  emptyOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
} from "@/lib/onboardingDraft";
import { migrateOnboardingStory } from "@/lib/onboardingStoryDraft";

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
    if (d.country_code) patch.country_code = d.country_code;
    if (d.region_code) patch.region_code = d.region_code;
    if (d.city) patch.place_id = d.placeId ?? null;
    try {
      const { error } = await (supabase as any).from("profiles").update(patch).eq("id", userId);
      if (error) throw error;
    } catch (error) { throw error; }
  };

  // Coming back from a Google round-trip: run the same post-sign-up steps the
  // email path runs, then crossfade to the archive.
  const resumedRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    const finish = async (userId: string) => {
      if (resumedRef.current) return;
      resumedRef.current = true;
      try {
        await migrateDraftToProfile(userId);
        await migrateOnboardingStory(userId);
      } catch {
        /* Archive entry retries the save. */
      }
      markOnboardingComplete();
      clearOnboardingDraft();
      setFadingOut(true);
      window.setTimeout(() => navigate("/archive"), 400);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled && session?.user) void finish(session.user.id);
    });
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled && session?.user) void finish(session.user.id);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleGoogle = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/onboarding/create-account`,
      });
      if (result.error) throw result.error;
      // The browser is on its way back to this screen with a session.
      if (result.redirected) return;
    } catch (err: any) {
      setSubmitting(false);
      const msg = err?.message || "Couldn't sign in with Google. Try again.";
      setError(msg);
      toast.error(msg);
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
      if (!data.session || !userId) {
        toast.success("Check your email to confirm your account. Your kept cards are safe on this device.");
        navigate("/auth", { replace: true });
        return;
      }
      if (data.session && userId) {
        await migrateDraftToProfile(userId);
        await migrateOnboardingStory(userId);
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

  const googleButton = (
    <button
      type="button"
      onClick={handleGoogle}
      disabled={submitting}
      className="ts-google-btn w-full flex items-center justify-center"
      style={{
        marginTop: 20,
        height: 52,
        padding: "0 12px",
        gap: 10,
        backgroundColor: "#FFFFFF",
        border: "1px solid #747775",
        borderRadius: 12,
        fontFamily: "'Jost', sans-serif",
        fontWeight: 500,
        fontSize: 14,
        lineHeight: "20px",
        color: "#1F1F1F",
        cursor: submitting ? "not-allowed" : "pointer",
        opacity: submitting ? 0.6 : 1,
      }}
    >
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/>
        <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/>
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
      </svg>
      Continue with Google
    </button>
  );

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

          {googleButton}

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

          {googleButton}

          <Link to="/auth" style={SIGN_IN_LINK_STYLE}>
            Already have an account? Sign in
          </Link>
        </div>
      )}

      <style>{`
        @keyframes ts-screen8-fade-in { from { opacity: 0 } to { opacity: 1 } }
        .ts-google-btn:hover { background-color: #F2F2F2 !important; }
        input::placeholder {
          color: rgba(30, 46, 62, 0.35);
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default OnboardingCreateAccount;
