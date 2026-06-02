import { useNavigate } from "react-router-dom";

export type VividTrigger =
  | "tell_me_a_story"
  | "audio_length"
  | "export_archive"
  | "constellation_art"
  | "heirloom_book";

interface Props {
  open: boolean;
  triggeredBy: VividTrigger;
  onDismiss: () => void;
}

const NAVY = "#1E2E3E";
const IVORY = "#F2EEE5";
const GOLD = "#B8860B";
const AEGEAN = "#0E7C86";

const FEATURES: Array<{ id: VividTrigger; label: string }> = [
  { id: "tell_me_a_story", label: "Tell Me A Story — turns your story into the Touchstone pieces that made it matter" },
  { id: "audio_length", label: "Log audio clips up to 60 seconds" },
  { id: "constellation_art", label: "Constellation Art — video reveal export + high-resolution download" },
  { id: "export_archive", label: "Export my archive — we'll email you a link to download your entire archive" },
  { id: "heirloom_book", label: "Heirloom Book — a special offer for Vivid members, coming soon" },
];

const SUPPRESS_MS = 24 * 60 * 60 * 1000;

function storageKey(trigger: VividTrigger) {
  return `touchstone:vivid-card:last-shown:${trigger}`;
}

export function shouldShowVividCard(trigger: VividTrigger): boolean {
  try {
    const raw = localStorage.getItem(storageKey(trigger));
    if (!raw) return true;
    const ts = parseInt(raw, 10);
    if (!Number.isFinite(ts)) return true;
    return Date.now() - ts > SUPPRESS_MS;
  } catch {
    return true;
  }
}

export function markVividCardShown(trigger: VividTrigger) {
  try {
    localStorage.setItem(storageKey(trigger), String(Date.now()));
  } catch {
    /* noop */
  }
}

function FourPointStar({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill={color} />
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

export function VividUpgradeCard({ open, triggeredBy, onDismiss }: Props) {
  const navigate = useNavigate();

  if (!open) return null;

  const handleMaybeLater = () => {
    markVividCardShown(triggeredBy);
    onDismiss();
  };

  const handleUnlock = () => {
    markVividCardShown(triggeredBy);
    onDismiss();
    navigate("/vivid");
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full"
        style={{
          backgroundColor: NAVY,
          borderRadius: 16,
          padding: 32,
          maxWidth: 480,
        }}
      >
        <StarCluster />

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
          Everything that made you.
        </h2>
        <p
          className="text-center"
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 14,
            color: IVORY,
            opacity: 0.7,
            marginTop: 8,
          }}
        >
          Vivid gives you more of it.
        </p>

        <ul className="mt-6 space-y-3">
          {FEATURES.map((f) => {
            const active = f.id === triggeredBy;
            return (
              <li
                key={f.id}
                className="flex items-start gap-3"
                style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 14,
                  color: IVORY,
                  opacity: active ? 1 : 0.6,
                  lineHeight: 1.5,
                }}
              >
                <span style={{ marginTop: 5 }}>
                  {active ? (
                    <span
                      aria-hidden="true"
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: AEGEAN,
                      }}
                    />
                  ) : (
                    <FourPointStar color={GOLD} size={10} />
                  )}
                </span>
                <span>{f.label}</span>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={handleUnlock}
          className="w-full transition-opacity hover:opacity-90"
          style={{
            marginTop: 28,
            height: 48,
            borderRadius: 8,
            backgroundColor: AEGEAN,
            color: "#FFFFFF",
            fontFamily: "'Jost', sans-serif",
            fontSize: 15,
            letterSpacing: "0.02em",
            border: "none",
          }}
        >
          Unlock Vivid
        </button>

        <button
          type="button"
          onClick={handleMaybeLater}
          className="w-full text-center"
          style={{
            marginTop: 8,
            height: 44,
            background: "transparent",
            border: "none",
            color: IVORY,
            opacity: 0.6,
            fontFamily: "'Jost', sans-serif",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

export default VividUpgradeCard;
