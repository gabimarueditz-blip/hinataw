import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { EpisodeDownloadButton } from "@/components/EpisodeDownload";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Button } from "@/components/ui/button";
import { formatClock, formatDuration } from "@/lib/media";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  CheckCircle2,
  Layers,
  ListVideo,
  Signal,
} from "lucide-react";
import { useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router";

export default function Watch() {
  const { episodeId } = useParams<{ episodeId: string }>();
  const navigate = useNavigate();
  const episodeKey = episodeId ? { episodeId: episodeId as Id<"episodes"> } : "skip";

  const data = useQuery(api.catalog.getEpisode, episodeKey);
  const resume = useQuery(api.history.resumePoint, episodeKey);
  const record = useMutation(api.history.recordProgress);

  const handleProgress = useCallback(
    (position: number, duration: number) => {
      if (!data) return;
      void record({
        episodeId: data.episode._id,
        seriesId: data.episode.seriesId,
        episodeNumber: data.episode.episodeNumber,
        positionSeconds: position,
        durationSeconds: duration || data.episode.durationSeconds,
      }).catch(() => undefined);
    },
    [data, record],
  );

  if (data === undefined || resume === undefined) {
    return (
      <div className="space-y-6">
        <div className="clay-well aspect-video animate-pulse rounded-[1.75rem]" />
        <div className="clay h-32 animate-pulse" />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="clay p-10 text-center">
        <p className="font-display text-lg font-bold">That episode is unavailable</p>
        <p className="mt-1 text-sm text-muted-foreground">
          It may have been unpublished or removed from the studio.
        </p>
        <Link to="/home" className="mt-4 inline-block">
          <Button className="clay-press rounded-full font-bold">Back home</Button>
        </Link>
      </div>
    );
  }

  const { episode, series, siblings } = data;
  const index = siblings.findIndex((item) => item._id === episode._id);
  const next = index >= 0 ? siblings[index + 1] : undefined;
  const previous = index > 0 ? siblings[index - 1] : undefined;
  const source = episode.hlsUrl ?? episode.videoUrl;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="clay-sm clay-press inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </button>
        {series && (
          <Link
            to={`/series/${series._id}`}
            className="clay-sm clay-press inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-muted-foreground no-underline hover:text-foreground"
          >
            <ListVideo className="size-3.5" />
            All episodes
          </Link>
        )}
      </div>

      <VideoPlayer
        key={episode._id}
        src={source}
        qualities={episode.qualities ?? []}
        poster={episode.thumbnailUrl ?? series?.posterUrl}
        title={episode.title}
        subtitle={
          series
            ? `${series.title} · ${series.type === "movie" ? "Movie" : `Episode ${episode.episodeNumber}`}`
            : undefined
        }
        startAt={resume?.positionSeconds ?? 0}
        autoPlay
        hasNext={Boolean(next)}
        onNext={next ? () => navigate(`/watch/${next._id}`) : undefined}
        onProgress={handleProgress}
      />

      {(next || previous) && (
        <div className="flex flex-wrap items-center gap-3">
          {previous && (
            <Link to={`/watch/${previous._id}`}>
              <Button variant="secondary" className="clay-sm clay-press rounded-full font-bold">
                ← Ep {previous.episodeNumber}
              </Button>
            </Link>
          )}
          {next && (
            <Link to={`/watch/${next._id}`}>
              <Button className="clay-press rounded-full font-bold">
                Next: {next.title} →
              </Button>
            </Link>
          )}
        </div>
      )}

      <section className="clay p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {series && (
              <Link
                to={`/series/${series._id}`}
                className="text-[11px] font-bold tracking-[0.16em] text-clay-mint uppercase no-underline"
              >
                {series.title}
              </Link>
            )}
            <h1 className="font-display mt-1 text-2xl font-extrabold sm:text-3xl">
              {episode.title}
            </h1>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              Episode {episode.episodeNumber} ·{" "}
              {episode.durationSeconds ? formatDuration(episode.durationSeconds) : "length varies"}
              {resume
                ? ` · resumed at ${formatClock(resume.positionSeconds)}`
                : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="clay-sm flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-wide text-clay-sky uppercase">
              <Signal className="size-3" />
              {episode.sourceKind === "hls" || episode.hlsUrl ? "Adaptive HLS" : "Direct stream"}
            </span>
            {(episode.qualities?.length ?? 0) > 1 && (
              <span className="clay-sm flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-wide text-clay-mint uppercase">
                <Layers className="size-3" />
                {episode.qualities?.length} qualities
              </span>
            )}
            <EpisodeDownloadButton episode={episode} seriesTitle={series?.title} />
          </div>
        </div>

        {episode.description && (
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
            {episode.description}
          </p>
        )}
      </section>

      {siblings.length > 1 && (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold">
            {series?.type === "movie" ? "More like this" : "Up next"}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {siblings.map((item) => {
              const active = item._id === episode._id;
              return (
                <li key={item._id}>
                  <Link
                    to={`/watch/${item._id}`}
                    className={cn(
                      "clay-sm clay-press flex items-center gap-3 p-3 no-underline",
                      active && "ring-2 ring-primary/60",
                    )}
                  >
                    <span
                      className={cn(
                        "font-display flex size-10 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold",
                        active ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary",
                      )}
                    >
                      {item.episodeNumber}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">
                        {item.title}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {formatDuration(item.durationSeconds)}
                        {active ? " · now playing" : ""}
                      </span>
                    </span>
                    {active && <CheckCircle2 className="size-4 shrink-0 text-primary" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
