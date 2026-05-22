import { isTestMode } from "@/lib/stripe";

export function PaymentTestModeBanner() {
  if (!isTestMode()) return null;
  return (
    <div className="w-full bg-orange-100 border-b border-orange-300 px-4 py-2 text-center text-xs text-orange-800">
      Test mode — payments use Stripe sandbox. Use card 4242 4242 4242 4242 with any future expiry and any CVC.
    </div>
  );
}
