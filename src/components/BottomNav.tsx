import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, FilePen, Palette, type LucideIcon } from "lucide-react";

type Tab = {
  key: string;
  path: string;
  icon: LucideIcon;
  label: React.ReactNode;
  activeColor: string;
  activeLabelColor: string;
};

const ACTIVE = "#F2EEE5";
const INACTIVE = "#8C8880";
const OLD_GOLD = "#B8860B";
// Soft ivory wash over the navy bar — reads as the lighter "highlighted" capsule
// behind the active tab, like the reference nav.
const HIGHLIGHT = "rgba(242, 238, 229, 0.16)";

const TABS: Tab[] = [
  {
    key: "archive",
    path: "/archive",
    icon: BookOpen,
    label: "Archive",
    activeColor: ACTIVE,
    activeLabelColor: ACTIVE,
  },
  {
    key: "story",
    path: "/story-unfold",
    icon: FilePen,
    label: (
      <>
        Story
        <br />
        Unfold
      </>
    ),
    activeColor: OLD_GOLD,
    activeLabelColor: ACTIVE,
  },
  {
    key: "canvas",
    path: "/vivid",
    icon: Palette,
    label: (
      <>
        Life
        <br />
        Canvas
      </>
    ),
    activeColor: ACTIVE,
    activeLabelColor: ACTIVE,
  },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Reserve space at the bottom of the page so content never slides under the
  // floating tab bar. Nav height ≈ 60px + 4px bottom offset + safe area + a little clearance.
  useEffect(() => {
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom =
      "calc(env(safe-area-inset-bottom, 0px) + 70px)";
    return () => {
      document.body.style.paddingBottom = prev;
    };
  }, []);

  return (
    <nav
      aria-label="Primary"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        margin: "0 auto",
        width: "calc(100% - 40px)",
        maxWidth: 512,
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 4px)",
        background: "rgba(30, 46, 62, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: 40,
        padding: "6px 14px",
        display: "flex",
        justifyContent: "space-between",
        gap: 4,
        zIndex: 50,
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
      }}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.path || pathname.startsWith(tab.path + "/");
        const iconColor = isActive ? tab.activeColor : INACTIVE;
        const labelColor = isActive ? tab.activeLabelColor : INACTIVE;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => navigate(tab.path)}
            aria-current={isActive ? "page" : undefined}
            style={{
              background: "transparent",
              border: "none",
              padding: "2px 4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flex: 1,
              minWidth: 0,
            }}
          >
            <span
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                minHeight: 57,
                padding: "5px 12px",
                borderRadius: 999,
                background: isActive ? HIGHLIGHT : "transparent",
                transition: "background-color 220ms ease",
              }}
            >
              <Icon size={22} color={iconColor} strokeWidth={1.75} style={{ opacity: 1 }} />
              <span
                style={{
                  fontFamily: '"Jost", system-ui, sans-serif',
                  fontSize: 10,
                  lineHeight: 1.15,
                  color: labelColor,
                  textAlign: "center",
                  opacity: 1,
                }}
              >
                {tab.label}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
