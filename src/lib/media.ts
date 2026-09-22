/** Shared formatting + clay-art helpers for Hinataw.exe. */

/** Deterministic hue so art is stable when an admin leaves the accent empty. */
export function hueFromString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 360;
  }
  return hash;
}

/** Plush gradient poster art used when a series has no uploaded image. */
export function clayPosterBackground(hue: number) {
  const h = ((hue % 360) + 360) % 360;
  return [
    `radial-gradient(120% 95% at 18% 8%, oklch(0.88 0.11 ${h}) 0%, transparent 58%)`,
    `radial-gradient(115% 85% at 88% 22%, oklch(0.83 0.1 ${(h + 48) % 360}) 0%, transparent 62%)`,
    `radial-gradient(130% 90% at 65% 100%, oklch(0.62 0.1 ${(h + 300) % 360}) 0%, transparent 66%)`,
    `linear-gradient(160deg, oklch(0.46 0.08 ${h}) 0%, oklch(0.3 0.05 ${(h + 320) % 360}) 100%)`,
  ].join(", ");
}

export function clayBackdropBackground(hue: number) {
  const h = ((hue % 360) + 360) % 360;
  return [
    `radial-gradient(70% 120% at 12% 20%, oklch(0.6 0.12 ${h} / 0.75) 0%, transparent 60%)`,
    `radial-gradient(60% 110% at 82% 12%, oklch(0.58 0.11 ${(h + 55) % 360} / 0.7) 0%, transparent 62%)`,
    `linear-gradient(180deg, oklch(0.28 0.03 292 / 0.4) 0%, oklch(0.24 0.028 292 / 0.95) 78%)`,
  ].join(", ");
}

export function initialsOf(title: string) {
  return title
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function isHlsSource(url: string) {
  return url.toLowerCase().includes(".m3u8");
}

export function formatDuration(totalSeconds?: number) {
  if (!totalSeconds || totalSeconds <= 0) return "—";
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function formatClock(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const seconds = Math.floor(totalSeconds % 60);
  const minutes = Math.floor((totalSeconds / 60) % 60);
  const hours = Math.floor(totalSeconds / 3600);
  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function timeAgo(timestamp: number) {
  const seconds = Math.max(1, Math.round((Date.now() - timestamp) / 1000));
  const units: [number, string][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.35, "week"],
    [12, "month"],
  ];
  let value = seconds;
  for (const [step, name] of units) {
    if (value < step) {
      const rounded = Math.max(1, Math.floor(value));
      return `${rounded} ${name}${rounded === 1 ? "" : "s"} ago`;
    }
    value /= step;
  }
  return `${Math.floor(value)} years ago`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

export const GENRE_SUGGESTIONS = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Sci-Fi",
  "Romance",
  "Slice of Life",
  "Thriller",
  "Mystery",
  "Documentary",
  "Tech",
];
