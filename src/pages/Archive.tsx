import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, Pencil, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import ProfileAvatarButton from "@/components/ProfileAvatarButton";
import MemoryCard from "@/components/MemoryCard";
import MemoryArtifact from "@/components/MemoryArtifact";
import { CategoryIconCard, type CategoryKey } from "@/components/CategoryIcon";
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
];

const PLURAL_LABELS: Record<CategoryKey, string> = {
  moment: "Moments",
  person: "People",
  object: "Objects",
  place: "Places",
  food: "Foods",
  sound: "Sounds",
  imprint: "Imprints",
};

const Archive = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [touchstones, setTouchstones] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | CategoryKey>("all");
  const [selected, setSelected] = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [lastMemoryAt, setLastMemoryAt] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string>("");
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

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
          </div>
          <MemoryArtifact
            photoUrl={selected.photo_url}
            category={selected.category}
            title={selected.title}
            note={selected.note}
            createdAt={selected.created_at}
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
          {/* Top bar: MY CONSTELLATION title (left) + avatar (right) */}
          <div className="flex items-center justify-between gap-3">
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "14px",
                color: "#2C3E50",
                letterSpacing: "0.25em",
                fontWeight: 400,
              }}
            >
              MY CONSTELLATION
            </span>
            <ProfileAvatarButton />
          </div>

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

          {/* Header block */}
          {(() => {
            const hour = new Date().getHours();
            const greeting =
              hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
            const name = firstName || "there";

            let reflective = "Something worth keeping happened today.";
            if (lastMemoryAt) {
              const diffMs = Date.now() - new Date(lastMemoryAt).getTime();
              const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
              if (days >= 7) {
                reflective = "It's been a while. What don't you want to forget?";
              } else if (days >= 2) {
                reflective = `It's been ${days} days. What's worth keeping from this week?`;
              } else {
                reflective = "Something worth keeping happened today.";
              }
            }

            return (
              <section style={{ paddingTop: "1rem", paddingBottom: "1rem" }}>
                {/* Line 1 — Greeting */}
                <p
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "22px",
                    color: "#2C3E50",
                    fontWeight: 400,
                    whiteSpace: "nowrap",
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {greeting}, {name}.
                </p>

                {/* Line 2 — Count row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    marginTop: "7px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "31px",
                      color: "#B8860B",
                      lineHeight: 1,
                    }}
                  >
                    {totalCount}
                  </span>
                  <span
                    style={{
                      fontFamily: "Jost, sans-serif",
                      fontSize: "11px",
                      color: "#8A8070",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      alignSelf: "flex-end",
                      paddingBottom: "1px",
                    }}
                  >
                    TOUCHSTONES
                  </span>
                </div>

                {/* Line 3 — Hairline divider */}
                <div
                  aria-hidden="true"
                  style={{
                    height: "0.5px",
                    background: "rgba(184,134,11,0.2)",
                    width: "100%",
                    marginTop: "12px",
                  }}
                />

                {/* Line 4 — Reflective line */}
                <p
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "13px",
                    fontStyle: "italic",
                    fontWeight: 300,
                    color: "#8A8070",
                    lineHeight: 1.6,
                    marginTop: "10px",
                  }}
                >
                  {reflective}
                </p>
              </section>
            );
          })()}

          {/* Search bar */}
          <div
            style={{
              marginTop: "10px",
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

          {/* Zone 1 — filter grid: 4 tiles per row, 2 rows */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 mt-6 mb-6">
            <button
              onClick={() => setFilter("all")}
              aria-pressed={filter === "all"}
              style={{
                borderColor: filter === "all" ? "#B8860B" : "#E8E4D8",
                borderWidth: filter === "all" ? "3.5px" : "1.5px",
                borderStyle: "solid",
                backgroundColor: filter === "all" ? "#F2EEE5" : undefined,
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-[10px] px-2 pt-4 pb-3 transition-colors aspect-[3/2] w-full",
                filter !== "all" && "bg-[hsl(var(--dark-card))]"
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center">
                <span
                  className="inline-block h-[21px] w-[21px] rotate-45 border-[1.5px]"
                  style={{ borderColor: "#B8860B" }}
                />
              </span>
              <span
                className="font-sans text-[10px] uppercase tracking-[0.06em]"
                style={{
                  color: filter === "all" ? "#2C3E50" : undefined,
                }}
              >
                <span className={cn(filter !== "all" && "text-[hsl(var(--label-color))]")}>
                  All
                </span>
              </span>
            </button>

            {FILTER_CATEGORIES.map((c) => (
              <CategoryIconCard
                key={c}
                category={c}
                label={PLURAL_LABELS[c]}
                className="aspect-[3/2] w-full !min-w-0"
                active={filter === c}
                onClick={() => setFilter(c)}
              />
            ))}
          </div>
        </div>

        {/* Scrollable grid / empty-state zone */}
        <div className="flex-1 min-h-0 overflow-y-auto">
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

        {/* Pinned action button */}
        <div className="shrink-0 bg-background pt-4 pb-8">
          <button
            onClick={() => navigate("/")}
            className="w-full h-14 text-lg rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            + Add a Touchstone
          </button>
        </div>
      </div>
    </div>
  );
};

export default Archive;
