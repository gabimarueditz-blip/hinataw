import { formatBytes } from "@/lib/media";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Background upload queue.
 *
 * Uploads run through XHR so the studio gets real byte-level progress, they keep
 * streaming while the admin navigates between routes (the queue lives above the
 * router), and failures auto-retry with backoff — no frozen UI, no lost upload.
 */

export type UploadKind = "video" | "poster";

export type UploadStatus =
  | "queued"
  | "uploading"
  | "retrying"
  | "done"
  | "error"
  | "cancelled";

export interface UploadJob {
  id: string;
  fileName: string;
  size: number;
  kind: UploadKind;
  label?: string;
  progress: number;
  status: UploadStatus;
  attempts: number;
  error?: string;
  storageId?: string;
}

export interface EnqueueOptions {
  file: File;
  kind: UploadKind;
  label?: string;
  /** Fresh signed Convex upload URL for every attempt. */
  requestUrl: () => Promise<string>;
}

interface JobRecord {
  job: UploadJob;
  file: File;
  requestUrl: () => Promise<string>;
  xhr?: XMLHttpRequest;
  cancelled: boolean;
  resolve: (storageId: string) => void;
  reject: (error: Error) => void;
}

interface UploadQueueValue {
  jobs: UploadJob[];
  enqueue: (options: EnqueueOptions) => { id: string; promise: Promise<string> };
  retry: (id: string) => void;
  cancel: (id: string) => void;
  dismiss: (id: string) => void;
  clearFinished: () => void;
}

const UploadQueueContext = createContext<UploadQueueValue | null>(null);

const MAX_ATTEMPTS = 4;
const RETRY_DELAYS = [1200, 3000, 7000];

/**
 * Convex's generated upload URL has a hard 2-minute server-side timeout.
 * Files that cannot physically make it in that window are rejected before
 * starting, with a helpful pointer to the link/api.video modes instead of a
 * mysterious "network dropped" failure after 4 wasted attempts.
 */
const TWO_MINUTES_MS = 2 * 60 * 1000;
/** Assume a sustained 12 Mbit/s uplink as a generous-but-realistic floor. */
const ASSUMED_BITS_PER_SECOND = 12 * 1000 * 1000;
/** Hard client-side cap so a hung connection fails in ~2:10, not never. */
const UPLOAD_TIMEOUT_MS = TWO_MINUTES_MS + 10_000;

export function estimateUploadSeconds(sizeBytes: number, bitsPerSecond = ASSUMED_BITS_PER_SECOND) {
  return (sizeBytes * 8) / bitsPerSecond;
}

function classifyFile(file: File): string | null {
  if (estimateUploadSeconds(file.size) > TWO_MINUTES_MS / 1000) {
    const minutes = Math.ceil(estimateUploadSeconds(file.size) / 60);
    return (
      `“${file.name}” needs roughly ${minutes} min to upload, but Convex storage cuts ` +
      "every upload off at 2 minutes. Use the Link or api.video mode for files this big."
    );
  }
  return null;
}

function uploadOnce(
  file: File,
  url: string,
  onProgress: (percent: number) => void,
  registerXhr: (xhr: XMLHttpRequest) => void,
) {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    registerXhr(xhr);
    xhr.open("POST", url, true);
    // Convex cuts the upload off server-side at 2 minutes; fail cleanly here.
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const payload = JSON.parse(xhr.responseText) as { storageId?: string };
          if (!payload.storageId) {
            reject(new Error("Upload finished but no file id came back."));
            return;
          }
          onProgress(100);
          resolve(payload.storageId);
        } catch {
          reject(new Error("Upload response could not be read."));
        }
        return;
      }
      if (xhr.status === 413) {
        reject(
          new NonRetryableError(
            "The storage rejected this file as too large (HTTP 413). Use a stream link or api.video instead.",
          ),
        );
        return;
      }
      if (xhr.status === 401 || xhr.status === 403) {
        reject(
          new NonRetryableError(
            "The upload link was rejected — your admin session may have expired. Sign in again and retry.",
          ),
        );
        return;
      }
      reject(new Error(`Upload failed with status ${xhr.status}.`));
    };
    xhr.onerror = () => reject(new Error("Network dropped during upload."));
    xhr.ontimeout = () =>
      reject(
        new NonRetryableError(
          "Upload hit the 2-minute storage limit. Use a stream link or api.video for large files.",
        ),
      );
    xhr.onabort = () => reject(new Error("Upload cancelled."));

    xhr.send(file);
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Errors that will never succeed on retry — fail immediately, no backoff. */
export class NonRetryableError extends Error {}

