import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlement } from "@/hooks/useEntitlement";
import { getStripeEnvironment } from "@/lib/stripe";

const NAVY = "#1E2E3E";
const IVORY = "#F2EEE5";
const GOLD = "#B8860B";
const AEGEAN = "#0E7C86";
const RED = "#C0392B";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaveOfferApplied?: () => void;
  onCancelScheduled?: () => void;
}

const FEATURES = [
  "Tell Me A Story — turns your story into the Touchstone pieces that made it matter",
  "Log audio clips up to 60 seconds",
  "Constellation Art — video reveal export + high-resolution download",
  "Export my archive — we'll email you a link to download your entire archive",
  "Heirloom Book — a special offer for Vivid members, coming soon",
];

function FourPointStar({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill={GOLD} />
    </svg>
  );
}

function StarCluster() {
  return (
    <svg width="64" height="32" viewBox="0 0 64 32" aria-hidden="true" className="mx-auto">
      <g fill={GOLD}>
        <path d="M10 16 L12 22 L18 24 L12 26 L10 32 L8 26 L2 24 L8 22 Z" transform="translate(-2 -8) scale(0.7)" />
        <path d="M32 8 L34 14 L40 16 L34 18 L32 24 L30 18 L24 16 L30 14 Z" transform="translate(0 0) scale(0.9)" />
        <path d="M54 16 L56 22 L62 24 L56 26 L54 32 L52 26 L46 24 L52 22 Z" transform="translate(-6 -8) scale(0.7)" />
      </g>
    </svg>
  );
}

type Screen = "plan" | "save_offer" | "confirm_cancel";

export function ManageSubscriptionModal({
  open,
  onClose,
  onSaveOfferApplied,
  onCancelScheduled,
}: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const entitlement = useEntitlement();
  const [screen, setScreen] = useState<Screen>("plan");
  const [busy, setBusy] = useState(false);
  const [saveOfferRedeemed, setSaveOfferRedeemed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setScreen("plan");
    setError(null);
    setBusy(false);
  }, [open]);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("save_offer_redeemed")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setSaveOfferRedeemed(!!data?.save_offer_redeemed);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  if (!open) return null;

  const handleUnlock = () => {
    onClose();
    navigate("/vivid");
  };

  const handleStartCancel = () => {
    if (saveOfferRedeemed) {
      setScreen("confirm_cancel");
    } else {
      setScreen("save_offer");
    }
  };

  const handleAcceptOffer = async () => {
    setBusy(true);
    setError(null);
    try {
      const { error: invokeError } = await supabase.functions.invoke("apply-save-offer", {
        body: { environment: getStripeEnvironment() },
      });
      if (invokeError) throw invokeError;
      onSaveOfferApplied?.();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Couldn't apply the offer.");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmCancel = async () => {
    setBusy(true);
    setError(null);
    try {
      const { error: invokeError } = await supabase.functions.invoke("cancel-subscription", {
        body: { environment: getStripeEnvironment() },
      });
      if (invokeError) throw invokeError;
      onCancelScheduled?.();
      void entitlement.refresh();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Couldn't cancel subscription.");
    } finally {
      setBusy(false);
    }
  };

  const renewalCopy = entitlement.currentPeriodEnd
    ? `Renews ${entitlement.currentPeriodEnd.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}`
    : null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full"
        style={{
          backgroundColor: NAVY,
          borderRadius: 16,
          padding: 32,
          maxWidth: 480,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-2 transition-opacity hover:opacity-80"
          style={{ color: IVORY, background: "transparent", border: "none" }}
        >
          <X className="h-5 w-5" />
        </button>

        {screen === "plan" && !entitlement.isSubscribed && (
          <FreePlanScreen onUnlock={handleUnlock} onMaybeLater={onClose} />
        )}

        {screen === "plan" && entitlement.isSubscribed && (
          <VividPlanScreen
            renewalCopy={renewalCopy}
            cancelAtPeriodEnd={entitlement.cancelAtPeriodEnd}
            onStartCancel={handleStartCancel}
          />
        )}

        {screen === "save_offer" && (
          <SaveOfferScreen
            busy={busy}
            error={error}
            onAccept={handleAcceptOffer}
            onDecline={() => setScreen("confirm_cancel")}
          />
        )}

        {screen === "confirm_cancel" && (
          <ConfirmCancelScreen
            busy={busy}
            error={error}
            onConfirm={handleConfirmCancel}
            onKeep={() => setScreen("plan")}
          />
        )}
      </div>
    </div>
  );
}

function FeatureList() {
  return (
    <ul className="mt-6 space-y-3">
      {FEATURES.map((label) => (
        <li
          key={label}
          className="flex items-start gap-3"
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 14,
            color: IVORY,
            opacity: 0.6,
            lineHeight: 1.5,
          }}
        >
          <span style={{ marginTop: 5 }}>
            <FourPointStar size={10} />
          </span>
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-center"
      style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 24,
        color: IVORY,
        marginTop: 16,
        lineHeight: 1.2,
      }}
    >
      {children}
    </h2>
  );
}

