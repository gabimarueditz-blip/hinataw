import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Doc } from "@/convex/_generated/dataModel";
import { formatBytes, isHlsSource } from "@/lib/media";
import { cn } from "@/lib/utils";
import { Check, Circle, Download, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
    sources.push({ label: label === "Auto" ? "Original" : label, url });
  };

  for (const quality of episode.qualities ?? []) add(quality.label, quality.url);
  add(sources.length > 0 ? "Original" : "Full quality", episode.videoUrl);
  return sources;
}

/* ------------------------------ size probing ------------------------------ */

/** Sizes are probed once per URL per session and remembered here. */
const sizeCache = new Map<string, number | null>();

/**
 * Ask the host how big the file is: HEAD first, then a 1-byte ranged GET whose
 * Content-Range carries the total. null = host would not (or could not) say.
 */
async function probeSize(url: string): Promise<number | null> {
  try {
    const head = await fetch(url, { method: "HEAD", credentials: "omit" });
    const length = Number(head.headers.get("content-length"));
    if (Number.isFinite(length) && length > 0) return length;

    const range = await fetch(url, {
      headers: { Range: "bytes=0-0" },
      credentials: "omit",
    });
    const total = Number(range.headers.get("content-range")?.split("/")[1]);
    if (Number.isFinite(total) && total > 0) return total;
  } catch {
    /* CORS or network — the host simply does not report a size to us */
  }
  return null;
}

/* ------------------------------ file saving ------------------------------- */

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
 * Pull the bytes into a Blob so the browser saves them under our file name,
 * reporting progress as chunks arrive. Hosts that block cross-origin reads
 * fall back to opening the URL, where the browser's "Save video as…" takes over.
 */
async function saveFile(
  source: DownloadSource,
  filename: string,
  onProgress?: (received: number, total: number | null) => void,
): Promise<boolean> {
  try {
    const response = await fetch(source.url, { credentials: "omit" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const declared = Number(response.headers.get("content-length"));
    const total = Number.isFinite(declared) && declared > 0 ? declared : null;

    if (response.body) {
      const reader = response.body.getReader();
      const chunks: BlobPart[] = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.byteLength;
        onProgress?.(received, total);
      }
      const objectUrl = URL.createObjectURL(new Blob(chunks));
      clickAnchor(objectUrl, filename);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      return true;
    }

    const blob = await response.blob();
    onProgress?.(blob.size, blob.size);
    const objectUrl = URL.createObjectURL(blob);
    clickAnchor(objectUrl, filename);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return true;
  } catch {
    clickAnchor(source.url, filename, true);
    return false;
  }
}

/* -------------------------------- the button ------------------------------- */

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
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  /** undefined = probing, null = host did not report a size. */
  const [sizes, setSizes] = useState<Record<string, number | null | undefined>>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ received: number; total: number | null } | null>(null);

  // Default the selection to the first (best) available quality.
  useEffect(() => {
    if (selected === null && sources.length > 0) setSelected(sources[0].url);
  }, [sources, selected]);

  // Probe sizes while the confirmation popup is open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      for (const source of sources) {
        const cached = sizeCache.get(source.url);
        if (sizeCache.has(source.url)) {
          setSizes((prev) => ({ ...prev, [source.url]: cached ?? null }));
          continue;
        }
        const size = await probeSize(source.url);
        if (cancelled) return;
        sizeCache.set(source.url, size);
        setSizes((prev) => ({ ...prev, [source.url]: size }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, sources]);

  const fileName = downloadFileName(
    episode,
    seriesTitle,
    selected ?? sources[0]?.url ?? "episode.mp4",
  );
  const selectedSize = selected !== undefined ? sizes[selected ?? ""] : undefined;
  const percent =
    progress && progress.total ? Math.min(progress.received / progress.total, 1) * 100 : null;

  const confirm = async () => {
    const source = sources.find((item) => item.url === selected);
    if (!source) return;
    setBusy(true);
    setProgress({ received: 0, total: sizes[source.url] ?? null });
    try {
      const saved = await saveFile(source, fileName, (received, total) =>
        setProgress({ received, total }),
      );
      setOpen(false);
      toast.success(
        saved ? `Saved ${fileName}` : "Opened in a new tab — use “Save video as…”",
      );
    } catch {
      toast.error("Could not start that download.");
    } finally {
      setBusy(false);
      setProgress(null);
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={chip}
        aria-label={`Download ${episode.title}`}
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
        <span className="hidden sm:inline">Download</span>
      </button>

      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent className="clay rounded-[2rem] border-none p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-extrabold">
              Download episode
            </DialogTitle>
            <DialogDescription className="text-xs leading-5">
              {episode.title}
              {seriesTitle ? ` · ${seriesTitle}` : ""}
              <span className="mt-0.5 block truncate text-[11px]">{fileName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {sources.map((source) => {
              const size = sizes[source.url];
              const active = selected === source.url;
              return (
                <button
                  key={source.url}
                  type="button"
                  disabled={busy}
                  onClick={() => setSelected(source.url)}
                  className={cn(
                    "clay-press flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "clay-sm text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    {active ? (
                      <Check className="size-4" />
                    ) : (
                      <Circle className="size-4 opacity-45" />
                    )}
                    {source.label}
                  </span>
                  <span className="text-xs font-semibold tabular-nums">
                    {size === undefined ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : size === null ? (
                      "size unavailable"
                    ) : (
                      formatBytes(size)
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {busy && progress && (
            <div className="space-y-1.5">
              <div className="h-2 overflow-hidden rounded-full bg-black/25">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-clay-blush to-clay-lilac transition-[width]"
                  style={{ width: `${percent ?? 4}%` }}
                />
              </div>
              <p className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                {formatBytes(progress.received)}
                {progress.total ? ` of ${formatBytes(progress.total)}` : " downloaded…"}
              </p>
            </div>
          )}

          {!busy && selectedSize === null && (
            <p className="text-[11px] leading-5 text-muted-foreground">
              The host did not report a file size — the download may be large.
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="clay-sm rounded-full font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy || !selected}
              onClick={() => void confirm()}
              className="clay-press rounded-full font-bold"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Downloading…
                </>
              ) : (
                <>
                  <Download className="mr-2 size-4" />
                  {typeof selectedSize === "number"
                    ? `Download · ${formatBytes(selectedSize)}`
                    : "Download"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
