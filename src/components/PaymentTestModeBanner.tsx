import { useEffect, useRef } from "react";
import { isTestMode } from "@/lib/stripe";

export function PaymentTestModeBanner() {
  const ref = useRef<HTMLDivElement | null>(null);
  const test = isTestMode();

  // Publish the bar's height so full-screen screens (the archive) can fit the
  // space left below it instead of pushing the page past the viewport.
  useEffect(() => {
    const el = ref.current;
    if (!test || !el) return;
    const publish = () =>
      document.documentElement.style.setProperty("--ts-top-bar", `${el.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--ts-top-bar");
    };
  }, [test]);

  if (!test) return null;
  return (
    <div
      ref={ref}
      className="w-full bg-orange-100 border-b border-orange-300 px-4 py-2 text-center text-xs text-orange-800"
    >
      Test mode — payments use Stripe sandbox. Use card 4242 4242 4242 4242 with any future expiry and any CVC.
    </div>
  );
}
