import { api } from "@/convex/_generated/api";
import {
  HeroBackdrop,
  PosterArt,
  TypePill,
  accentOf,
} from "@/components/catalog-ui";
import { Button } from "@/components/ui/button";
import { formatClock, formatDuration } from "@/lib/media";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ListVideo,
  Play,
  Star,
} from "lucide-react";
import { useMemo } from "react";
import { Link, useParams } from "react-router";

export default function SeriesDetail() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const data = useQuery(
    api.catalog.getSeries,
    seriesId ? { seriesId: seriesId as never } : "skip",
  );
  const history = useQuery(api.history.recentlyWatched, { limit: 50 }) ?? [];

  const progressByEpisode = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of history) map.set(row.episode._id, row.progress);
    return map;
  }, [history]);

  if (data === undefined) {
    return (
      <div className="space-y-6">
        <div className="clay h-64 animate-pulse" />
        <div className="clay h-40 animate-pulse" />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="clay p-10 text-center">
        <p className="font-display text-lg font-bold">That series is gone</p>
        <p className="mt-1 text-sm text-muted-foreground">
          It may have been unpublished or deleted by an admin.
        </p>
        <Link to="/home" className="mt-4 inline-block">
          <Button className="clay-press rounded-full font-bold">Back home</Button>
        </Link>
      </div>
    );
  }

  const { series, episodes } = data;
  const hue = accentOf(series);
  const inProgress = episodes.find((episode) => {
    const progress = progressByEpisode.get(episode._id);
    return progress !== undefined && progress > 0.02 && progress < 0.94;
  });
  const primaryEpisode = inProgress ?? episodes[0];
  const resumeRow = history.find((row) => row.series._id === series._id);

  return (
    <div className="space-y-8">
      <Link
        to="/home"
        className="clay-sm clay-press inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-muted-foreground no-underline hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back
      </Link>

      <section className="clay relative overflow-hidden p-0">
        <HeroBackdrop hue={hue} />
        <div className="relative grid gap-6 p-5 sm:p-8 lg:grid-cols-[15rem_1fr]">
          <div className="clay-well mx-auto aspect-2/3 w-44 overflow-hidden rounded-[1.6rem] sm:w-56 lg:mx-0 lg:w-full">
            <PosterArt series={series} />
          </div>

          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <TypePill type={series.type} />
              {series.trending && (
                <span className="clay-sm px-3 py-1.5 text-[10px] font-bold tracking-wide text-clay-blush uppercase">
                  Trending
                </span>
              )}
              {series.publishStatus === "draft" && (
                <span className="clay-sm px-3 py-1.5 text-[10px] font-bold tracking-wide text-clay-butter uppercase">
                  Draft
                </span>
              )}
            </div>

            <h1 className="font-display mt-3 text-3xl leading-tight font-extrabold sm:text-5xl">
              {series.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-foreground/80">
              {series.rating !== undefined && (
                <span className="flex items-center gap-1">
                  <Star className="size-3.5 fill-current text-clay-butter" />
                  {series.rating.toFixed(1)}
                </span>
              )}
              {series.year && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-3.5" />
                  {series.year}
                </span>
              )}
              <span className="flex items-center gap-1">
                <ListVideo className="size-3.5" />
                {episodes.length} {episodes.length === 1 ? "video" : "episodes"}
              </span>
            </div>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-foreground/85 sm:text-base">
              {series.description}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {series.genres.map((genre) => (
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
              {primaryEpisode ? (
                <>
                  <Link to={`/watch/${primaryEpisode._id}`}>
                    <Button size="lg" className="clay-press h-12 rounded-full px-7 font-bold">
                      <Play className="mr-2 size-4 fill-current" />
                      {inProgress
                        ? `Resume Ep ${primaryEpisode.episodeNumber}`
                        : series.type === "movie"
                          ? "Play movie"
                          : "Play Ep 1"}
                    </Button>
                  </Link>
                  {resumeRow && (
                    <span className="clay-sm px-4 py-2 text-[11px] font-bold text-muted-foreground">
                      You stopped at {formatClock(resumeRow.positionSeconds)} · Ep{" "}
                      {resumeRow.episode.episodeNumber}
                    </span>
                  )}
                </>
              ) : (
                <span className="clay-sm px-4 py-2 text-[11px] font-bold text-clay-butter">
                  No episodes published yet
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display flex items-center gap-2 text-xl font-bold">
          <ListVideo className="size-5 text-primary" />
          {series.type === "movie" ? "Feature" : "Episodes"}
        </h2>

        {episodes.length === 0 ? (
          <div className="clay-well rounded-[1.5rem] px-5 py-10 text-center text-sm text-muted-foreground">
            Episodes will appear here as soon as an admin publishes them.
          </div>
        ) : (
          <ul className="space-y-3">
            {episodes.map((episode, index) => {
              const progress = progressByEpisode.get(episode._id) ?? 0;
              const done = progress >= 0.94;
              return (
                <motion.li
                  key={episode._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.04, 0.4) }}
                >
                  <Link
                    to={`/watch/${episode._id}`}
                    className="clay clay-press flex items-center gap-4 p-3 no-underline sm:p-4"
                  >
                    <span
                      className={cn(
                        "clay-sm flex size-12 shrink-0 items-center justify-center rounded-2xl font-display text-base font-extrabold",
                        done ? "text-clay-mint" : "text-primary",
                      )}
                    >
                      {done ? (
                        <CheckCircle2 className="size-5" />
                      ) : (
                        episode.episodeNumber
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-display truncate text-sm font-bold sm:text-base">
                          {episode.title}
                        </span>
                        <span className="hidden shrink-0 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-bold text-muted-foreground sm:block">
                          {formatDuration(episode.durationSeconds)}
                        </span>
                      </span>
                      {episode.description && (
                        <span className="mt-1 line-clamp-2 block text-[11px] leading-5 text-muted-foreground sm:text-xs">
                          {episode.description}
                        </span>
                      )}
                      {progress > 0.02 && (
                        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-black/30">
                          <span
                            className="block h-full rounded-full bg-gradient-to-r from-clay-blush to-clay-lilac"
                            style={{ width: `${Math.min(progress * 100, 100)}%` }}
                          />
                        </span>
                      )}
                    </span>

                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full",
                        "bg-primary/20 text-primary",
                      )}
                    >
                      <Play className="size-4 fill-current" />
                    </span>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
