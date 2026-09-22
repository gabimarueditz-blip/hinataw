import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Doc } from "@/convex/_generated/dataModel";
import { isHlsSource } from "@/lib/media";
import { cn } from "@/lib/utils";
import { Download, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/** A progressive file we can hand to the browser as one saveable download. */
export type DownloadSource = { label: string; url: string };

type DownloadableEpisode = Pick<
  Doc<"episodes">,
  "title" | "episodeNumber" | "videoUrl" | "qualities"
>;

const SAVEABLE_EXTENSIONS = ["mp4", "m4v", "webm", "mkv", "mov", "ogv"];

function extensionFor(url: string) {
  const path = url.split(/[?#]/)[0] ?? "";
  const ext = path.match(/\.([a-z0-9]{2,4})$/i)?.[1]?.toLowerCase();
  return ext && SAVEABLE_EXTENSIONS.includes(ext) ? ext : "mp4";
}

/** Readable file name: "Series - E03 - Episode title.mp4". */
export function downloadFileName(
  episode: DownloadableEpisode,
  seriesTitle: string | undefined,
  url: string,
) {
  const stem = [
    seriesTitle,
    episode.episodeNumber ? `E${String(episode.episodeNumber).padStart(2, "0")}` : undefined,
    episode.title,
  ]
    .filter(Boolean)
    .join(" - ")
    .replace(/[^\p{L}\p{N} ._-]+/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  return `${stem || "episode"}.${extensionFor(url)}`;
}

/**
 * Every source that can be saved as a single file. HLS manifests are skipped —
 * they are playlists of segments, so there is no one file to hand over.
 */
export function downloadSourcesFor(episode: DownloadableEpisode): DownloadSource[] {
  const sources: DownloadSource[] = [];
  const seen = new Set<string>();
  const add = (label: string, url: string | undefined) => {
    if (!url || isHlsSource(url) || seen.has(url)) return;
    seen.add(url);
    sources.push({ label, url });
  };

  for (const quality of episode.qualities ?? []) add(quality.label, quality.url);
  add(sources.length > 0 ? "Original" : "Full quality", episode.videoUrl);
  return sources;
}

function clickAnchor(href: string, filename: string, newTab = false) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.rel = "noopener";
  if (newTab) anchor.target = "_blank";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/**
 * Pull the bytes into a Blob so the browser saves them under our file name.
 * Hosts that block cross-origin reads fall back to opening the URL, where the
 * browser's own "Save video as…" takes over.
 */
async function saveFile(source: DownloadSource, filename: string) {
  try {
    const response = await fetch(source.url, { credentials: "omit" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    clickAnchor(objectUrl, filename);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return true;
  } catch {
    clickAnchor(source.url, filename, true);
    return false;
  }
}

export function EpisodeDownloadButton({
  episode,
  seriesTitle,
  className,
}: {
  episode: DownloadableEpisode;
  seriesTitle?: string;
  className?: string;
}) {
  const sources = useMemo(() => downloadSourcesFor(episode), [episode]);
  const [busy, setBusy] = useState(false);

  const start = async (source: DownloadSource) => {
    setBusy(true);
    try {
      const saved = await saveFile(source, downloadFileName(episode, seriesTitle, source.url));
      toast.success(
        saved ? `Downloading ${episode.title}` : "Opened in a new tab — use “Save video as…”",
      );
    } catch {
      toast.error("Could not start that download.");
    } finally {
      setBusy(false);
    }
  };

  const chip = cn(
    "clay-sm clay-press inline-flex shrink-0 items-center gap-2 px-3 py-2 text-[11px] font-bold text-muted-foreground hover:text-foreground",
    className,
  );

  // HLS-only episodes have no single file to save.
  if (sources.length === 0) {
    return (
      <span title="This episode streams as HLS, so there is no single file to download.">
        <button type="button" disabled className={cn(chip, "cursor-not-allowed opacity-55")}>
          <Download className="size-3.5" />
          <span className="hidden sm:inline">Download</span>
        </button>
      </span>
    );
  }

  const label = (
    <>
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
      <span className="hidden sm:inline">Download</span>
    </>
  );

  if (sources.length === 1) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => void start(sources[0])}
        className={chip}
        aria-label={`Download ${episode.title}`}
      >
        {label}
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={busy}
          className={chip}
          aria-label={`Download ${episode.title}`}
        >
          {label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40 rounded-2xl">
        <DropdownMenuLabel className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Download quality
        </DropdownMenuLabel>
        {sources.map((source) => (
          <DropdownMenuItem
            key={source.url}
            onSelect={() => void start(source)}
            className="font-bold"
          >
            {source.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
