import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import Auth from "./pages/Auth.tsx";
import Archive from "./pages/Archive.tsx";
import Profile from "./pages/Profile.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const RootRoute = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }
  // If a logged-in user has a pending onboarding draft (just signed up),
  // keep them in the Onboarding flow so its persist effect can flush
  // the captured first memory before sending them to /archive.
  if (user) {
    const hasPendingDraft =
      typeof window !== "undefined" &&
      !!localStorage.getItem("ts_onboarding_draft_v1");
    return hasPendingDraft ? <Onboarding /> : <Archive />;
  }
  return <Onboarding />;
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
