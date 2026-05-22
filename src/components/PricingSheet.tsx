import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StripeEmbeddedCheckoutForm } from "@/components/StripeEmbeddedCheckout";
import { Check } from "lucide-react";

type Plan = "vivid_monthly" | "vivid_annual";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional preselect; defaults to annual. */
  defaultPlan?: Plan;
  returnUrl?: string;
}

const PLANS: Array<{
  id: Plan;
  name: string;
  price: string;
  cadence: string;
  badge?: string;
  subtitle?: string;
}> = [
  {
    id: "vivid_annual",
    name: "Vivid Annual",
    price: "$84",
    cadence: "/ year",
    badge: "Two months free",
    subtitle: "$7/month, billed yearly",
  },
  {
    id: "vivid_monthly",
    name: "Vivid Monthly",
    price: "$12",
    cadence: "/ month",
    subtitle: "Cancel anytime",
  },
];

const FEATURES = [
  "Unlimited AI follow-up prompts",
  "Premium reflective prompts",
  "Email your full archive anytime",
  "Everything you capture stays yours, forever",
];

export function PricingSheet({ open, onOpenChange, defaultPlan = "vivid_annual", returnUrl }: Props) {
  const [selected, setSelected] = useState<Plan>(defaultPlan);
  const [checkingOut, setCheckingOut] = useState(false);

  const fallbackReturn =
    typeof window !== "undefined"
      ? `${window.location.origin}/profile?checkout=success&session_id={CHECKOUT_SESSION_ID}`
      : "";

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setCheckingOut(false);
      }}
    >
      <SheetContent side="bottom" className="h-[92vh] overflow-y-auto bg-background">
        <SheetHeader className="text-left">
          <SheetTitle className="font-playfair text-2xl">
            {checkingOut ? "Complete your subscription" : "Become Vivid"}
          </SheetTitle>
          <SheetDescription>
            {checkingOut
              ? "You can cancel anytime from your profile."
              : "Keep the deeper prompts, AI follow-ups, and full archive export."}
          </SheetDescription>
        </SheetHeader>

        {!checkingOut ? (
          <div className="mt-6 space-y-4">
            {PLANS.map((p) => {
              const isSel = selected === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p.id)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    isSel ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30"
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-playfair text-lg">{p.name}</p>
                        {p.badge && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-medium text-[#F2EEE5]"
                            style={{ backgroundColor: "#B8860B" }}
                          >
                            {p.badge}
                          </span>
                        )}
                      </div>
                      {p.subtitle && (
                        <p className="text-xs text-muted-foreground mt-0.5">{p.subtitle}</p>
                      )}
                    </div>
                    <p className="font-playfair text-xl">
                      {p.price}
                      <span className="text-sm text-muted-foreground font-sans">{p.cadence}</span>
                    </p>
                  </div>
                </button>
              );
            })}

            <ul className="space-y-2 pt-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 mt-0.5 text-[#B8860B] shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Button className="w-full h-12 mt-4" onClick={() => setCheckingOut(true)}>
              Continue
            </Button>
          </div>
        ) : (
          <div className="mt-6">
            <StripeEmbeddedCheckoutForm
              priceId={selected}
              returnUrl={returnUrl || fallbackReturn}
            />
            <button
              type="button"
              onClick={() => setCheckingOut(false)}
              className="mt-4 text-sm text-muted-foreground underline underline-offset-4"
            >
              ← Choose a different plan
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
