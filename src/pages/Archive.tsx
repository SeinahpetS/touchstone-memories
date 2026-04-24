import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Wordmark from "@/components/Wordmark";
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

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchTouchstones = async () => {
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
    };
    fetchTouchstones();
  }, [user, filter]);

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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="mx-auto w-full max-w-lg px-5 pt-8 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <Wordmark />
        </div>

        {/* Divider between wordmark and filter grid */}
        <div className="flex items-center gap-3 mt-6" aria-hidden="true">
          <span className="h-px flex-1 bg-[hsl(var(--gold)/0.5)]" />
          <span className="block h-2 w-2 rotate-45 border border-[hsl(var(--gold)/0.5)]" />
          <span className="h-px flex-1 bg-[hsl(var(--gold)/0.5)]" />
        </div>

        {/* Zone 1 — filter grid */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 mt-6 mb-6">
          <button
            onClick={() => setFilter("all")}
            aria-pressed={filter === "all"}
            style={{
              borderColor: "#B8860B",
              borderWidth: filter === "all" ? "3.5px" : "2.5px",
              borderStyle: "solid",
              backgroundColor: filter === "all" ? "#F2EEE5" : undefined,
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-[10px] px-2 pt-4 pb-3 transition-colors",
              filter !== "all" && "bg-[hsl(var(--dark-card))]"
            )}
          >
            <span
              className="inline-block h-7 w-7 rotate-45 border-[1.5px]"
              style={{
                borderColor: filter === "all" ? "#2C3E50" : "hsl(var(--gold))",
              }}
            />
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
              active={filter === c}
              onClick={() => setFilter(c)}
            />
          ))}
        </div>

        {fetching ? (
          <p className="text-center text-muted-foreground py-12">Loading…</p>
        ) : touchstones.length === 0 ? (
          <>
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
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-2">
            {touchstones.map((m) => (
              <MemoryCard key={m.id} memory={m} onClick={() => setSelected(m)} />
            ))}
          </div>
        )}

        <button
          onClick={() => navigate("/")}
          className="w-full h-14 text-lg rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mt-6 mb-8"
        >
          + Add a Touchstone
        </button>
      </div>
    </div>
  );
};

export default Archive;