export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const records = useRef(new Map<string, JobRecord>());

  const patchJob = useCallback((id: string, patch: Partial<UploadJob>) => {
    setJobs((prev) =>
      prev.map((job) => (job.id === id ? { ...job, ...patch } : job)),
    );
  }, []);

  const run = useCallback(
    async (id: string) => {
      const record = records.current.get(id);
      if (!record) return;
      record.cancelled = false;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        if (record.cancelled) return;
        patchJob(id, {
          status: attempt === 1 ? "uploading" : "retrying",
          attempts: attempt,
          error: undefined,
        });

        try {
          const url = await record.requestUrl();
          const storageId = await uploadOnce(
            record.file,
            url,
            (percent) => patchJob(id, { progress: percent }),
            (xhr) => {
              record.xhr = xhr;
            },
          );
          patchJob(id, { status: "done", progress: 100, storageId });
          record.resolve(storageId);
          return;
        } catch (error) {
          if (record.cancelled) {
            patchJob(id, { status: "cancelled", error: undefined });
            return;
          }
          const message = error instanceof Error ? error.message : "Upload failed.";
          if (error instanceof NonRetryableError || attempt >= MAX_ATTEMPTS) {
            patchJob(id, { status: "error", error: message });
            record.reject(new Error(message));
            return;
          }
          patchJob(id, { status: "retrying", error: `${message} Retrying…` });
          await sleep(RETRY_DELAYS[Math.min(attempt - 1, RETRY_DELAYS.length - 1)]);
        }
      }
    },
    [patchJob],
  );

  const enqueue = useCallback(
    ({ file, kind, label, requestUrl }: EnqueueOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const job: UploadJob = {
        id,
        fileName: file.name,
        size: file.size,
        kind,
        label,
        progress: 0,
        status: "queued",
        attempts: 0,
      };

      let resolveFn: (storageId: string) => void = () => {};
      let rejectFn: (error: Error) => void = () => {};
      const promise = new Promise<string>((resolve, reject) => {
        resolveFn = resolve;
        rejectFn = reject;
      });

      records.current.set(id, {
        job,
        file,
        requestUrl,
        cancelled: false,
        resolve: resolveFn,
        reject: rejectFn,
      });
      setJobs((prev) => [job, ...prev].slice(0, 12));

      const tooBig = classifyFile(file);
      if (tooBig) {
        // Fail before burning bandwidth on an upload that cannot finish.
        patchJob(id, { status: "error", error: tooBig });
        rejectFn(new Error(tooBig));
        return { id, promise };
      }

      void run(id);
      return { id, promise };
    },
    [run, patchJob],
  );

  const retry = useCallback(
    (id: string) => {
      const record = records.current.get(id);
      if (!record) return;
      record.cancelled = false;
      void run(id);
    },
    [run],
  );

  const cancel = useCallback((id: string) => {
    const record = records.current.get(id);
    if (!record) return;
    record.cancelled = true;
    record.xhr?.abort();
    patchJob(id, { status: "cancelled" });
  }, [patchJob]);

  const dismiss = useCallback((id: string) => {
    records.current.delete(id);
    setJobs((prev) => prev.filter((job) => job.id !== id));
  }, []);

  const clearFinished = useCallback(() => {
    setJobs((prev) => {
      const kept = prev.filter(
        (job) => job.status !== "done" && job.status !== "cancelled",
      );
      for (const job of prev) {
        if (job.status === "done" || job.status === "cancelled") {
          records.current.delete(job.id);
        }
      }
      return kept;
    });
  }, []);

  const value = useMemo<UploadQueueValue>(
    () => ({ jobs, enqueue, retry, cancel, dismiss, clearFinished }),
    [jobs, enqueue, retry, cancel, dismiss, clearFinished],
  );

  return (
    <UploadQueueContext.Provider value={value}>
      {children}
    </UploadQueueContext.Provider>
  );
}

