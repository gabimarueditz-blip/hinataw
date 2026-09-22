import { api } from "@/convex/_generated/api";
import { ClayPill, EmptyClay, SeriesCard } from "@/components/catalog-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDuration } from "@/lib/media";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Film, Loader2, Play, SearchIcon, Sparkles, Tv, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";

type Sort = "latest" | "trending" | "top" | "az";

const SORTS: { value: Sort; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "trending", label: "Trending" },
  { value: "top", label: "Top rated" },
  { value: "az", label: "A → Z" },
];

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [raw, setRaw] = useState(params.get("q") ?? "");
  const [term, setTerm] = useState(raw);

  const type = (params.get("type") ?? "") as "" | "anime" | "movie";
  const genre = params.get("genre") ?? "";
  const sort = (params.get("sort") as Sort | null) ?? "latest";

  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(raw.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [raw]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const results = useQuery(api.catalog.browse, {
    q: term || undefined,
    type: type || undefined,
    genre: genre || undefined,
    sort,
    limit: 60,
  });
  const episodeHits = useQuery(
    api.catalog.searchEpisodes,
    term ? { q: term, limit: 12 } : "skip",
  );
  const genres = useQuery(api.catalog.genres) ?? [];

  const activeFilters = useMemo(
    () => [term && `“${term}”`, type && type, genre && genre, sort !== "latest" && sort].filter(Boolean),
    [term, type, genre, sort],
  );

  const loading = results === undefined;

  return (
    <div className="space-y-7">
      <div>
        <p className="text-[11px] font-bold tracking-[0.2em] text-clay-mint uppercase">
          find something good
        </p>
        <h1 className="font-display mt-1 text-3xl font-extrabold sm:text-4xl">
          Search Hinataw.exe
        </h1>
      </div>

      <div className="clay sticky top-20 z-20 p-4">
        <div className="clay-well flex items-center gap-3 rounded-2xl px-4 py-1">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <Input
            value={raw}
            onChange={(event) => {
              setRaw(event.target.value);
              updateParam("q", event.target.value);
            }}
            placeholder="Anime or movie title, episode name…"
            className="h-11 border-none bg-transparent px-0 text-sm font-semibold shadow-none focus-visible:ring-0"
          />
          {raw && (
            <button
              type="button"
              onClick={() => {
                setRaw("");
                updateParam("q", "");
              }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
          {loading && term && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
              Type
            </span>
            <ClayPill active={type === ""} onClick={() => updateParam("type", "")}>
              All
            </ClayPill>
            <ClayPill
              active={type === "anime"}
              onClick={() => updateParam("type", "anime")}
            >
              <Tv className="mr-1 inline size-3" />
              Anime
            </ClayPill>
            <ClayPill
              active={type === "movie"}
              onClick={() => updateParam("type", "movie")}
            >
              <Film className="mr-1 inline size-3" />
              Movies
            </ClayPill>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
              Sort
            </span>
            {SORTS.map((option) => (
              <ClayPill
                key={option.value}
                active={sort === option.value}
                onClick={() => updateParam("sort", option.value)}
              >
                {option.label}
              </ClayPill>
            ))}
          </div>

          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
            <span className="shrink-0 text-[10px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
              Genre
            </span>
            <ClayPill active={genre === ""} onClick={() => updateParam("genre", "")}>
              Any
            </ClayPill>
            {genres.map((item) => (
              <ClayPill
                key={item.name}
                active={genre.toLowerCase() === item.name.toLowerCase()}
                onClick={() => updateParam("genre", item.name)}
              >
                {item.name}
              </ClayPill>
            ))}
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
            <Sparkles className="size-3.5 text-clay-butter" />
            {activeFilters.join(" · ")}
            <button
              type="button"
              onClick={() => {
                setRaw("");
                setParams(new URLSearchParams(), { replace: true });
              }}
              className="ml-1 underline hover:text-foreground"
            >
              reset
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------ series ------------------------------ */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="clay h-64 animate-pulse" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <EmptyClay
          title="Nothing matches that yet"
          description="Try a different spelling, clear the filters, or browse by genre. New episodes show up here the moment an admin publishes them."
          icon={<SearchIcon className="size-6" />}
          action={
            <Button
              variant="secondary"
              className="clay-sm rounded-full font-bold"
              onClick={() => {
                setRaw("");
                setParams(new URLSearchParams(), { replace: true });
              }}
            >
              Reset search
            </Button>
          }
        />
      ) : (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold">
            {results.length} result{results.length === 1 ? "" : "s"}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {results.map((series, index) => (
              <motion.div
                key={series._id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.3) }}
              >
                <SeriesCard series={series} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ----------------------------- episodes ----------------------------- */}
      {(episodeHits?.length ?? 0) > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold">Episode matches</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {episodeHits?.map((hit) => (
              <li key={hit._id}>
                <Link
                  to={`/watch/${hit._id}`}
                  className="clay-sm clay-press flex items-center gap-3 p-3 no-underline"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                    <Play className="size-4 fill-current" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      {hit.title}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {hit.seriesTitle} · Ep {hit.episodeNumber} ·{" "}
                      {hit.durationSeconds
                        ? formatDuration(hit.durationSeconds)
                        : "streaming ready"}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase sm:block",
                      hit.publishStatus === "published"
                        ? "bg-clay-mint/20 text-clay-mint"
                        : "bg-clay-butter/20 text-clay-butter",
                    )}
                  >
                    {hit.publishStatus}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
