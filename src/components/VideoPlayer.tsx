import { cn } from "@/lib/utils";
import { formatClock, isHlsSource } from "@/lib/media";
import type Hls from "hls.js";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  Gauge,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Settings2,
  SkipForward,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

export interface PlaybackQuality {
  label: string;
  url: string;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  subtitle?: string;
  qualities?: PlaybackQuality[];
  startAt?: number;
  autoPlay?: boolean;
  hasNext?: boolean;
  onNext?: () => void;
  onProgress?: (position: number, duration: number) => void;
  className?: string;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const CONTROLS_TIMEOUT = 3200;

/** Inline (non-portal) dropdown so menus stay visible in fullscreen. */
function PlayerMenu({
  label,
  icon,
  children,
  align = "right",
}: {
  label: string;
  icon: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/20"
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            onClick={(event) => event.stopPropagation()}
            className={cn(
              "absolute bottom-11 z-30 min-w-32 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/92 p-1.5 shadow-2xl backdrop-blur-xl",
              align === "right" ? "right-0" : "left-0",
            )}
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs font-semibold transition",
        active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10",
      )}
    >
      {children}
      {active && <Check className="size-3.5" />}
    </button>
  );
}

export function VideoPlayer({
  src,
  poster,
  title,
  subtitle,
  qualities = [],
  startAt = 0,
  autoPlay = false,
  hasNext = false,
  onNext,
  onProgress,
  className,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const controlsTimer = useRef<number | null>(null);
  const lastReport = useRef(0);
  const resumedRef = useRef(false);
  // startAt keeps changing as watch history streams in; read it through a ref so
  // an in-flight session is never restarted mid-playback.
  const startAtRef = useRef(startAt);

  const [activeSrc, setActiveSrc] = useState(src);
  const [hlsLevels, setHlsLevels] = useState<{ index: number; label: string }[]>([]);
  const [selectedLevel, setSelectedLevel] = useState(-1);
  const [selectedQuality, setSelectedQuality] = useState(-1);
  const [effectiveLevel, setEffectiveLevel] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResume, setShowResume] = useState(startAt > 10);
  const [scrub, setScrub] = useState<{ time: number; x: number } | null>(null);
  const [nativeHls, setNativeHls] = useState(true);

  const isHls = isHlsSource(activeSrc);
  const nativePlayback = !isHls || nativeHls;

  useEffect(() => {
    const probe = document.createElement("video");
    setNativeHls(Boolean(probe.canPlayType("application/vnd.apple.mpegurl")));
  }, []);

  useEffect(() => {
    startAtRef.current = startAt;
  }, [startAt]);

  useEffect(() => {
    setActiveSrc(src);
    setSelectedQuality(0);
    resumedRef.current = false;
    setShowResume(startAtRef.current > 10);
    setError(null);
  }, [src]);

  /* --------------------------- source loading --------------------------- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSrc) return;

    let cancelled = false;
    let hls: Hls | null = null;

    const setup = async () => {
      if (isHls && !nativeHls) {
        const mod = await import("hls.js");
        const HlsCtor = mod.default;
        if (cancelled) return;
        if (!HlsCtor.isSupported()) {
          setError("This browser cannot play HLS streams. Try Safari or Chrome.");
          return;
        }
        hls = new HlsCtor({
          enableWorker: true,
          lowLatencyMode: false,
          capLevelToPlayerSize: true,
          maxBufferLength: 30,
          backBufferLength: 60,
          fragLoadingMaxRetry: 6,
          manifestLoadingMaxRetry: 4,
        });
        hlsRef.current = hls;
        hls.loadSource(activeSrc);
        hls.attachMedia(video);

        hls.on(HlsCtor.Events.MANIFEST_PARSED, () => {
          const levels = (hls?.levels ?? []).map((level, index) => ({
            index,
            label: level.height ? `${level.height}p` : `${Math.round((level.bitrate ?? 0) / 1000)}kbps`,
          }));
          setHlsLevels(levels);

          // Prefer a stored quality preference. If none, pick a level that matches
          // the current player size so the stream starts at a sensible bandwidth.
          let chosenIndex = qualities.findIndex((q) => q.label !== "Auto");
          if (chosenIndex < 0 && levels.length > 0) {
            const targetHeight = Math.min(video.clientHeight || 180, levels[levels.length - 1]?.height ?? 720);
            chosenIndex = levels.reduce((best, level, index) => {
              const candidate = Math.abs((level.height ?? targetHeight) - targetHeight);
              return candidate < Math.abs((levels[best]?.height ?? targetHeight) - targetHeight) ? index : best;
            }, 0);
          }
          setSelectedQuality(chosenIndex < 0 ? -1 : chosenIndex);

          if (autoPlay) void video.play().catch(() => undefined);
        });

        hls.on(HlsCtor.Events.LEVEL_SWITCHED, (_event, data) => {
          if (hls?.autoLevelEnabled) setSelectedLevel(-1);
          else setSelectedLevel(data.level);
        });

        hls.on(HlsCtor.Events.ERROR, (_event, data) => {
          if (!data.fatal || !hls) return;
          // self-healing: recover network/media faults before surfacing an error
          if (data.type === HlsCtor.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
            return;
          }
          if (data.type === HlsCtor.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
            return;
          }
          setError("Stream interrupted. Tap retry to reconnect.");
        });
        hls.on(HlsCtor.Events.LEVEL_SWITCHED, () => {
          if (hls?.levels && selectedLevel >= 0 && selectedLevel < hls.levels.length) {
            const level = hls.levels[selectedLevel];
            if (videoRef.current && videoRef.current.videoWidth > 0) {
              const targetSize = Math.min(videoRef.current.clientHeight, level.height ?? 0);
              if (Math.abs((level.height ?? 0) - targetSize) > 120) {
                const next = hls.levels.reduce((best, candidate, index) => {
                  if (index === selectedLevel) return best;
                  return Math.abs((candidate.height ?? 0) - targetSize) < Math.abs((hls.levels[best]?.height ?? 0) - targetSize) ? index : best;
                }, selectedLevel);
                setSelectedLevel(next);
                if (hls.currentLevel !== next) hls.currentLevel = next;
              }
            }
          }
        });
        return;
      }

      video.src = activeSrc;
      if (autoPlay) void video.play().catch(() => undefined);
    };

    void setup().catch(() => setError("Could not start playback for this source."));

    return () => {
      cancelled = true;
      if (hls) hls.destroy();
      hlsRef.current = null;
    };
  }, [activeSrc, isHls, nativeHls, autoPlay]);

  /* ----------------------------- clip logic ----------------------------- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoaded = () => {
      setDuration(video.duration || 0);
      const resumeAt = startAtRef.current;
      if (!resumedRef.current && resumeAt > 10 && video.duration > resumeAt) {
        video.currentTime = resumeAt;
        resumedRef.current = true;
      }
    };
    const onTime = () => {
      setPosition(video.currentTime);
      const now = Date.now();
      if (now - lastReport.current > 5000 && onProgress) {
        lastReport.current = now;
        onProgress(video.currentTime, video.duration || 0);
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      setControlsVisible(true);
      if (onProgress) onProgress(video.currentTime, video.duration || 0);
    };
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onRate = () => setSpeed(video.playbackRate);
    const onVolume = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("durationchange", onLoaded);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("ratechange", onRate);
    video.addEventListener("volumechange", onVolume);
    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("durationchange", onLoaded);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("ratechange", onRate);
      video.removeEventListener("volumechange", onVolume);
    };
  }, [onProgress]);

  // flush the last position when the page or player unmounts
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video && onProgress && video.currentTime > 0) {
        onProgress(video.currentTime, video.duration || 0);
      }
    };
  }, [onProgress]);

  /* ------------------------------- controls ----------------------------- */
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimer.current) window.clearTimeout(controlsTimer.current);
    controlsTimer.current = window.setTimeout(() => {
      const video = videoRef.current;
      if (video && !video.paused) setControlsVisible(false);
    }, CONTROLS_TIMEOUT);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
    showControls();
  }, [showControls]);

  const seekBy = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = Math.min(
        Math.max(0, video.currentTime + delta),
        video.duration || Infinity,
      );
      showControls();
    },
    [showControls],
  );

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;
    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (orientation: string) => Promise<void>;
        };
        await orientation.lock?.("landscape").catch(() => undefined);
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* fullscreen can be blocked by the host — playback continues inline */
    }
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (event.code === "Space") {
        event.preventDefault();
        togglePlay();
      }
      if (event.code === "ArrowRight") seekBy(5);
      if (event.code === "ArrowLeft") seekBy(-5);
      if (event.key.toLowerCase() === "f") void toggleFullscreen();
      if (event.key.toLowerCase() === "m") {
        const video = videoRef.current;
        if (video) video.muted = !video.muted;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, seekBy, toggleFullscreen]);

  /* ------------------------------ scrubbing ----------------------------- */
  const barRef = useRef<HTMLDivElement>(null);
  const hasManualQualities = qualities.length > 1;

  const timeFromPointer = useCallback(
    (clientX: number) => {
      const bar = barRef.current;
      if (!bar || !duration) return 0;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
      return ratio * duration;
    },
    [duration],
  );

  const handleScrubMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const bar = barRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const time = timeFromPointer(event.clientX);
      setScrub({
        time,
        x: Math.min(Math.max(event.clientX - rect.left, 0), rect.width),
      });
      const video = previewRef.current;
      if (video && nativePlayback && Number.isFinite(time)) {
        try {
          video.currentTime = time;
        } catch {
          /* preview frame is best-effort */
        }
      }
    },
    [nativePlayback, timeFromPointer],
  );

  const commitScrub = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const video = videoRef.current;
      const time = timeFromPointer(event.clientX);
      if (video && Number.isFinite(time)) video.currentTime = time;
      setScrub(null);
      showControls();
    },
    [showControls, timeFromPointer],
  );

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  const qualityOptions = useMemo(() => {
    if (hlsLevels.length > 0) {
      return hlsLevels
        .slice()
        .sort((a, b) => parseInt(b.label) - parseInt(a.label));
    }
    return qualities.map((quality, index) => ({ index, label: quality.label }));
  }, [hlsLevels, qualities]);

  const applyLevel = (index: number) => {
    setSelectedLevel(index);
    setSelectedQuality(index + 1);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
    } else if (index > 0 && qualities[index - 1]) {
      const video = videoRef.current;
      const wasPlaying = video ? !video.paused : false;
      const at = video?.currentTime ?? 0;
      setActiveSrc(qualities[index - 1].url);
      window.setTimeout(() => {
        const next = videoRef.current;
        if (!next) return;
        next.currentTime = at;
        if (wasPlaying) void next.play().catch(() => undefined);
      }, 120);
    }
  };

  const retry = () => {
    setError(null);
    const video = videoRef.current;
    if (hlsRef.current) {
      hlsRef.current.startLoad();
      return;
    }
    if (video) {
      video.load();
      void video.play().catch(() => undefined);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative w-full overflow-hidden bg-black select-none",
        fullscreen ? "rounded-none" : "clay-well aspect-video rounded-[1.75rem]",
        className,
      )}
      onMouseMove={showControls}
      onPointerLeave={() => playing && setControlsVisible(false)}
    >
      <video
        ref={videoRef}
        playsInline
        poster={poster}
        onClick={togglePlay}
        className="size-full bg-black object-contain"
      />

      {/* seek preview: a tiny muted clone of the stream, no canvas involved */}
      {nativePlayback && (
        <video
          ref={previewRef}
          src={activeSrc}
          muted
          preload="metadata"
          aria-hidden
          className="pointer-events-none absolute size-0 opacity-0"
        />
      )}

      <AnimatePresence>
        {buffering && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25"
          >
            <span className="clay flex size-14 items-center justify-center rounded-full">
              <Loader2 className="size-6 animate-spin text-primary" />
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center">
          <AlertTriangle className="size-7 text-clay-butter" />
          <p className="max-w-sm text-sm font-semibold text-white">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="clay-press flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold text-white"
          >
            <RotateCw className="size-3.5" />
            Retry stream
          </button>
        </div>
      )}

      {/* tap target for showing controls */}
      {!controlsVisible && !error && (
        <button
          type="button"
          aria-label="Show player controls"
          onClick={showControls}
          className="absolute inset-0 cursor-pointer"
        />
      )}

      <AnimatePresence>
        {!playing && !buffering && !error && (
          <motion.button
            type="button"
            aria-label="Play"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            onClick={togglePlay}
            className="clay-press absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/22 text-white backdrop-blur-md"
          >
            <Play className="ml-1 size-7 fill-current" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResume && startAt > 10 && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            onClick={() => {
              const video = videoRef.current;
              if (video) video.currentTime = 0;
              setShowResume(false);
            }}
            className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-black/70 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-md"
          >
            <RotateCcw className="size-3.5 text-clay-mint" />
            Resumed at {formatClock(startAt)} · start over
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pt-14 pb-3 sm:px-5"
          >
            {(title || subtitle) && (
              <div className="mb-2 px-1">
                {subtitle && (
                  <p className="text-[10px] font-bold tracking-[0.16em] text-clay-mint uppercase">
                    {subtitle}
                  </p>
                )}
                {title && (
                  <p className="font-display truncate text-sm font-bold text-white sm:text-base">
                    {title}
                  </p>
                )}
              </div>
            )}

            <div
              ref={barRef}
              role="slider"
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(position)}
              tabIndex={0}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                handleScrubMove(event);
              }}
              onPointerMove={(event) => {
                if (event.buttons === 1) handleScrubMove(event);
                else if (duration) {
                  const bar = barRef.current;
                  if (bar) {
                    const rect = bar.getBoundingClientRect();
                    const time = timeFromPointer(event.clientX);
                    setScrub({
                      time,
                      x: Math.min(Math.max(event.clientX - rect.left, 0), rect.width),
                    });
                    const preview = previewRef.current;
                    if (preview && nativePlayback && Number.isFinite(time)) {
                      try {
                        preview.currentTime = time;
                      } catch {
                        /* best effort */
                      }
                    }
                  }
                }
              }}
              onPointerUp={commitScrub}
              onPointerLeave={() => setScrub(null)}
              className="relative h-6 cursor-pointer touch-none"
            >
              <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-clay-blush to-clay-lilac"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div
                className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg"
                style={{ left: `${progressPercent}%` }}
              />

              <AnimatePresence>
                {scrub && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ left: scrub.x }}
                    className="pointer-events-none absolute bottom-8 -translate-x-1/2 overflow-hidden rounded-2xl border border-white/15 bg-black/85 shadow-2xl"
                  >
                    {nativePlayback && (
                      <video
                        src={activeSrc}
                        muted
                        aria-hidden
                        className="h-20 w-36 bg-black object-cover"
                        ref={(node) => {
                          if (node && Number.isFinite(scrub.time)) {
                            try {
                              node.currentTime = scrub.time;
                            } catch {
                              /* best effort */
                            }
                          }
                        }}
                      />
                    )}
                    <span className="block px-2 py-1 text-center text-[11px] font-bold text-white">
                      {formatClock(scrub.time)}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-1.5 flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={playing ? "Pause" : "Play"}
                className="flex size-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition hover:bg-white/25"
              >
                {playing ? (
                  <Pause className="size-5 fill-current" />
                ) : (
                  <Play className="size-5 fill-current" />
                )}
              </button>

              <button
                type="button"
                onClick={() => seekBy(-10)}
                aria-label="Back 10 seconds"
                className="flex size-9 items-center justify-center rounded-full text-white/85 transition hover:bg-white/15"
              >
                <RotateCcw className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => seekBy(10)}
                aria-label="Forward 10 seconds"
                className="flex size-9 items-center justify-center rounded-full text-white/85 transition hover:bg-white/15"
              >
                <RotateCw className="size-5" />
              </button>

              <span className="ml-1 text-[11px] font-bold text-white/90 tabular-nums">
                {formatClock(scrub?.time ?? position)}
                <span className="text-white/50"> / {formatClock(duration)}</span>
              </span>

              <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                {(qualityOptions.length > 0 || hasManualQualities) && (
                  <PlayerMenu
                    label={
                      hlsLevels.length > 0
                        ? selectedLevel < 0
                          ? "Auto"
                          : hlsLevels.find((level) => level.index === selectedLevel)?.label ?? "Auto"
                        : qualities[selectedQuality - 1]?.label ?? "Auto"
                    }
                    icon={<Settings2 className="size-3.5" />}
                  >
                    {(close) => (
                      <>
                        <p className="px-3 pt-1.5 pb-1 text-[10px] font-bold tracking-wider text-white/45 uppercase">
                          Quality
                        </p>
                        <MenuItem
                          active={
                            hlsLevels.length > 0
                              ? selectedLevel < 0
                              : selectedQuality === 0
                          }
                          onClick={() => {
                            applyLevel(-1);
                            close();
                          }}
                        >
                          Auto (adaptive)
                        </MenuItem>
                        {qualityOptions.map((option) => (
                          <MenuItem
                            key={`${option.index}-${option.label}`}
                            active={
                              hlsLevels.length > 0
                                ? selectedLevel === option.index
                                : selectedQuality === option.index + 1
                            }
                            onClick={() => {
                              applyLevel(option.index);
                              close();
                            }}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </>
                    )}
                  </PlayerMenu>
                )}

                <PlayerMenu label={`${speed}x`} icon={<Gauge className="size-3.5" />}>
                  {(close) => (
                    <>
                      <p className="px-3 pt-1.5 pb-1 text-[10px] font-bold tracking-wider text-white/45 uppercase">
                        Speed
                      </p>
                      {SPEEDS.map((value) => (
                        <MenuItem
                          key={value}
                          active={speed === value}
                          onClick={() => {
                            const video = videoRef.current;
                            if (video) video.playbackRate = value;
                            setSpeed(value);
                            close();
                          }}
                        >
                          {value}x{value === 1 ? " (normal)" : ""}
                        </MenuItem>
                      ))}
                    </>
                  )}
                </PlayerMenu>

                {hasNext && onNext && (
                  <button
                    type="button"
                    onClick={onNext}
                    aria-label="Next episode"
                    className="flex size-9 items-center justify-center rounded-full text-white/85 transition hover:bg-white/15"
                  >
                    <SkipForward className="size-5" />
                  </button>
                )}

                <PlayerMenu
                  label={muted || volume === 0 ? "Muted" : `${Math.round(volume * 100)}%`}
                  icon={<PictureInPicture2 className="size-3.5" />}
                >
                  {(close) => (
                    <>
                      <p className="px-3 pt-1.5 pb-1 text-[10px] font-bold tracking-wider text-white/45 uppercase">
                        Volume
                      </p>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        defaultValue={volume}
                        onChange={(event) => {
                          const video = videoRef.current;
                          if (video) {
                            video.volume = Number(event.target.value);
                            video.muted = Number(event.target.value) === 0;
                          }
                        }}
                        onClick={(event) => event.stopPropagation()}
                        className="mx-2 w-[calc(100%-1rem)] accent-[var(--clay-blush)]"
                      />
                      <MenuItem
                        onClick={async () => {
                          const video = videoRef.current;
                          try {
                            if (document.pictureInPictureElement) {
                              await document.exitPictureInPicture();
                            } else if (video && "requestPictureInPicture" in video) {
                              await video.requestPictureInPicture();
                            }
                          } catch {
                            /* PiP unsupported */
                          }
                          close();
                        }}
                      >
                        Picture in picture
                      </MenuItem>
                    </>
                  )}
                </PlayerMenu>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-label="Toggle fullscreen"
                  className="flex size-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                >
                  {fullscreen ? (
                    <Minimize className="size-4" />
                  ) : (
                    <Maximize className="size-4" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
