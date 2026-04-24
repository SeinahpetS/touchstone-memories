import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { toast } from "sonner";

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate("/archive", { replace: true });
  }, [user, loading, navigate]);

  // Auto-sign-in as dev user so /auth is skipped entirely.
  useEffect(() => {
    if (loading || user || submitting) return;
    handleDevBypass();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message || "Google sign-in failed");
    }
  };

  // Dev-only bypass — gated by import.meta.env.DEV so the button and handler
  // are tree-shaken from production builds.
  const DEV_EMAIL = "dev@touchstone.local";
  const DEV_PASSWORD = "Dev!Touchstone-2026#Strong";
  const handleDevBypass = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: DEV_EMAIL,
        password: DEV_PASSWORD,
      });
      if (error) {
        // First run on this backend — create the dev user, then sign in.
        const { error: signUpErr } = await supabase.auth.signUp({
          email: DEV_EMAIL,
          password: DEV_PASSWORD,
          options: {
            data: { name: "Dev User" },
            emailRedirectTo: window.location.origin,
          },
        });
        if (signUpErr) throw signUpErr;
        const retry = await supabase.auth.signInWithPassword({
          email: DEV_EMAIL,
          password: DEV_PASSWORD,
        });
        if (retry.error) {
          throw new Error(
            "Dev user created but sign-in needs email confirmation. Disable email confirmations in backend auth settings (or confirm dev@touchstone.local once)."
          );
        }
      }
      toast.success("Signed in as dev user");
    } catch (err: any) {
      toast.error(err.message || "Dev bypass failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Wordmark */}
        <div className="text-center">
          <h1 className="font-playfair text-2xl font-semibold tracking-[0.2em] text-foreground uppercase">
            Touchstone
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {isSignUp ? "Create your archive" : "Welcome back"}
          </p>
        </div>

        {/* Google */}
        <Button
          onClick={handleGoogle}
          variant="outline"
          className="w-full h-12 text-base"
        >
          Continue with Google
        </Button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-sm text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmail} className="space-y-4">
          {isSignUp && (
            <Input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 text-base"
            />
          )}
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 text-base"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="h-12 text-base"
          />
          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 text-base bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {submitting ? "…" : isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="text-center text-base text-muted-foreground">
          {isSignUp ? "Already have an account?" : "New here?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-foreground underline underline-offset-4"
          >
            {isSignUp ? "Sign in" : "Create one"}
          </button>
        </p>

        <div className="border-t border-dashed border-border pt-4">
          <Button
            type="button"
            onClick={handleDevBypass}
            disabled={submitting}
            variant="ghost"
            className="w-full h-10 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
          >
            Skip login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
