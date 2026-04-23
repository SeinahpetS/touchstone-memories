import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Wordmark from "@/components/Wordmark";
import MemoryCard from "@/components/MemoryCard";
import MemoryArtifact from "@/components/MemoryArtifact";
import { CategoryIconCard, type CategoryKey } from "@/components/CategoryIcon";
import { cn } from "@/lib/utils";

const FILTER_CATEGORIES: CategoryKey[] = ["moment", "object", "person"];

const Archive = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [memories, setMemories] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | CategoryKey>("all");
  const [selected, setSelected] = useState<any>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchMemories = async () => {
      let query = supabase
        .from("memories")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("category", filter as any);
      }

      const { data } = await query;
      setMemories(data || []);
      setFetching(false);
    };
    fetchMemories();
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
          <button
            onClick={() => setSelected(null)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back
          </button>
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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-5 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Wordmark />
          <button
            onClick={() => navigate("/")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            + Capture
          </button>
        </div>

        {/* Filters: All pill + category icon cards */}
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "shrink-0 flex flex-col items-center justify-center gap-2 rounded-[10px] bg-[hsl(var(--dark-card))] px-2 pt-4 pb-3 min-w-[84px] transition-colors",
              filter === "all"
                ? "border border-[hsl(var(--gold)/0.5)]"
                : "border border-[hsl(var(--gold)/0.18)] hover:border-[hsl(var(--gold)/0.35)]"
            )}
          >
            <span
              className="inline-block h-9 w-9 rounded-full border-[1.5px]"
              style={{ borderColor: "hsl(var(--gold))" }}
            />
            <span className="font-sans text-[10px] uppercase tracking-[0.06em] text-[hsl(var(--label-color))]">
              All
            </span>
          </button>

          {FILTER_CATEGORIES.map((c) => (
            <div key={c} className="shrink-0">
              <CategoryIconCard
                category={c}
                active={filter === c}
                onClick={() => setFilter(c)}
              />
            </div>
          ))}
        </div>

        {fetching ? (
          <p className="text-center text-muted-foreground py-12">Loading…</p>
        ) : memories.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="font-playfair text-lg text-foreground">No memories yet</p>
            <p className="text-muted-foreground">
              Your archive begins with one moment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {memories.map((m) => (
              <MemoryCard key={m.id} memory={m} onClick={() => setSelected(m)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Archive;
