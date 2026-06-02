import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, FilePen, Palette, Settings as SettingsIcon, type LucideIcon } from "lucide-react";

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
  {
    key: "settings",
    path: "/settings",
    icon: SettingsIcon,
    label: "Settings",
    activeColor: ACTIVE,
    activeLabelColor: ACTIVE,
  },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Reserve space at the bottom of the page so content never slides under the
  // floating tab bar. Nav height ≈ 70px + 12px bottom offset + safe area + breathing room.
  useEffect(() => {
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom =
      "calc(env(safe-area-inset-bottom, 0px) + 110px)";
    return () => {
      document.body.style.paddingBottom = prev;
    };
  }, []);

  return (
    <nav
      aria-label="Primary"
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
        background: "rgba(30, 46, 62, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: 40,
        padding: "10px 18px",
        display: "flex",
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
            style={{
              background: "transparent",
              border: "none",
              padding: "6px 12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              cursor: "pointer",
              minWidth: 56,
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
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
