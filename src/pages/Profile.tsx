import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Camera, LogOut, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useEntitlement } from "@/hooks/useEntitlement";
import { getStripeEnvironment } from "@/lib/stripe";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PricingSheet } from "@/components/PricingSheet";
import { PaywallSheet } from "@/components/PaywallSheet";

interface ProfileRow {
  id: string;
  name: string | null;
  avatar_url: string | null;
  tier: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  notification_preferences: { email?: boolean; inApp?: boolean } | null;
}

const Profile = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const entitlement = useEntitlement();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pricingOpen, setPricingOpen] = useState(false);
  const [exportPaywallOpen, setExportPaywallOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [name, setName] = useState("");
  const [emailNotif, setEmailNotif] = useState(true);
  const [inAppNotif, setInAppNotif] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportSent, setExportSent] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  // Show success toast on checkout return and refresh entitlement.
  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      toast.success("Welcome to Vivid. Your subscription is active.");
      void entitlement.refresh();
      searchParams.delete("checkout");
      searchParams.delete("session_id");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      setProfile(data as ProfileRow);
      setName(data.name ?? "");
      const np = (data.notification_preferences as any) ?? {};
      setEmailNotif(np.email ?? true);
      setInAppNotif(np.inApp ?? true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const initial = (name?.trim()?.[0] ?? user.email?.[0] ?? "U").toUpperCase();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl;
      const { error: updErr } = await (supabase as any)
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", user.id);
      if (updErr) throw updErr;
      setProfile((p) => (p ? { ...p, avatar_url: url } : p));
      toast.success("Profile photo updated.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Couldn't upload photo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          name: name.trim() || null,
          notification_preferences: { email: emailNotif, inApp: inAppNotif },
        })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Profile saved.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Couldn't save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    // Export is gated on Vivid (active subscription or trial).
    if (!entitlement.hasAccess) {
      setExportPaywallOpen(true);
      return;
    }
    setExporting(true);
    setExportError(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-export");
      if (error) throw error;
      if (!data?.success) throw new Error("Export failed");
      setExportSent(true);
    } catch (err) {
      console.error(err);
      setExportError("Something went wrong. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          returnUrl: `${window.location.origin}/profile`,
          environment: getStripeEnvironment(),
        },
      });
      if (error) throw error;
      const url = (data as any)?.url;
      if (!url) throw new Error("Portal URL missing");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't open billing portal.");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  // Derive plan label from real entitlement state, not the stale `tier` column.
  let planLabel = "Free";
  let planSubtitle: string | null = "One AI prompt per day. Your archive, always yours.";
  if (entitlement.isSubscribed) {
    planLabel = entitlement.subscriptionPriceId === "vivid_annual" ? "Vivid Annual" : "Vivid";
    planSubtitle = entitlement.cancelAtPeriodEnd && entitlement.currentPeriodEnd
      ? `Cancels ${entitlement.currentPeriodEnd.toLocaleDateString()}`
      : entitlement.currentPeriodEnd
        ? `Renews ${entitlement.currentPeriodEnd.toLocaleDateString()}`
        : null;
  } else if (entitlement.isTrialing) {
    planLabel = "Free trial";
    planSubtitle = entitlement.trialDaysLeft === 1
      ? "Trial ends tomorrow"
      : `${entitlement.trialDaysLeft} days left in trial`;
  } else if (entitlement.trialEndsAt) {
    planLabel = "Free";
    planSubtitle = "Trial ended — upgrade to keep AI prompts and export";
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-5 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/archive")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </button>
          <h1 className="font-playfair text-xl tracking-[0.2em] uppercase">Profile</h1>
          <span className="w-12" aria-hidden="true" />
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar className="h-24 w-24 ring-2 ring-[hsl(var(--gold)/0.6)] ring-offset-4 ring-offset-background">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={name || "Profile"} />
              ) : null}
              <AvatarFallback className="bg-[hsl(var(--dark-card))] text-[hsl(var(--label-color))] text-2xl">
                {initial}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="Edit profile photo"
              className="absolute -bottom-1 -right-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          {uploading && (
            <p className="text-xs text-muted-foreground">Uploading…</p>
          )}
        </div>

        {/* Identity */}
        <section className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              type="email"
              value={user.email ?? ""}
              disabled
              className="bg-muted/40"
            />
          </div>
        </section>

        {/* Theme */}
        <section className="space-y-3">
          <h2 className="font-playfair text-lg">Appearance</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTheme("light")}
              aria-pressed={theme === "light"}
              className={`flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm transition-colors ${
                theme === "light"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sun className="h-4 w-4" /> Light
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              aria-pressed={theme === "dark"}
              className={`flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm transition-colors ${
                theme === "dark"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Moon className="h-4 w-4" /> Dark
            </button>
          </div>
        </section>

        {/* Notifications */}
        <section className="space-y-3">
          <h2 className="font-playfair text-lg">Notifications</h2>
          <div className="rounded-md border border-border divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-xs text-muted-foreground">
                  Reminders and weekly recap
                </p>
              </div>
              <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">In-app</p>
                <p className="text-xs text-muted-foreground">
                  Prompts and gentle nudges
                </p>
              </div>
              <Switch checked={inAppNotif} onCheckedChange={setInAppNotif} />
            </div>
          </div>
        </section>

        {/* Tier */}
        <section className="space-y-3">
          <h2 className="font-playfair text-lg">Current Plan</h2>
          <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">{tierLabel}</p>
              {profile?.trial_ends_at ? (
                <p className="text-xs text-muted-foreground">
                  Trial ends {new Date(profile.trial_ends_at).toLocaleDateString()}
                </p>
              ) : (
                <p className="text-[13px] text-[#2C3E50]" style={{ fontFamily: "'Jost', sans-serif" }}>
                  One AI prompt per day. Your archive, always yours.
                </p>
              )}
            </div>
            <button
              onClick={() => console.log("upgrade tapped")}
              className="inline-flex items-center rounded-full bg-[#B8860B] px-3 py-1 text-[13px] font-medium text-[#F2EEE5]"
              style={{ fontFamily: "'Jost', sans-serif" }}
            >
              Upgrade
            </button>
          </div>
        </section>

        {/* Your Data */}
        <section className="space-y-3" style={{ borderTop: "1px solid #E8E4D8", paddingTop: 24 }}>
          <h2 className="font-playfair text-lg">Your Data</h2>
          <p style={{ fontFamily: "'Jost', sans-serif", color: "#2C3E50", fontSize: 14 }}>
            Your memories belong to you — always. Request a copy of your archive and we'll email you a download link.
          </p>
          <p style={{ fontFamily: "'Jost', sans-serif", color: "#5B4A3F", fontSize: 12 }}>
            The download link expires in 7 days.
          </p>
          {exportSent ? (
            <p style={{ fontFamily: "'Jost', sans-serif", color: "#2E7D5E", fontSize: 13 }}>
              Check your inbox — your download link is on its way.
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                style={{
                  border: "1px solid #1E2E3E",
                  color: "#1E2E3E",
                  background: "transparent",
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 14,
                  borderRadius: 6,
                  padding: "10px 20px",
                  opacity: exporting ? 0.7 : 1,
                  cursor: exporting ? "not-allowed" : "pointer",
                }}
              >
                {exporting ? "Preparing your archive…" : "Email me my archive"}
              </button>
              {exportError && (
                <p style={{ color: "#C2714F", fontSize: 12, fontFamily: "'Jost', sans-serif" }}>
                  {exportError}
                </p>
              )}
            </>
          )}
        </section>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <Button onClick={handleSave} disabled={saving} className="w-full h-12">
            {saving ? "Saving…" : "Save changes"}
          </Button>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
