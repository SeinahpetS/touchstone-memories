import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PricingSheet } from "@/components/PricingSheet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What was blocked — drives the headline. */
  feature: "ai_prompt" | "export" | "premium_prompt";
}

const COPY: Record<Props["feature"], { title: string; body: string }> = {
  ai_prompt: {
    title: "AI follow-ups are part of Vivid",
    body: "Your trial has ended. Become Vivid to keep the gentle, contextual question that comes after each memory.",
  },
  premium_prompt: {
    title: "This is a premium prompt",
    body: "Deeper reflective prompts are part of Vivid. Your captures and existing archive remain free, always.",
  },
  export: {
    title: "Exporting is a Vivid feature",
    body: "Your memories are always yours — Vivid unlocks the full archive download by email.",
  },
};

export function PaywallSheet({ open, onOpenChange, feature }: Props) {
  const [showPricing, setShowPricing] = useState(false);
  const { title, body } = COPY[feature];

  return (
    <>
      <Sheet open={open && !showPricing} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="bg-background">
          <SheetHeader className="text-left">
            <SheetTitle className="font-playfair text-2xl">{title}</SheetTitle>
            <SheetDescription className="text-base leading-relaxed pt-2">
              {body}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-3">
            <Button
              className="w-full h-12"
              onClick={() => {
                setShowPricing(true);
              }}
            >
              See plans
            </Button>
            <button
              onClick={() => onOpenChange(false)}
              className="w-full text-sm text-muted-foreground py-2"
            >
              Not now
            </button>
          </div>
        </SheetContent>
      </Sheet>
      <PricingSheet
        open={showPricing}
        onOpenChange={(o) => {
          setShowPricing(o);
          if (!o) onOpenChange(false);
        }}
      />
    </>
  );
}