export function useUploadQueue() {
  const context = useContext(UploadQueueContext);
  if (!context) {
    throw new Error("useUploadQueue must be used inside <UploadQueueProvider>");
  }
  return context;
}

const STATUS_COPY: Record<UploadStatus, string> = {
  queued: "Queued",
  uploading: "Uploading",
  retrying: "Retrying",
  done: "Uploaded",
  error: "Failed",
  cancelled: "Cancelled",
};

export function UploadDock() {
  const { jobs, retry, cancel, dismiss, clearFinished } = useUploadQueue();
  const [open, setOpen] = useState(true);

  if (jobs.length === 0) return null;
  const active = jobs.filter(
    (job) => job.status === "uploading" || job.status === "retrying" || job.status === "queued",
  );

  return (
    <div className="fixed inset-x-3 bottom-24 z-50 md:inset-x-auto md:right-6 md:bottom-6 md:w-96">
      <div className="clay overflow-hidden rounded-[1.75rem] p-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="flex flex-1 items-center gap-2 text-left"
          >
            <span className="clay-sm flex size-8 items-center justify-center text-clay-mint">
              {active.length > 0 ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold">
                {active.length > 0
                  ? `${active.length} upload${active.length === 1 ? "" : "s"} running`
                  : "Transfers"}
              </span>
              <span className="block truncate text-[10px] text-muted-foreground">
                Background · auto-retry enabled
              </span>
            </span>
            <ChevronDown
              className={cn("size-4 text-muted-foreground transition", open && "rotate-180")}
            />
          </button>
          <button
            type="button"
            onClick={clearFinished}
            className="rounded-full px-2 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 max-h-72 space-y-2 overflow-y-auto clay-scroll"
            >
              {jobs.map((job) => {
                const failed = job.status === "error";
                const finished =
                  job.status === "done" || job.status === "cancelled";
                return (
                  <li key={job.id} className="clay-well rounded-2xl p-2.5">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-muted-foreground">
                        {job.kind === "poster" ? (
                          <Upload className="size-3.5" />
                        ) : (
                          <Loader2
                            className={cn(
                              "size-3.5",
                              !finished && "animate-spin",
                            )}
                          />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold">
                          {job.label ?? job.fileName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatBytes(job.size)} ·{" "}
                          <span
                            className={cn(
                              failed && "text-destructive",
                              job.status === "done" && "text-clay-mint",
                            )}
                          >
                            {STATUS_COPY[job.status]}
                            {job.status === "retrying" && ` (try ${job.attempts})`}
                          </span>
                        </p>
                        {!finished && (
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/30">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-clay-blush to-clay-lilac transition-all"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                        )}
                        {job.error && (
                          <p className="mt-1 text-[10px] text-destructive">{job.error}</p>
                        )}
                      </div>
                      {failed && (
                        <button
                          type="button"
                          onClick={() => retry(job.id)}
                          title="Retry upload"
                          className="clay-sm flex size-7 items-center justify-center text-clay-butter"
                        >
                          <RotateCcw className="size-3.5" />
                        </button>
                      )}
                      {!finished ? (
                        <button
                          type="button"
                          onClick={() => cancel(job.id)}
                          title="Cancel upload"
                          className="flex size-7 items-center justify-center text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => dismiss(job.id)}
                          title="Dismiss"
                          className="flex size-7 items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
