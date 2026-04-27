import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { Loader2, BookOpen } from "lucide-react";

export interface BookPick {
  id: string; // Open Library work key, e.g. "/works/OL12345W"
  title: string;
  author: string;
  coverUrl: string | null;
}

interface Props {
  value: BookPick | null;
  onChange: (pick: BookPick | null) => void;
}

const inputClass = "h-11 text-base bg-card border-0 placeholder:italic";

/**
 * Open Library book search. No API key required, called directly from the browser.
 */
const BookSearch = ({ value, onChange }: Props) => {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<BookPick[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!debounced || debounced.length < 2 || value) {
      setItems([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(debounced)}&limit=8`;
        const r = await fetch(url);
        const d = await r.json();
        if (cancelled) return;
        const docs = d.docs ?? [];
        const picks: BookPick[] = docs.map((doc: any) => ({
          id: doc.key,
          title: doc.title,
          author: (doc.author_name ?? []).join(", "),
          coverUrl: doc.cover_i
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
            : null,
        }));
        setItems(picks);
        setOpen(true);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, value]);

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
        {value.coverUrl ? (
          <img
            src={value.coverUrl}
            alt={value.title}
            className="h-20 w-14 rounded object-cover"
          />
        ) : (
          <div className="grid h-20 w-14 place-items-center rounded bg-muted">
            <BookOpen className="size-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-foreground">{value.title}</div>
          <div className="truncate text-sm text-muted-foreground">
            {value.author || "Unknown author"}
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
          placeholder="Search Open Library (book title)"
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
                key={it.id}
                type="button"
                onClick={() => {
                  onChange(it);
                  setOpen(false);
                  setQuery(it.title);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted"
              >
                {it.coverUrl ? (
                  <img
                    src={it.coverUrl}
                    alt=""
                    className="h-12 w-9 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="grid h-12 w-9 shrink-0 place-items-center rounded bg-muted">
                    <BookOpen className="size-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">
                    {it.title}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {it.author || "Unknown author"}
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

export default BookSearch;
