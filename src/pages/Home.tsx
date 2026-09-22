import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import {
  Play,
  Compass,
  Flame,
  History,
  Popcorn,
  Search,
  Sparkles,
  Star,
  Tv,
} from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  accentOf,
  HeroBackdrop,
  PosterArt,
  Rail,
  RailSkeleton,
  SeriesCard,
  TypePill,
} from "@/components/catalog-ui";
import { formatClock } from "@/lib/media";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const { user } = useAuth();
  const seedDemo = useMutation(api.seed.ensureDemoContent);

  useEffect(() => {
    // one-time, idempotent: fills an empty deployment with a demo library
    void seedDemo({}).catch(() => undefined);
  }, [seedDemo]);

  const featured = useQuery(api.catalog.featured);
  const continueWatching = useQuery(api.history.continueWatching, { limit: 10 });
  const trending = useQuery(api.catalog.browse, { sort: "trending", limit: 14 });
  const anime = useQuery(api.catalog.browse, { type: "anime", sort: "latest", limit: 14 });
  const movies = useQuery(api.catalog.browse, { type: "movie", sort: "latest", limit: 14 });
  const latest = useQuery(api.catalog.recent, { limit: 14 });

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!featured || featured.length < 2) return;
    const timer = window.setInterval(
      () => setActiveIndex((prev) => (prev + 1) % featured.length),
      6500,
    );
    return () => window.clearInterval(timer);
  }, [featured]);

  const active = useMemo(
    () => featured?.[activeIndex] ?? featured?.[0] ?? null,
    [featured, activeIndex],
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 5) return "Late-night marathon";
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold tracking-[0.2em] text-clay-mint uppercase">
            {greeting}
          </p>
          <h1 className="font-display mt-1 text-3xl font-extrabold sm:text-4xl">
            {user?.role === "admin" ? "Studio is warm" : "What are we watching?"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {user?.role === "admin"
              ? "Guests see only published series — your drafts stay hidden."
              : "Adaptive quality, resume anywhere, no downloads."}
          </p>
        </div>
        <Link to="/search">
          <Button
            variant="secondary"
            className="clay-sm clay-press h-11 rounded-full px-5 font-bold"
          >
            <Search className="mr-2 size-4" />
            Search the library
          </Button>
        </Link>
      </div>

      {/* ------------------------------ hero ------------------------------ */}
      {active ? (
        <motion.section
          key={active._id}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="clay relative overflow-hidden p-0"
        >
          <HeroBackdrop hue={accentOf(active)} />
          <div className="relative grid gap-6 p-5 sm:p-8 lg:grid-cols-[16rem_1fr] lg:items-center">
            <div className="clay-well mx-auto aspect-2/3 w-40 overflow-hidden rounded-[1.6rem] sm:w-52 lg:mx-0 lg:w-full">
              <PosterArt series={active} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="clay-sm flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-wide text-clay-butter uppercase">
                  <Sparkles className="size-3" />
                  Featured
                </span>
                <TypePill type={active.type} />
                {active.rating !== undefined && (
                  <span className="clay-sm flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-foreground">
                    <Star className="size-3 fill-current text-clay-butter" />
                    {active.rating.toFixed(1)}
                  </span>
                )}
              </div>
              <h2 className="font-display mt-3 text-3xl leading-tight font-extrabold sm:text-5xl">
                {active.title}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground/85 sm:text-base">
                {active.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {active.genres.map((genre) => (
                  <Link
                    key={genre}
                    to={`/search?genre=${encodeURIComponent(genre)}`}
                    className="clay-sm clay-press px-3 py-1.5 text-[11px] font-bold text-muted-foreground no-underline hover:text-foreground"
                  >
                    {genre}
                  </Link>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link to={`/series/${active._id}`}>
                  <Button size="lg" className="clay-press h-12 rounded-full px-7 font-bold">
                    <Play className="mr-2 size-4 fill-current" />
                    Play now
                  </Button>
                </Link>
                <Link to={`/series/${active._id}`}>
                  <Button
                    size="lg"
                    variant="secondary"
                    className="clay-sm clay-press h-12 rounded-full px-6 font-bold"
                  >
                    Episodes
                  </Button>
                </Link>
              </div>

              {featured && featured.length > 1 && (
                <div className="mt-6 flex items-center gap-2">
                  {featured.map((item, index) => (
                    <button
                      key={item._id}
                      type="button"
                      aria-label={`Show ${item.title}`}
                      onClick={() => setActiveIndex(index)}
                      className={cn(
                        "h-2 rounded-full transition-all",
                        index === activeIndex
                          ? "w-8 bg-primary"
                          : "w-2 bg-foreground/25 hover:bg-foreground/40",
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.section>
      ) : (
        <div className="clay h-72 animate-pulse" />
      )}

      {/* ------------------------ continue watching ------------------------ */}
      {(continueWatching?.length ?? 0) > 0 && (
        <Rail
          title="Continue watching"
          eyebrow="pick up where you left"
          icon={<History className="size-5 text-clay-mint" />}
          action="History"
          actionHref="/profile"
        >
          {continueWatching?.map((row) => (
            <SeriesCard
              key={row._id}
              series={row.series}
              className="w-[164px] shrink-0 snap-start sm:w-[184px]"
              progress={row.progress}
              resumeLabel={`Ep ${row.episode.episodeNumber} · ${formatClock(row.positionSeconds)}`}
            />
          ))}
        </Rail>
      )}

      {/* ----------------------------- trending ---------------------------- */}
      <Rail
        title="Trending now"
        eyebrow="heat check"
        icon={<Flame className="size-5 text-clay-blush" />}
        action="See all"
        actionHref="/search?sort=trending"
      >
        {trending
          ? trending.map((series) => (
              <SeriesCard
                key={series._id}
                series={series}
                className="w-[164px] shrink-0 snap-start sm:w-[184px]"
              />
            ))
          : <RailSkeleton />}
      </Rail>

      <div className="grid gap-8 lg:grid-cols-2">
        <Rail
          title="Anime series"
          eyebrow="episode by episode"
          icon={<Tv className="size-5 text-clay-lilac" />}
          action="All anime"
          actionHref="/search?type=anime"
        >
          {anime
            ? anime.slice(0, 8).map((series) => (
                <SeriesCard
                  key={series._id}
                  series={series}
                  className="w-[152px] shrink-0 snap-start sm:w-[172px]"
                />
              ))
            : <RailSkeleton count={4} />}
        </Rail>

        <Rail
          title="Movies"
          eyebrow="one sitting"
          icon={<Popcorn className="size-5 text-clay-butter" />}
          action="All movies"
          actionHref="/search?type=movie"
        >
          {movies
            ? movies.slice(0, 8).map((series) => (
                <SeriesCard
                  key={series._id}
                  series={series}
                  className="w-[152px] shrink-0 snap-start sm:w-[172px]"
                />
              ))
            : <RailSkeleton count={4} />}
        </Rail>
      </div>

      <Rail
        title="Latest uploads"
        eyebrow="fresh from the studio"
        icon={<Sparkles className="size-5 text-clay-sky" />}
        action="Browse"
        actionHref="/categories"
      >
        {latest
          ? latest.map((series) => (
              <SeriesCard
                key={series._id}
                series={series}
                className="w-[164px] shrink-0 snap-start sm:w-[184px]"
              />
            ))
          : <RailSkeleton />}
      </Rail>

      <section className="clay flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="clay-sm flex size-12 items-center justify-center text-clay-mint">
            <Compass className="size-6" />
          </span>
          <div>
            <p className="font-display text-lg font-bold">Browse by genre</p>
            <p className="text-sm text-muted-foreground">
              Action, romance, slice of life, mystery — pick a mood.
            </p>
          </div>
        </div>
        <Link to="/categories">
          <Button className="clay-press rounded-full px-6 font-bold">
            Open categories
          </Button>
        </Link>
      </section>
    </div>
  );
}
