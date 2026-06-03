/**
 * OnboardingDotIndicator
 * Persistent 6-dot progress indicator shown across the first-time onboarding flow.
 *
 * Spec:
 *  - 6 dots, centered horizontally, 24px from top of screen
 *  - Dot size 8px, 10px gap
 *  - Completed dots: solid #B8860B
 *  - Current dot:    outlined #B8860B, transparent fill
 *  - Upcoming dots:  outlined #C8C2B4, transparent fill
 *
 * Hidden on the Splash screen and on the final "Your story is ready to keep." screen.
 * Hidden entirely once localStorage.getItem('ts_onboarding_complete') === '1'.
 */
import { useEffect, useState } from "react";

const GOLD = "#B8860B";
const UPCOMING = "#C8C2B4";

type Props = {
  /** 1-indexed: the dot currently in progress (1..6). */
  current: 1 | 2 | 3 | 4 | 5 | 6;
};

const ONBOARDING_COMPLETE_KEY = "ts_onboarding_complete";

const isOnboardingComplete = () =>
  typeof window !== "undefined" &&
  localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "1";

const OnboardingDotIndicator = ({ current }: Props) => {
  const [hidden, setHidden] = useState<boolean>(() => isOnboardingComplete());

  useEffect(() => {
    setHidden(isOnboardingComplete());
  }, [current]);

  if (hidden) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 24,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        gap: 10,
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      {[1, 2, 3, 4, 5, 6].map((n) => {
        const completed = n < current;
        const isCurrent = n === current;
        const borderColor = completed || isCurrent ? GOLD : UPCOMING;
        return (
          <div
            key={n}
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              backgroundColor: completed ? GOLD : "transparent",
              border: `1px solid ${borderColor}`,
              boxSizing: "border-box",
              transition: "background-color 200ms ease, border-color 200ms ease",
            }}
          />
        );
      })}
    </div>
  );
};

export default OnboardingDotIndicator;

export const markOnboardingComplete = () => {
  try {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, "1");
  } catch {
    /* ignore */
  }
};

export const hasCompletedOnboarding = (): boolean => isOnboardingComplete();
