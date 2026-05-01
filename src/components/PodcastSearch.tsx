import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { Loader2, Mic } from "lucide-react";

export interface PodcastShow {
  id: string;
  title: string;
  publisher: string;
  image: string | null;
  listennotes_url: string;
}

export interface PodcastEpisode {
  id: string;
  title: string;
  pub_date_ms: number | null;
  listennotes_url: string;
  image: string | null;
}

export interface PodcastPick {
  show: PodcastShow;
  episode: PodcastEpisode | null;
  /** Composed title: "Show — Episode" or just the show. */
  composedTitle: string;
  /** URL to persist on the memory record (episode if picked, else show). */
  sourceUrl: string;
  /** Cover art to fall back into the photo slot if no user photo. */
  image: string | null;
}

interface Props {
  /** The current freeform value of the title field (manual mode passthrough). */
  title: string;
  onTitleChange: (next: string) => void;
  /** Selected podcast/episode (or null when in manual mode / pre-selection). */
  value: PodcastPick | null;
  onChange: (pick: PodcastPick | null) => void;
  /** Manual mode bypasses the search experience entirely. */
  manualMode: boolean;
  onManualToggle: (manual: boolean) => void;
}

const inputClass = "h-12 text-base bg-card border-0 placeholder:italic";

const formatDate = (ms: number | null) => {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
};

