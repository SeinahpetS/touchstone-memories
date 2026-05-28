import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import Auth from "./pages/Auth.tsx";
import Archive from "./pages/Archive.tsx";
import Profile from "./pages/Profile.tsx";
import NotFound from "./pages/NotFound.tsx";
import DefinitionSplash from "./components/DefinitionSplash.tsx";

const queryClient = new QueryClient();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const PostSplashRoute = () => {
  const { user, loading } = useAuth();
  const [sessionFresh, setSessionFresh] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (!session) {
        setSessionFresh(false);
        return;
      }
      // Determine session age from last sign-in or session issued-at.
      const lastSignInRaw =
        session.user?.last_sign_in_at ?? (session as any)?.user?.created_at;
      const lastSignIn = lastSignInRaw ? new Date(lastSignInRaw).getTime() : 0;
      const fresh = lastSignIn > 0 && Date.now() - lastSignIn < THIRTY_DAYS_MS;
      setSessionFresh(fresh);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || sessionFresh === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (user && sessionFresh) {
    const hasPendingDraft =
      typeof window !== "undefined" &&
      !!localStorage.getItem("ts_onboarding_draft_v1");
    return hasPendingDraft ? <Onboarding /> : <Archive />;
  }
  return <Auth />;
};

const RootRoute = () => {
  // Phases: "splash" (visible 3s) -> "out" (600ms fade) -> "in" (400ms fade-in app)
  const [phase, setPhase] = useState<"splash" | "out" | "in">("splash");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("out"), 3000);
    const t2 = setTimeout(() => setPhase("in"), 3600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase !== "in") {
    return (
      <div
        style={{
          transition: "opacity 600ms ease",
          opacity: phase === "splash" ? 1 : 0,
        }}
      >
        <DefinitionSplash />
      </div>
    );
  }

  return (
    <div
      style={{
        animation: "ts-root-fade-in 400ms ease forwards",
      }}
    >
      <style>{`@keyframes ts-root-fade-in { from { opacity: 0 } to { opacity: 1 } }`}</style>
      <PostSplashRoute />
    </div>
  );
};

import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { VividCelebrationGate } from "@/components/VividCelebrationGate";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PaymentTestModeBanner />
        <VividCelebrationGate />
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/welcome" element={<Onboarding />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
