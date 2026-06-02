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
import ConstellationIntro from "./pages/ConstellationIntro.tsx";
import Auth from "./pages/Auth.tsx";
import Archive from "./pages/Archive.tsx";
import Profile from "./pages/Profile.tsx";
import FAQ from "./pages/FAQ.tsx";
import StoryUnfold from "./pages/StoryUnfold.tsx";
import StoryReview from "./pages/StoryReview.tsx";
import StorySessionView from "./pages/StorySessionView.tsx";
import StoryTranscriptView from "./pages/StoryTranscriptView.tsx";
import TellStory from "./pages/TellStory.tsx";
import TellStoryResults from "./pages/TellStoryResults.tsx";
import Vivid from "./pages/Vivid.tsx";
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
    const isEditing =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("edit");
    if (isEditing) return <Index />;
    return hasPendingDraft ? <Onboarding /> : <Archive />;
  }

  return <Auth />;
};

const RootRoute = () => {
  // Skip splash entirely when arriving with intent (e.g. /?edit=<id>).
  const hasIntent =
    typeof window !== "undefined" && window.location.search.length > 0;

  // Phases: "splash" (waits for tap) -> "out" (600ms fade) -> "in" (400ms fade-in app)
  const [phase, setPhase] = useState<"splash" | "out" | "in">(
    hasIntent ? "in" : "splash",
  );


  const handleBegin = () => {
    if (phase !== "splash") return;
    setPhase("out");
    setTimeout(() => {
      window.location.assign("/auth");
    }, 600);
  };

  if (phase !== "in") {
    return (
      <div
        style={{
          transition: "opacity 600ms ease",
          opacity: phase === "splash" ? 1 : 0,
        }}
      >
        <DefinitionSplash onBegin={handleBegin} />
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
import BottomNav from "@/components/BottomNav";
import { useLocation } from "react-router-dom";

const NAV_PATHS = ["/archive", "/settings", "/story-unfold", "/vivid"];

const BottomNavGate = () => {
  const { pathname } = useLocation();
  const show = NAV_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!show) return null;
  return <BottomNav />;
};

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
          <Route path="/constellation" element={<ConstellationIntro />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/settings" element={<Profile />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/story-unfold" element={<StoryUnfold />} />
          <Route path="/story-unfold/review" element={<StoryReview />} />
          <Route path="/story-unfold/session/:id" element={<StorySessionView />} />
          <Route path="/story-unfold/session/:id/transcript" element={<StoryTranscriptView />} />
          <Route path="/tell-a-story" element={<TellStory />} />
          <Route path="/tell-a-story/results" element={<TellStoryResults />} />
          <Route path="/vivid" element={<Vivid />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <BottomNavGate />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
