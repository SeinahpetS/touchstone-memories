import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Entitlement {
  loading: boolean;
  /** True if user can use premium features (trialing or paid). */
  hasAccess: boolean;
  /** True only when on the free trial (not yet paid). */
  isTrialing: boolean;
  /** True when subscription_status is active/trialing/past_due. */
  isSubscribed: boolean;
  /** Calendar days remaining in trial (0 once expired). */
  trialDaysLeft: number;
  trialEndsAt: Date | null;
  subscriptionStatus: string | null;
  subscriptionPriceId: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  refresh: () => Promise<void>;
}

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export function useEntitlement(): Entitlement {
  const { user } = useAuth();
  const [state, setState] = useState<Omit<Entitlement, "refresh">>({
    loading: true,
    hasAccess: false,
    isTrialing: false,
    isSubscribed: false,
    trialDaysLeft: 0,
    trialEndsAt: null,
    subscriptionStatus: null,
    subscriptionPriceId: null,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
  });

  const load = useCallback(async () => {
    if (!user) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    const { data } = await (supabase as any)
      .from("profiles")
      .select(
        "trial_started_at, trial_ends_at, subscription_status, subscription_price_id, current_period_end, cancel_at_period_end",
      )
      .eq("id", user.id)
      .maybeSingle();

    const trialEnd = data?.trial_ends_at ? new Date(data.trial_ends_at) : null;
    const now = Date.now();
    const trialActive = !!trialEnd && trialEnd.getTime() > now;
    const subStatus: string | null = data?.subscription_status ?? null;
    const isSubscribed = !!subStatus && ACTIVE_STATUSES.has(subStatus);
    const daysLeft = trialEnd
      ? Math.max(0, Math.ceil((trialEnd.getTime() - now) / (1000 * 60 * 60 * 24)))
      : 0;

    setState({
      loading: false,
      hasAccess: isSubscribed || trialActive,
      isTrialing: trialActive && !isSubscribed,
      isSubscribed,
      trialDaysLeft: daysLeft,
      trialEndsAt: trialEnd,
      subscriptionStatus: subStatus,
      subscriptionPriceId: data?.subscription_price_id ?? null,
      cancelAtPeriodEnd: !!data?.cancel_at_period_end,
      currentPeriodEnd: data?.current_period_end ? new Date(data.current_period_end) : null,
    });
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime updates on the profile row so checkout completion reflects instantly.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`profile-entitlement-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, load]);

  return { ...state, refresh: load };
}