const PodcastSearch = ({
  title,
  onTitleChange,
  value,
  onChange,
  manualMode,
  onManualToggle,
}: Props) => {
  const [query, setQuery] = useState(title);
  const [shows, setShows] = useState<PodcastShow[]>([]);
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [pendingShow, setPendingShow] = useState<PodcastShow | null>(null);
  const [showsOpen, setShowsOpen] = useState(false);
  const [loadingShows, setLoadingShows] = useState(false);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const debounced = useDebounce(query, 400);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep query in sync if the title is externally cleared.
  useEffect(() => {
    if (!title && !value) setQuery("");
  }, [title, value]);

  // Search podcasts.
  useEffect(() => {
    if (manualMode) return;
    if (value || pendingShow) return;
    if (!debounced || debounced.length < 2) {
      setShows([]);
      setNoResults(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingShows(true);
      setNoResults(false);
      try {
        const session = (await supabase.auth.getSession()).data.session;
        if (!session) return;
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-podcasts?q=${encodeURIComponent(debounced)}`;
        const r = await fetch(url, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!r.ok) throw new Error("search failed");
        const d = await r.json();
        if (cancelled) return;
        const items: PodcastShow[] = d.items ?? [];
        setShows(items);
        setShowsOpen(true);
        setNoResults(items.length === 0);
      } catch (err) {
        console.warn("podcast search failed, falling back to manual", err);
        if (!cancelled) onManualToggle(true);
      } finally {
        if (!cancelled) setLoadingShows(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, value, pendingShow, manualMode, onManualToggle]);

  // Close dropdown on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setShowsOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pickShow = async (show: PodcastShow) => {
    setPendingShow(show);
    setShowsOpen(false);
    setLoadingEpisodes(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("no session");
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-podcasts?podcast_id=${encodeURIComponent(show.id)}`;
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!r.ok) throw new Error("episodes failed");
      const d = await r.json();
      setEpisodes(d.episodes ?? []);
    } catch (err) {
      console.warn("podcast episodes failed", err);
      // commit show selection without episodes
      commit(show, null);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  const commit = (show: PodcastShow, episode: PodcastEpisode | null) => {
    const composedTitle = episode
      ? `${show.title} — ${episode.title}`
      : show.title;
    onChange({
      show,
      episode,
      composedTitle,
      sourceUrl: episode?.listennotes_url || show.listennotes_url,
      image: show.image,
    });
    onTitleChange(composedTitle);
    setPendingShow(null);
    setEpisodes([]);
    setQuery(composedTitle);
  };

  const enterManualMode = () => {
    onManualToggle(true);
    setShows([]);
    setShowsOpen(false);
    setPendingShow(null);
    setEpisodes([]);
    setNoResults(false);
    onChange(null);
  };

  // ---- Manual mode: plain freeform input identical to Quote/Poem ----
  if (manualMode) {
    return (
      <Input
        type="text"
        value={title}
        maxLength={120}
        placeholder="Name this Touchstone"
        onChange={(e) => onTitleChange(e.target.value)}
        className={inputClass}
      />
    );
  }

  // ---- Episode picker (after a show is chosen, before final commit) ----
  if (pendingShow) {
    return (
      <div className="space-y-2" ref={containerRef}>
        <div className="flex items-center gap-3 rounded-md bg-card p-3">
          {pendingShow.image ? (
            <img
              src={pendingShow.image}
              alt={pendingShow.title}
              className="size-14 rounded object-cover"
            />
          ) : (
            <div className="grid size-14 place-items-center rounded bg-muted">
              <Mic className="size-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-foreground">
              {pendingShow.title}
            </div>
            <div className="truncate text-sm text-muted-foreground">
              {pendingShow.publisher}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setPendingShow(null);
              setEpisodes([]);
              setQuery("");
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Change
          </button>
        </div>

        <div className="rounded-md bg-card">
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Select an episode (optional)
            </span>
            <button
              type="button"
              onClick={() => commit(pendingShow, null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Skip →
            </button>
          </div>
          {loadingEpisodes ? (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading episodes…
            </div>
          ) : episodes.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">
              No recent episodes — log the show generally.
            </div>
          ) : (
            <div className="max-h-72 overflow-auto">
              {episodes.map((ep) => (
                <button
                  key={ep.id}
                  type="button"
                  onClick={() => commit(pendingShow, ep)}
                  className="block w-full px-3 py-2 text-left hover:bg-muted"
                >
                  <div className="truncate text-sm font-medium text-foreground">
                    {ep.title}
                  </div>
                  {ep.pub_date_ms && (
                    <div className="text-xs text-muted-foreground">
                      {formatDate(ep.pub_date_ms)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- Selected pick summary ----
  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-md bg-card p-3">
        {value.show.image ? (
          <img
            src={value.show.image}
            alt={value.show.title}
            className="size-14 rounded object-cover"
          />
        ) : (
          <div className="grid size-14 place-items-center rounded bg-muted">
            <Mic className="size-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-foreground">
            {value.show.title}
          </div>
          <div className="truncate text-sm text-muted-foreground">
            {value.episode ? value.episode.title : value.show.publisher}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            onTitleChange("");
            setQuery("");
          }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Change
        </button>
      </div>
    );
  }

  // ---- Search input + dropdown ----
  return (
    <div className="space-y-1.5" ref={containerRef}>
      <div className="relative">
        <Input
          type="text"
          value={query}
          placeholder="Search for a podcast..."
          onChange={(e) => {
            setQuery(e.target.value);
            onTitleChange(e.target.value);
          }}
          onFocus={() => shows.length > 0 && setShowsOpen(true)}
          className={inputClass}
        />
        {loadingShows && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
        )}
        {showsOpen && shows.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-md border border-border bg-popover shadow-lg">
            {shows.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => pickShow(s)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted"
              >
                {s.image ? (
                  <img
                    src={s.image}
                    alt=""
                    className="size-10 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="grid size-10 shrink-0 place-items-center rounded bg-muted">
                    <Mic className="size-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">
                    {s.title}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {s.publisher}
                  </div>
                </div>
              </button>
            ))}
            <button
              type="button"
              onClick={enterManualMode}
              className="block w-full border-t border-border px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Can't find it? Enter manually →
            </button>
          </div>
        )}
      </div>
      {noResults && !loadingShows && (
        <div className="rounded-md bg-card px-3 py-2 text-sm text-muted-foreground">
          No results found — try different keywords or{" "}
          <button
            type="button"
            onClick={enterManualMode}
            className="underline hover:text-foreground"
          >
            enter manually →
          </button>
        </div>
      )}
      {!noResults && query.length >= 2 && (
        <button
          type="button"
          onClick={enterManualMode}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Can't find it? Enter manually →
        </button>
      )}
    </div>
  );
};

export default PodcastSearch;
