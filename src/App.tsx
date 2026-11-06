import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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
import Person from "./pages/Person.tsx";
import Capture from "./pages/Capture";
import Keep from "./pages/Keep.tsx";
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
import WelcomeTouchstones from "./pages/WelcomeTouchstones.tsx";
import OnboardingName from "./pages/OnboardingName.tsx";
import OnboardingBirthYear from "./pages/OnboardingBirthYear.tsx";
import OnboardingLocation from "./pages/OnboardingLocation.tsx";
import OnboardingStoryReady from "./pages/OnboardingStoryReady.tsx";
import OnboardingCreateAccount from "./pages/OnboardingCreateAccount.tsx";
import OnboardingStoryUnfold from "./pages/OnboardingStoryUnfold.tsx";
import DefinitionSplash from "./components/DefinitionSplash.tsx";
import { ARCHIVE_PATH, resolvePostSignInPath } from "@/lib/postSignInRoute";

const queryClient = new QueryClient();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const SplashLoading = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <p className="text-muted-foreground">Loading…</p>
  </div>
);

const PostSplashRoute = () => {
  const { user, loading } = useAuth();
  const [sessionFresh, setSessionFresh] = useState<boolean | null>(null);
  const [signedInPath, setSignedInPath] = useState<string | null>(null);

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

  // Signed-in with no stored city, no completion flag and nothing waiting on
  // this device: put them back into onboarding at the name screen.
  useEffect(() => {
    if (!user) return;
    if (new URLSearchParams(window.location.search).has("edit")) return;
    let cancelled = false;
    void resolvePostSignInPath(user.id).then((path) => {
      if (!cancelled) setSignedInPath(path);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || sessionFresh === null) return <SplashLoading />;

  if (user && sessionFresh) {
    const hasPendingDraft =
      typeof window !== "undefined" &&
      !!localStorage.getItem("ts_onboarding_draft_v1") && !localStorage.getItem("ts_onboarding_draft");
    const isEditing =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("edit");
    if (isEditing) return <Index />;
    if (hasPendingDraft) return <Onboarding />;
    if (signedInPath === null) return <SplashLoading />;
    if (signedInPath !== ARCHIVE_PATH) return <Navigate to={signedInPath} replace />;
    return <Archive />;
  }

  return <Auth />;
};

const RootRoute = () => {
  // Skip splash entirely when arriving with intent (e.g. /?edit=<id>).
  // Ignore Lovable preview params like __lovable_sha that aren't user intent.
  const hasIntent = (() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    for (const key of Array.from(params.keys())) {
      if (!key.startsWith("__lovable") && !key.startsWith("__cf")) return true;
    }
    return false;
  })();

  // Phases: "splash" (waits for tap) -> "out" (600ms fade) -> "in" (400ms fade-in app)
  const [phase, setPhase] = useState<"splash" | "out" | "in">(
    hasIntent ? "in" : "splash",
  );


  const handleBegin = async () => {
    if (phase !== "splash") return;
    setPhase("out");
    const { data: { session } } = await supabase.auth.getSession();
    const onboardingComplete =
      typeof window !== "undefined" &&
      localStorage.getItem("ts_onboarding_complete") === "1";

    let dest: string;
    if (onboardingComplete) {
      // Returning user: skip all onboarding screens.
      dest = session ? await resolvePostSignInPath(session.user.id) : "/auth";
    } else {
      // First-time user: enter the onboarding flow at the constellation intro.
      const hasPendingDraft =
        typeof window !== "undefined" &&
        !!localStorage.getItem("ts_onboarding_draft_v1") && !localStorage.getItem("ts_onboarding_draft");
      dest = session
        ? hasPendingDraft
          ? "/welcome"
          : await resolvePostSignInPath(session.user.id)
        : "/constellation";
    }
    setTimeout(() => {
      window.location.assign(dest);
    }, 400);
  };

  if (phase !== "in") {
    return (
      <div
        style={{
          transition: "opacity 400ms ease",
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
  // The card review stack is a full-screen focused flow — no tab bar there.
  if (pathname.startsWith("/story-unfold/review")) return null;
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
          <Route path="/onboarding/story-unfold" element={<OnboardingStoryUnfold />} />
          <Route path="/onboarding-story" element={<OnboardingStoryUnfold />} />
          <Route path="/onboarding/story-review" element={<StoryReview />} />
          <Route path="/onboarding/name" element={<OnboardingName />} />
          <Route path="/onboarding-name" element={<OnboardingName />} />
          <Route path="/onboarding/birth" element={<OnboardingBirthYear />} />
          <Route path="/onboarding/location" element={<OnboardingLocation />} />
          <Route path="/onboarding/ready" element={<OnboardingStoryReady />} />
          <Route path="/onboarding/create-account" element={<OnboardingCreateAccount />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/person/:id" element={<Person />} />
          <Route path="/keep/:token" element={<Keep />} />
          <Route path="/capture" element={<Capture />} />
          <Route path="/settings" element={<Profile />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/story-unfold" element={<StoryUnfold />} />
          <Route path="/story-unfold/review" element={<StoryReview />} />
          <Route path="/story-unfold/session/:id" element={<StorySessionView />} />
          <Route path="/story-unfold/session/:id/transcript" element={<StoryTranscriptView />} />
          <Route path="/tell-a-story" element={<TellStory />} />
          <Route path="/tell-a-story/results" element={<TellStoryResults />} />
          <Route path="/welcome-touchstones" element={<WelcomeTouchstones />} />
          <Route path="/vivid" element={<Vivid />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <BottomNavGate />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
