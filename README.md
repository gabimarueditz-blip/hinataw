# Hinataw.exe

A clay-soft anime & movie streaming web app: adaptive HLS playback, resume-anywhere
watch history, and an admin-only studio for publishing content.

Built on the Freebuff web stack — React + Vite + Tailwind v4 + shadcn/ui, with
**Convex** as the database, file storage and backend, and **hls.js** for HLS playback.

## Screens

| Route | Access | What it does |
| --- | --- | --- |
| `/` | public | Clay landing page with feature grid, trending shelf and CTAs |
| `/auth` | public | Guest login (anonymous, one tap) and Admin login (ID + password) |
| `/home` | signed in | Featured carousel, Continue Watching, Trending, Anime, Movies, Latest |
| `/search` | signed in | Debounced search over series **and** episode titles, with genre/type/sort filters |
| `/categories` | signed in | Live genre tiles plus top-rated / trending / type rails |
| `/series/:seriesId` | signed in | Poster, description, genres and the episode list with progress bars |
| `/watch/:episodeId` | signed in | Full player + episode info + up-next list |
| `/profile` | signed in | Identity, history management, admin unlock, sign out |
| `/studio` | admin only | Library, series editor, episode uploads, activity log |

## Login

- **Guest login** — anonymous Convex Auth session. Watch everything, upload nothing.
- **Admin login** — demo credentials **7788 / 123**, verified inside a Convex
  mutation (`api.admin.adminLogin`). Success promotes the session to the `admin`
  role; every admin mutation re-checks that role server-side.

## Video pipeline

1. **Upload a file** — the browser PUTs straight to Convex file storage through the
   background upload queue: byte-level progress, auto-retry with backoff (4 attempts),
   continues while you navigate, cancellable, retryable.
2. **Paste a link** — `api.uploads.inspectLink` validates it server-side and rewrites
   Google Drive share links into direct stream URLs. `api.videos.analyzeStream` then
   fetches the manifest and extracts the **real 480p/720p/1080p ladder** from an HLS
   master playlist so the player's quality menu matches the stream.
3. **api.video (optional)** — with `API_VIDEO_API_KEY` set, `api.videos.ingestWithApiVideo`
   hands the source to api.video, which transcodes to HLS and serves it from a CDN.

Playback is streaming-only: the player never exposes a download control, and uploaded
files are validated by stored content type (videos only, images for posters).

## Player

Fullscreen (with landscape lock on mobile), ±10s seek, 0.5×–2× speed, adaptive or
manual quality, PiP, volume, keyboard shortcuts (space / ← / → / F / M), auto-hiding
controls, and a seek-preview thumbnail that shows the frame at the hovered timestamp.
Fatal network/media faults are recovered in-stream before an error is shown.

## Watch history

`api.history.recordProgress` writes the position every ~5s, on pause and on unmount —
so Continue Watching and resume work for guests too (they are anonymous users).

## Environment variables

Set these in the project's **Keys** tab:

| Variable | Purpose |
| --- | --- |
| `ADMIN_ID`, `ADMIN_PASSWORD` | Replace the demo 7788 / 123 admin credentials |
| `API_VIDEO_API_KEY` | Enable automatic 480p/720p/1080p HLS transcoding of uploads |

Without an `API_VIDEO_API_KEY` you can still ship: upload files, or paste a direct
HLS/mp4 link, and the player will stream it adaptively via hls.js.

## Demo library

An empty deployment seeds itself with a demo catalogue on first load
(`api.seed.ensureDemoContent`, idempotent) using public sample streams so playback,
quality switching, resume and history are all testable immediately.
