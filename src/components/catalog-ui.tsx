import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import {
  clayBackdropBackground,
  clayPosterBackground,
  formatDuration,
  hueFromString,
  initialsOf,
} from "@/lib/media";
import { motion } from "framer-motion";
import { ChevronRight, Film, Play, Sparkles, Tv } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";

export type SeriesLike = Doc<"series">;

export function accentOf(series: { title: string; accent?: number }) {
  return series.accent ?? hueFromString(series.title);
}

export function TypePill({ type, className }: { type: string; className?: string }) {
  const isMovie = type === "movie";
  return (
    <Badge
      className={cn(
        "border-none px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase",
        isMovie
          ? "bg-clay-sky/25 text-clay-sky"
          : "bg-clay-blush/25 text-clay-blush",
        className,
      )}
    >
      {isMovie ? <Film className="mr-1 size-3" /> : <Tv className="mr-1 size-3" />}
      {isMovie ? "Movie" : "Anime"}
    </Badge>
  );
}

export function PosterArt({
  series,
  className,
  rounded = "rounded-[1.6rem]",
}: {
  series: { title: string; posterUrl?: string; accent?: number };
  className?: string;
  rounded?: string;
}) {
  const [broken, setBroken] = useState(false);
  const hue = accentOf(series);

  if (series.posterUrl && !broken) {
    return (
      <img
        src={series.posterUrl}
        alt={series.title}
        loading="lazy"
        onError={() => setBroken(true)}
        className={cn("size-full object-cover", rounded, className)}
      />
    );
  }

  return (
    <div
      aria-label={series.title}
      role="img"
      className={cn(
        "relative flex size-full flex-col justify-between overflow-hidden p-4",
        rounded,
        className,
      )}
      style={{ backgroundImage: clayPosterBackground(hue) }}
    >
      <div className="pointer-events-none absolute -top-8 -right-6 size-24 rounded-full bg-white/20 blur-2xl" />
      <span className="font-display text-4xl leading-none font-extrabold text-white/85 drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]">
        {initialsOf(series.title)}
      </span>
      <span className="font-display text-sm leading-tight font-bold text-white/90 text-shadow-clay">
        {series.title}
      </span>
    </div>
  );
}

export function SeriesCard({
  series,
  subtitle,
  progress,
  resumeLabel,
  className,
}: {
  series: SeriesLike;
  subtitle?: string;
  progress?: number;
  resumeLabel?: string;
  className?: string;
}) {
  const meta = [series.year, series.rating ? `${series.rating.toFixed(1)}★` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={cn("group relative", className)}
    >
      <Link
        to={`/series/${series._id}`}
        className="clay clay-press block overflow-hidden rounded-[1.9rem] p-2.5 no-underline"
      >
        <div className="clay-well relative aspect-2/3 w-full overflow-hidden rounded-[1.5rem]">
          <PosterArt series={series} rounded="rounded-[1.4rem]" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 pt-6 pb-2.5">
            <span className="text-[11px] font-semibold text-white/90">
              {subtitle ?? (series.type === "movie" ? "Feature film" : `${series.genres[0] ?? "Series"}`)}
            </span>
            <span className="flex size-7 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-md transition group-hover:scale-110">
              <Play className="size-3.5 fill-current" />
            </span>
          </div>
          {progress !== undefined && (
            <div className="absolute inset-x-3 bottom-2 h-1.5 overflow-hidden rounded-full bg-black/45">
              <div
                className="h-full rounded-full bg-clay-blush"
                style={{ width: `${Math.min(Math.max(progress, 0), 1) * 100}%` }}
              />
            </div>
          )}
        </div>
        <div className="px-1.5 pt-3 pb-1">
          <p className="font-display truncate text-[15px] font-bold text-foreground">
            {series.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {resumeLabel ?? meta ?? series.genres.join(" · ")}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

export function Rail({
  title,
  icon,
  action,
  actionHref,
  children,
  eyebrow,
}: {
  title: string;
  icon?: ReactNode;
  action?: string;
  actionHref?: string;
  children: ReactNode;
  eyebrow?: string;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          {eyebrow && (
            <p className="text-[11px] font-bold tracking-[0.18em] text-clay-mint uppercase">
              {eyebrow}
            </p>
          )}
          <h2 className="font-display flex items-center gap-2 text-xl font-extrabold sm:text-2xl">
            {icon}
            {title}
          </h2>
        </div>
        {action && actionHref && (
          <Link
            to={actionHref}
            className="clay-sm clay-press flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            {action}
            <ChevronRight className="size-3.5" />
          </Link>
        )}
      </div>
      <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2">
        {children}
      </div>
    </section>
  );
}

export function RailSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="w-[164px] shrink-0 space-y-3 sm:w-[184px]">
          <Skeleton className="aspect-2/3 w-full rounded-[1.6rem]" />
          <Skeleton className="h-4 w-3/4 rounded-full" />
          <Skeleton className="h-3 w-1/2 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function ClayPill({
  children,
  active,
  onClick,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "clay-press rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition",
        active
          ? "bg-primary text-primary-foreground shadow-[0_10px_18px_-12px_oklch(0.16_0.03_290/0.9),inset_0_-6px_10px_oklch(0.2_0.04_300/0.28),inset_0_7px_10px_oklch(1_0_0/0.3)]"
          : "clay-sm text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function EmptyClay({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="clay flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="clay-sm flex size-14 items-center justify-center text-primary">
        {icon ?? <Sparkles className="size-6" />}
      </div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

export function HeroBackdrop({ hue }: { hue: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ backgroundImage: clayBackdropBackground(hue) }}
    />
  );
}

export function EpisodeBadge({ seconds }: { seconds?: number }) {
  return (
    <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white/85">
      {formatDuration(seconds)}
    </span>
  );
}
