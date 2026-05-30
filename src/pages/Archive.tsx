import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, Pencil, Search, Share } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import ProfileAvatarButton from "@/components/ProfileAvatarButton";
import MemoryCard from "@/components/MemoryCard";
import MemoryArtifact from "@/components/MemoryArtifact";
import ShareMemorySheet from "@/components/ShareMemorySheet";
import { PaywallSheet } from "@/components/PaywallSheet";
import TimelineView from "@/components/TimelineView";
import CategoryIcon, { CategoryIconCard, CATEGORY_BORDER_COLORS, type CategoryKey } from "@/components/CategoryIcon";
import QuickCaptureSheet from "@/components/QuickCaptureSheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const FILTER_CATEGORIES: CategoryKey[] = [
  "moment",
  "person",
  "object",
  "place",
  "food",
  "sound",
  "imprint",
  "digital_traces",
];

const PLURAL_LABELS: Record<CategoryKey, string> = {
  moment: "Moments",
  person: "People",
  object: "Objects",
  place: "Places",
  food: "Foods",
  sound: "Sounds",
  imprint: "Imprints",
  digital_traces: "Digital Traces",
};

const Archive = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [touchstones, setTouchstones] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | CategoryKey>("all");
  const [selected, setSelected] = useState<any>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [lastMemoryAt, setLastMemoryAt] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string>("");
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [view, setView] = useState<"grid" | "timeline">("grid");
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [storyTooltipOpen, setStoryTooltipOpen] = useState(false);
  const [storyPaywallOpen, setStoryPaywallOpen] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const [showTimelineTooltip, setShowTimelineTooltip] = useState(false);
  const [dotsVisible, setDotsVisible] = useState(false);
  const dotsTimer = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const pointerStartX = useRef<number | null>(null);
  const pointerStartY = useRef<number | null>(null);
  const pointerActive = useRef(false);
  const wheelLockRef = useRef(false);

  const TIMELINE_THRESHOLD = 20;
  const timelineUnlocked = totalCount >= TIMELINE_THRESHOLD;

  // Two-bounce hint animation on first unlock
  useEffect(() => {
    if (!user || !timelineUnlocked) return;
    const key = `touchstone:timeline-bounced:${user.id}`;
    if (!localStorage.getItem(key)) {
      setBouncing(true);
      localStorage.setItem(key, "1");
      const t = window.setTimeout(() => setBouncing(false), 1700);
      return () => window.clearTimeout(t);
    }
  }, [user, timelineUnlocked]);

  // Show the dot indicators briefly, then fade
  const flashDots = () => {
    setDotsVisible(true);
    if (dotsTimer.current) window.clearTimeout(dotsTimer.current);
    dotsTimer.current = window.setTimeout(() => setDotsVisible(false), 2000);
  };

  const switchView = (next: "grid" | "timeline") => {
    if (next === view) return;
    if (next === "timeline" && !timelineUnlocked) return;
    setView(next);
    flashDots();
    if (next === "timeline" && user) {
      const seenKey = `touchstone:timeline-tooltip-seen:${user.id}`;
      if (!localStorage.getItem(seenKey)) {
        setShowTimelineTooltip(true);
      }
    }
  };

  const dismissTimelineTooltip = () => {
    if (user) {
      localStorage.setItem(`touchstone:timeline-tooltip-seen:${user.id}`, "1");
    }
    setShowTimelineTooltip(false);
  };

  const tryHorizontalSwipe = (dx: number, dy: number) => {
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0 && view === "grid" && timelineUnlocked) switchView("timeline");
    else if (dx > 0 && view === "timeline") switchView("grid");
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    if (timelineUnlocked) flashDots();
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX.current;
    const dy = t.clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    tryHorizontalSwipe(dx, dy);
  };

  // Pointer (mouse / pen / trackpad press) drag — enables swipe on desktop
  const onPointerDown = (e: React.PointerEvent) => {
    // Only respond to primary button (mouse) or touch/pen
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointerStartX.current = e.clientX;
    pointerStartY.current = e.clientY;
    pointerActive.current = true;
    if (timelineUnlocked) flashDots();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!pointerActive.current || pointerStartX.current === null || pointerStartY.current === null) return;
    const dx = e.clientX - pointerStartX.current;
    const dy = e.clientY - pointerStartY.current;
    pointerActive.current = false;
    pointerStartX.current = null;
    pointerStartY.current = null;
    tryHorizontalSwipe(dx, dy);
  };

  const onPointerCancel = () => {
    pointerActive.current = false;
    pointerStartX.current = null;
    pointerStartY.current = null;
  };

  // Trackpad horizontal scroll → switch views
  const onWheel = (e: React.WheelEvent) => {
    if (wheelLockRef.current) return;
    const dx = e.deltaX;
    const dy = e.deltaY;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx > 0 && view === "grid" && timelineUnlocked) {
      wheelLockRef.current = true;
      switchView("timeline");
      window.setTimeout(() => { wheelLockRef.current = false; }, 600);
    } else if (dx < 0 && view === "timeline") {
      wheelLockRef.current = true;
      switchView("grid");
      window.setTimeout(() => { wheelLockRef.current = false; }, 600);
    }
  };

  // "/" keyboard shortcut to focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (t && t.isContentEditable)) return;
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  // Fetch profile name (first name only)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();
      const full = (data?.name as string | null) ?? "";
      setFirstName(full.trim().split(/\s+/)[0] ?? "");
    })();
  }, [user]);

  // Fetch total count + last memory date (independent of category filter)
  const fetchHeaderStats = async () => {
    if (!user) return;
    const { count } = await (supabase as any)
      .from("touchstones")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    setTotalCount(count ?? 0);

    const { data: latest } = await (supabase as any)
      .from("touchstones")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);
    setLastMemoryAt(latest?.[0]?.created_at ?? null);
  };

  const fetchTouchstones = async () => {
    if (!user) return;
    let query = (supabase as any)
      .from("touchstones")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("category", filter as any);
    }

    const { data } = await query;
    setTouchstones(data || []);
    setFetching(false);
    fetchHeaderStats();
  };

  useEffect(() => {
    fetchTouchstones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter]);

  // Fuzzy date helpers — match year, month name, formatted created_at
  const MONTHS = [
    "january","february","march","april","may","june",
    "july","august","september","october","november","december",
  ];
  const memoryMatchesSearch = (m: any, q: string) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    const parts: string[] = [];
    const push = (v: unknown) => { if (v) parts.push(String(v).toLowerCase()); };
    push(m.title);
    push(m.note);
    push(m.ai_answer);
    push(m.location_name);
    push(m.venue_name);
    push(m.people);
    if (m.created_at) {
      const d = new Date(m.created_at);
      if (!isNaN(d.getTime())) {
        push(d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }));
        push(d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }));
        push(String(d.getFullYear()));
        push(MONTHS[d.getMonth()]);
        push(MONTHS[d.getMonth()].slice(0, 3));
      }
    }
    if (m.memory_year) push(String(m.memory_year));
    if (m.memory_month) push(MONTHS[(m.memory_month - 1) % 12]);
    if (m.memory_season) push(m.memory_season);
    return parts.some((s) => s.includes(needle));
  };

  const visibleTouchstones = useMemo(
    () => touchstones.filter((m) => memoryMatchesSearch(m, search)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [touchstones, search],
  );

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-5 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelected(null)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back
            </button>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="More options"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--dark-card))] transition-colors"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => navigate(`/?edit=${selected.id}`)}
                    className="cursor-pointer"
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ProfileAvatarButton />
            </div>
          </div>
          <div className="flex justify-end -mt-2 mb-2">
            <button
              onClick={() => setShareOpen(true)}
              className="flex flex-col items-center gap-1"
              aria-label="Share"
            >
              <Share className="h-5 w-5" style={{ color: "#1E2E3E" }} />
              <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, color: "#1E2E3E" }}>
                Share
              </span>
            </button>
          </div>
          <div
            style={{
              borderRadius: 18,
              boxShadow:
                "0 0 32px rgba(184,134,11,0.35), 0 0 64px rgba(224,122,95,0.18)",
              transition: "box-shadow 0.6s ease",
            }}
          >
            <MemoryArtifact
              photoUrl={selected.photo_url}
              category={selected.category}
              title={selected.title}
              note={selected.note}
              createdAt={selected.created_at}
              memoryDate={{
                season: selected.memory_season ?? null,
                year: selected.memory_year ?? null,
                month: selected.memory_month ?? null,
                day: selected.memory_day ?? null,
              }}
            />
          </div>
          <div className="flex justify-center pt-4">
            <button
              onClick={() => navigate(`/?edit=${selected.id}`)}
              className="rounded-full bg-primary px-6 py-3 text-base text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Edit
            </button>
          </div>

          <ShareMemorySheet
            open={shareOpen}
            onOpenChange={setShareOpen}
            senderName={user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Someone"}
            memoryTitle={selected.title}
            memoryNote={selected.note}
          />
        </div>
      </div>
    );
  }

  // Deterministic, irregular star field — small gold dots with a few thin connecting lines.
  const stars = [
    { x: 8, y: 12, r: 1.2, o: 0.18 },
    { x: 22, y: 6, r: 0.9, o: 0.12 },
    { x: 35, y: 18, r: 1.4, o: 0.2 },
    { x: 48, y: 9, r: 0.8, o: 0.1 },
    { x: 61, y: 22, r: 1.1, o: 0.16 },
    { x: 74, y: 7, r: 1.3, o: 0.18 },
    { x: 88, y: 15, r: 0.9, o: 0.12 },
    { x: 14, y: 32, r: 1.0, o: 0.14 },
    { x: 29, y: 41, r: 1.3, o: 0.2 },
    { x: 44, y: 36, r: 0.8, o: 0.1 },
    { x: 57, y: 48, r: 1.2, o: 0.18 },
    { x: 70, y: 38, r: 0.9, o: 0.12 },
    { x: 83, y: 45, r: 1.1, o: 0.16 },
    { x: 6, y: 56, r: 1.0, o: 0.14 },
    { x: 19, y: 67, r: 1.3, o: 0.2 },
    { x: 38, y: 62, r: 0.9, o: 0.12 },
    { x: 52, y: 73, r: 1.2, o: 0.18 },
    { x: 66, y: 64, r: 0.8, o: 0.1 },
    { x: 80, y: 71, r: 1.1, o: 0.16 },
    { x: 92, y: 60, r: 1.0, o: 0.14 },
    { x: 11, y: 84, r: 1.2, o: 0.18 },
    { x: 27, y: 91, r: 0.9, o: 0.12 },
    { x: 43, y: 86, r: 1.1, o: 0.16 },
    { x: 59, y: 93, r: 1.3, o: 0.2 },
    { x: 76, y: 88, r: 0.9, o: 0.12 },
    { x: 90, y: 82, r: 1.0, o: 0.14 },
  ];
  const lines = [
    [0, 2],
    [4, 5],
    [8, 11],
    [14, 16],
    [18, 19],
    [21, 23],
  ];

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="mx-auto w-full max-w-lg px-5 pt-8 flex-1 flex flex-col min-h-0">
        {/* Fixed header zone */}
        <div className="shrink-0">
          {/* Header block: greeting + count (left) | avatar (right) */}
          {(() => {
            const hour = new Date().getHours();
            const greeting =
              hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
            const name = firstName || "there";

            return (
              <div className="flex items-start justify-between gap-3">
                <div>
                  {/* Greeting */}
                  <p
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "26px",
                      color: "#2C3E50",
                      fontWeight: 400,
                      fontStyle: "italic",
                      whiteSpace: "nowrap",
                      margin: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    {greeting}, {name}.
                  </p>

                  {/* Count row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "7px",
                      marginTop: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: "26px",
                        color: "#B8860B",
                        lineHeight: 1,
                      }}
                    >
                      {totalCount}
                    </span>
                    <span
                      style={{
                        fontFamily: "Jost, sans-serif",
                        fontSize: "10px",
                        color: "#9E9585",
                        letterSpacing: "0.12em",
                        textTransform: "lowercase",
                      }}
                    >
                      touchstones
                    </span>
                  </div>
                </div>
                <ProfileAvatarButton />
              </div>
            );
          })()}

          {/* Diamond divider */}
          <div
            className="flex items-center mt-4"
            aria-hidden="true"
            style={{ width: "100%" }}
          >
            <span
              style={{
                flex: 1,
                height: "0.5px",
                background: "rgba(184,134,11,0.4)",
              }}
            />
            <span
              style={{
                color: "#B8860B",
                fontSize: "10px",
                padding: "0 8px",
                lineHeight: 1,
              }}
            >
              ◇
            </span>
            <span
              style={{
                flex: 1,
                height: "0.5px",
                background: "rgba(184,134,11,0.4)",
              }}
            />
          </div>

          {/* Search bar */}
          <div
            style={{
              marginTop: "14px",
              marginBottom: "10px",
              backgroundColor: "#E8E4D8",
              borderRadius: "10px",
              padding: "9px 12px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Search size={16} strokeWidth={1.75} color="#B8860B" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search memories, dates, places…"
              aria-label="Search memories"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontFamily: "'Source Sans 3', sans-serif",
                fontSize: "14px",
                color: "#2C3E50",
              }}
              className="placeholder:text-[#5B4A3F]/60"
            />
            <span
              aria-hidden="true"
              style={{
                backgroundColor: "#F2EEE5",
                color: "#B8860B",
                borderRadius: "3px",
                fontFamily: "'Source Sans 3', sans-serif",
                fontSize: "11px",
                lineHeight: 1,
                padding: "3px 6px",
              }}
            >
              /
            </span>
          </div>

          {/* Zone 1 — filter grid: 4x2 categories + ALL bar */}
          <div className="mt-4 mb-4">
            <div
              className="grid"
              style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}
            >
              {FILTER_CATEGORIES.map((c) => {
                const active = filter === c;
                return (
                  <button
                    key={c}
                    onClick={() => setFilter(c)}
                    aria-pressed={active}
                    style={{
                      background: "#1E2E3E",
                      borderRadius: 12,
                      border: active ? `4px solid ${CATEGORY_BORDER_COLORS[c]}` : "2px solid transparent",
                      padding: "10px 6px 8px",
                      height: 78,
                    }}
                    className="flex flex-col items-center justify-center"
                  >
                    <span style={{ marginBottom: 6 }} className="flex items-center justify-center">
                      <CategoryIcon
                        category={c}
                        size={c === "imprint" ? 18 : 22}
                        color="#B8860B"
                      />
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.12em",
                        color: "#E8E4D8",
                        textTransform: "uppercase",
                        fontWeight: 500,
                        fontFamily: "Jost, sans-serif",
                      }}
                    >
                      {PLURAL_LABELS[c]}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setFilter("all")}
              aria-pressed={filter === "all"}
              style={{
                marginTop: 10,
                width: "100%",
                height: 44,
                borderRadius: 12,
                background: "#1E2E3E",
                border: `2px solid ${filter === "all" ? "#B8860B" : "transparent"}`,
              }}
              className="flex items-center justify-center"
            >
              <span className="flex items-center" style={{ gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <polygon
                    points="7.5,1 14,7.5 7.5,14 1,7.5"
                    stroke="#B8860B"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinejoin="round"
                  />
                </svg>
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    color: "#E8E4D8",
                    textTransform: "uppercase",
                    fontWeight: 500,
                    fontFamily: "Jost, sans-serif",
                  }}
                >
                  ALL
                </span>
              </span>
            </button>
          </div>
        </div>

        {/* Scrollable grid / timeline / empty-state zone (swipe-aware) */}
        <div
          className={cn(
            "flex-1 min-h-0 overflow-y-auto select-none",
            bouncing && "animate-timeline-bounce"
          )}
          style={{ touchAction: "pan-y" }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onWheel={onWheel}
        >
          {fetching ? (
            <p className="text-center text-muted-foreground py-12">Loading…</p>
          ) : touchstones.length === 0 ? (
            <div className="h-full flex flex-col">
              {/* Zone 2 — divider with center diamond */}
              <div className="flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-[hsl(var(--gold)/0.5)]" />
                <span
                  className="block h-2 w-2 rotate-45 border border-[hsl(var(--gold)/0.5)]"
                />
                <span className="h-px flex-1 bg-[hsl(var(--gold)/0.5)]" />
              </div>

              {/* Zone 3 — empty state with star field */}
              <div className="relative flex-1 flex items-center justify-center overflow-hidden">
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {lines.map(([a, b], i) => (
                    <line
                      key={`l-${i}`}
                      x1={stars[a].x}
                      y1={stars[a].y}
                      x2={stars[b].x}
                      y2={stars[b].y}
                      stroke="hsl(var(--gold))"
                      strokeOpacity={0.07}
                      strokeWidth={0.15}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  {stars.map((s, i) => (
                    <circle
                      key={`s-${i}`}
                      cx={s.x}
                      cy={s.y}
                      r={s.r * 0.35}
                      fill="hsl(var(--gold))"
                      fillOpacity={s.o}
                    />
                  ))}
                </svg>
                <div className="relative z-10 text-center space-y-3 px-4">
                  <p className="font-playfair italic text-2xl text-foreground">
                    Your constellation awaits…
                  </p>
                  <p className="font-sans text-muted-foreground">
                    Every Touchstone you add becomes a star in your personal archive.
                  </p>
                </div>
              </div>
            </div>
          ) : visibleTouchstones.length === 0 && search.trim() ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-12">
              <p
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: "#5B4A3F",
                  fontSize: "20px",
                  fontStyle: "italic",
                  margin: 0,
                }}
              >
                Nothing found yet.
              </p>
              <span
                aria-hidden="true"
                className="block h-2 w-2 rotate-45"
                style={{ backgroundColor: "#B8860B" }}
              />
            </div>
          ) : view === "timeline" ? (
            <div className="mt-2">
              <h1
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 26,
                  color: "#2C3E50",
                  fontWeight: 400,
                  margin: "0 0 4px 0",
                  lineHeight: 1.2,
                }}
              >
                Your timeline.
              </h1>
              <TimelineView
                memories={visibleTouchstones}
                onSelect={(m) => setSelected(m)}
                onChanged={fetchTouchstones}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 mt-2 pb-4">
              {visibleTouchstones.map((m) => (
                <MemoryCard
                  key={m.id}
                  memory={m}
                  onClick={() => setSelected(m)}
                  onChanged={fetchTouchstones}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pinned action button + view-indicator dots */}
        <div className="shrink-0 bg-background pt-4 pb-8">
          {timelineUnlocked && (
            <div
              className="flex items-center justify-center gap-2 mb-2"
              style={{
                height: 8,
                opacity: dotsVisible ? 1 : 0,
                transition: "opacity 0.3s ease",
              }}
              aria-hidden={!dotsVisible}
            >
              {(["grid", "timeline"] as const).map((v) => {
                const active = view === v;
                return (
                  <span
                    key={v}
                    style={{
                      display: "inline-block",
                      width: active ? 18 : 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: active ? "#2C3E50" : "#C8C2B4",
                      transition: "all 0.25s ease",
                    }}
                  />
                );
              })}
            </div>
          )}
          <button
            onClick={() => setQuickCaptureOpen(true)}
            className="w-full h-14 text-lg rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            + Add a Touchstone
          </button>

          <button
            onClick={() => {
              const seenKey = user ? `touchstone:story-tooltip-seen:${user.id}` : null;
              if (seenKey && !localStorage.getItem(seenKey)) {
                setStoryTooltipOpen(true);
              } else {
                // TODO: open Tell Me A Story flow (premium gated downstream)
                setStoryTooltipOpen(true);
              }
            }}
            className="w-full h-14 mt-3 rounded-full transition-colors flex items-center justify-center gap-2"
            style={{
              backgroundColor: "#0E7C86",
              color: "#FFFFFF",
              fontFamily: "'Playfair Display', serif",
              fontStyle: "italic",
              fontSize: 18,
            }}
          >
            <span aria-hidden="true" style={{ color: "#F5D67A", fontSize: 12, letterSpacing: 1 }}>
              ★★★
            </span>
            <span>Tell Me A Story</span>
          </button>

          <QuickCaptureSheet
            open={quickCaptureOpen}
            onClose={() => setQuickCaptureOpen(false)}
            onSaved={() => {
              fetchTouchstones();
              fetchHeaderStats();
            }}
          />
        </div>
      </div>

      {storyTooltipOpen && (
        <button
          type="button"
          onClick={() => {
            if (user) localStorage.setItem(`touchstone:story-tooltip-seen:${user.id}`, "1");
            setStoryTooltipOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center px-8"
          style={{ backgroundColor: "rgba(44,62,80,0.55)" }}
          aria-label="Dismiss"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl px-7 py-7 max-w-sm w-full text-left"
            style={{ backgroundColor: "#F2EEE5", boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span aria-hidden="true" style={{ color: "#B8860B", fontSize: 12, letterSpacing: 1 }}>
                ★★★
              </span>
              <span
                style={{
                  fontFamily: "Jost, sans-serif",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#0E7C86",
                }}
              >
                Vivid feature
              </span>
            </div>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: "italic",
                fontSize: 24,
                color: "#2C3E50",
                margin: 0,
                lineHeight: 1.25,
              }}
            >
              Tell Me A Story
            </h2>
            <p
              style={{
                fontFamily: "'Source Sans 3', sans-serif",
                fontSize: 15,
                color: "#5B4A3F",
                lineHeight: 1.55,
                marginTop: 10,
              }}
            >
              Tell Touchstone a memory in your own words. We'll find everything worth keeping inside it.
            </p>
            <button
              type="button"
              onClick={() => {
                if (user) localStorage.setItem(`touchstone:story-tooltip-seen:${user.id}`, "1");
                setStoryTooltipOpen(false);
              }}
              className="w-full h-12 mt-5 rounded-full transition-colors"
              style={{
                backgroundColor: "#0E7C86",
                color: "#FFFFFF",
                fontFamily: "'Jost', sans-serif",
                fontSize: 15,
                letterSpacing: "0.04em",
              }}
            >
              Continue
            </button>
            <button
              type="button"
              onClick={() => {
                if (user) localStorage.setItem(`touchstone:story-tooltip-seen:${user.id}`, "1");
                setStoryTooltipOpen(false);
                setStoryPaywallOpen(true);
              }}
              className="w-full mt-3 text-center"
              style={{
                fontFamily: "'Source Sans 3', sans-serif",
                fontSize: 13,
                color: "#5B4A3F",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              Become Vivid to unlock
            </button>
          </div>
        </button>
      )}

      <PaywallSheet
        open={storyPaywallOpen}
        onOpenChange={setStoryPaywallOpen}
        feature="premium_prompt"
      />


      {showTimelineTooltip && (
        <button
          type="button"
          onClick={dismissTimelineTooltip}
          className="fixed inset-0 z-50 flex items-center justify-center px-8"
          style={{ backgroundColor: "rgba(44,62,80,0.55)" }}
          aria-label="Dismiss timeline tooltip"
        >
          <div
            className="text-center max-w-md"
            style={{
              backgroundColor: "#2C3E50",
              padding: "32px 28px",
              borderRadius: 14,
              boxShadow: "0 18px 48px rgba(0,0,0,0.32)",
              border: "1px solid rgba(184,134,11,0.4)",
            }}
          >
            <span
              aria-hidden
              className="inline-block h-3 w-3 rotate-45 mb-5"
              style={{ backgroundColor: "#B8860B" }}
            />
            <p
              style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: "italic",
                fontSize: 22,
                lineHeight: 1.4,
                color: "#B8860B",
                margin: 0,
              }}
            >
              Your archive has grown deep enough to see the shape of your life.
              Swipe to explore your Timeline.
            </p>
            <p
              style={{
                marginTop: 20,
                fontFamily: "Jost, sans-serif",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(184,134,11,0.7)",
              }}
            >
              Tap to continue
            </p>
          </div>
        </button>
      )}
    </div>
  );
};

export default Archive;
