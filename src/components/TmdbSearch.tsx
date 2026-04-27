import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { Loader2, Film, Tv } from "lucide-react";

export type TmdbKind = "movie" | "tv";

export interface TmdbPick {
  id: string;
  type: TmdbKind;
  title: string;
  subtitle: string;
  image: string | null;
  year: number | null;
}

interface Props {
  kind: TmdbKind;
  value: TmdbPick | null;
  onChange: (pick: TmdbPick | null) => void;
}

const inputClass = "h-11 text-base bg-card border-0 placeholder:italic";

const TmdbSearch = ({ kind, value, onChange }: Props) => {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<TmdbPick[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  const Placeholder = kind === "movie" ? Film : Tv;
  const placeholderText =
    kind === "movie" ? "Search films" : "Search TV shows";

  useEffect(() => {
    if (!debounced || debounced.length < 2 || value) {
      setItems([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const session = (await supabase.auth.getSession()).data.session;
        if (!session) return;
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tmdb-search?q=${encodeURIComponent(debounced)}&type=${kind}`;
        const r = await fetch(url, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const d = await r.json();
        if (!cancelled) {
          setItems(d.items ?? []);
          setOpen(true);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, value, kind]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-md bg-card p-3">
        {value.image ? (
          <img
            src={value.image}
            alt={value.title}
            className="size-14 rounded object-cover"
          />
        ) : (
          <div className="grid size-14 place-items-center rounded bg-muted">
            <Placeholder className="size-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-foreground">{value.title}</div>
          <div className="truncate text-sm text-muted-foreground">
            {value.subtitle}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setQuery("");
          }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <div className="relative">
        <Input
          type="text"
          value={query}
          placeholder={placeholderText}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => items.length > 0 && setOpen(true)}
          className={inputClass}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
        )}
        {open && items.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-md border border-border bg-popover shadow-lg">
            {items.map((it) => (
              <button
                key={`${it.type}-${it.id}`}
                type="button"
                onClick={() => {
                  onChange(it);
                  setOpen(false);
                  setQuery(it.title);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted"
              >
                {it.image ? (
                  <img
                    src={it.image}
                    alt=""
                    className="size-10 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="grid size-10 shrink-0 place-items-center rounded bg-muted">
                    <Placeholder className="size-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">
                    {it.title}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {it.subtitle}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TmdbSearch;
