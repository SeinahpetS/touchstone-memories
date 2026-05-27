import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEntitlement } from "@/hooks/useEntitlement";
import { VividUpgradeModal } from "@/components/VividUpgradeModal";

const SEEN_KEY = "ts_vivid_celebration_seen_v1";

/**
 * Shows the Vivid celebration modal exactly once after a successful upgrade.
 * Trigger sources:
 *   1. URL contains ?checkout=success (Stripe return) — fires immediately.
 *   2. Entitlement transitions from non-subscribed → isSubscribed in-session.
 */
export function VividCelebrationGate() {
  const { isSubscribed, loading } = useEntitlement();
  const [open, setOpen] = useState(false);
  const prevSubRef = useRef<boolean | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // URL-triggered
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("checkout") === "success") {
      if (typeof window !== "undefined" && !sessionStorage.getItem(SEEN_KEY)) {
        setOpen(true);
        sessionStorage.setItem(SEEN_KEY, "1");
      }
      // Clean the query param so refresh doesn't replay it.
      params.delete("checkout");
      params.delete("session_id");
      const clean = params.toString();
      navigate(
        { pathname: location.pathname, search: clean ? `?${clean}` : "" },
        { replace: true },
      );
    }
    // Only react when the search string changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Transition-triggered
  useEffect(() => {
    if (loading) return;
    const prev = prevSubRef.current;
    prevSubRef.current = isSubscribed;
    if (prev === false && isSubscribed) {
      if (typeof window !== "undefined" && !sessionStorage.getItem(SEEN_KEY)) {
        setOpen(true);
        sessionStorage.setItem(SEEN_KEY, "1");
      }
    }
  }, [isSubscribed, loading]);

  return (
    <VividUpgradeModal
      open={open}
      onDismiss={() => {
        setOpen(false);
        navigate("/archive");
      }}
    />
  );
}