function Subheading({ children, opacity = 0.7 }: { children: React.ReactNode; opacity?: number }) {
  return (
    <p
      className="text-center"
      style={{
        fontFamily: "'Jost', sans-serif",
        fontSize: 14,
        color: IVORY,
        opacity,
        marginTop: 8,
      }}
    >
      {children}
    </p>
  );
}

function PrimaryButton({
  label,
  onClick,
  background = AEGEAN,
  disabled,
}: {
  label: string;
  onClick: () => void;
  background?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full transition-opacity hover:opacity-90 disabled:opacity-60"
      style={{
        marginTop: 28,
        height: 48,
        borderRadius: 8,
        backgroundColor: background,
        color: "#FFFFFF",
        fontFamily: "'Jost', sans-serif",
        fontSize: 15,
        letterSpacing: "0.02em",
        border: "none",
      }}
    >
      {label}
    </button>
  );
}

function QuietButton({
  label,
  onClick,
  opacity = 0.6,
  fontSize = 14,
  marginTop = 8,
}: {
  label: string;
  onClick: () => void;
  opacity?: number;
  fontSize?: number;
  marginTop?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-center"
      style={{
        marginTop,
        height: 44,
        background: "transparent",
        border: "none",
        color: IVORY,
        opacity,
        fontFamily: "'Jost', sans-serif",
        fontSize,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function FreePlanScreen({ onUnlock, onMaybeLater }: { onUnlock: () => void; onMaybeLater: () => void }) {
  return (
    <>
      <StarCluster />
      <Heading>Your Plan</Heading>
      <Subheading>You're on the free plan.</Subheading>
      <FeatureList />
      <PrimaryButton label="Unlock Vivid" onClick={onUnlock} />
      <QuietButton label="Maybe later" onClick={onMaybeLater} />
    </>
  );
}

function VividPlanScreen({
  renewalCopy,
  cancelAtPeriodEnd,
  onStartCancel,
}: {
  renewalCopy: string | null;
  cancelAtPeriodEnd: boolean;
  onStartCancel: () => void;
}) {
  return (
    <>
      <StarCluster />
      <Heading>You're Vivid.</Heading>
      {renewalCopy && (
        <Subheading>
          {cancelAtPeriodEnd ? `Vivid until ${renewalCopy.replace(/^Renews /, "")}` : renewalCopy}
        </Subheading>
      )}
      {!cancelAtPeriodEnd && (
        <div style={{ marginTop: 28 }}>
          <QuietButton
            label="Cancel my subscription"
            onClick={onStartCancel}
            opacity={0.4}
            fontSize={13}
            marginTop={0}
          />
        </div>
      )}
    </>
  );
}

function SaveOfferScreen({
  busy,
  error,
  onAccept,
  onDecline,
}: {
  busy: boolean;
  error: string | null;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <>
      <Heading>Before you go.</Heading>
      <Subheading>
        We'd love for you to stay. How about 30% off your next month — on us.
      </Subheading>
      <PrimaryButton
        label={busy ? "Applying…" : "Accept 30% off"}
        onClick={onAccept}
        disabled={busy}
      />
      <QuietButton
        label="No thanks, cancel anyway"
        onClick={onDecline}
        opacity={0.4}
        fontSize={13}
      />
      {error && (
        <p
          className="text-center"
          style={{
            color: "#E8916F",
            fontSize: 12,
            fontFamily: "'Jost', sans-serif",
            marginTop: 8,
          }}
        >
          {error}
        </p>
      )}
    </>
  );
}

function ConfirmCancelScreen({
  busy,
  error,
  onConfirm,
  onKeep,
}: {
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onKeep: () => void;
}) {
  return (
    <>
      <Heading>Are you sure?</Heading>
      <Subheading>
        You'll keep your Vivid features until your current period ends. After that your account
        returns to the free plan. Your archive stays safe either way.
      </Subheading>
      <PrimaryButton
        label={busy ? "Cancelling…" : "Yes, cancel my subscription"}
        onClick={onConfirm}
        background={RED}
        disabled={busy}
      />
      <QuietButton label="Keep my Vivid plan" onClick={onKeep} opacity={0.6} />
      {error && (
        <p
          className="text-center"
          style={{
            color: "#E8916F",
            fontSize: 12,
            fontFamily: "'Jost', sans-serif",
            marginTop: 8,
          }}
        >
          {error}
        </p>
      )}
    </>
  );
}

export default ManageSubscriptionModal;
