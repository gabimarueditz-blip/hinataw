import { api } from "@/convex/_generated/api";
import { BrandArt } from "@/components/BrandArt";
import { PosterArt, TypePill } from "@/components/catalog-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clayPosterBackground, hueFromString } from "@/lib/media";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CloudUpload,
  Film,
  Gauge,
  History,
  Link2,
  Lock,
  Play,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import { Link } from "react-router";

const FEATURES = [
  {
    icon: Gauge,
    title: "Adaptive HLS playback",
    body: "Every episode ships as 480p / 720p / 1080p renditions. The player reads the master playlist and switches quality as bandwidth changes — no stalls, no reload.",
    tint: "from-clay-blush to-clay-lilac",
  },
  {
    icon: History,
    title: "Resume where you stopped",
    body: "Watch position is written to your history every few seconds, so Continue Watching drops you back at the exact second — even after a crash or a closed tab.",
    tint: "from-clay-mint to-clay-sky",
  },
  {
    icon: CloudUpload,
    title: "Uploads that survive",
    body: "Byte-level progress, automatic retry with backoff, and a queue that keeps uploading while you browse other pages. 1 GB+ files stay calm.",
    tint: "from-clay-butter to-clay-blush",
  },
  {
    icon: Link2,
    title: "Link-based ingest",
    body: "Paste a Google Drive or .m3u8 link and the studio validates it server-side, rewrites Drive links and reads the real quality ladder from the manifest.",
    tint: "from-clay-sky to-clay-mint",
  },
  {
    icon: ShieldCheck,
    title: "Role-gated studio",
    body: "Guests can watch only. Uploading, editing and publishing sit behind an admin unlock that is verified on the server for every mutation.",
    tint: "from-clay-lilac to-clay-blush",
  },
  {
    icon: Timer,
    title: "Zero-glitch recovery",
    body: "Fatal network and media faults are healed mid-stream by the HLS engine, and the player retries the source instead of dying on you.",
    tint: "from-clay-mint to-clay-butter",
  },
];

const STEPS = [
  {
    title: "Sign in with one tap",
    body: "Guests tap once — no email, no password. Admin unlocks the studio with the admin ID.",
  },
  {
    title: "Watch in clay comfort",
    body: "Flick through Anime, Movies, Trending and Latest. Tap any episode for instant playback.",
  },
  {
    title: "Publish from the studio",
    body: "Upload a file or paste a stream link, tag genres, then flip the series to published.",
  },
];

export default function Landing() {
  const featured = useQuery(api.catalog.featured) ?? [];
  const genres = useQuery(api.catalog.genres) ?? [];

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div aria-hidden className="clay-blob fixed -top-32 -left-24 size-80 bg-clay-blush/45" />
      <div aria-hidden className="clay-blob fixed top-40 -right-28 size-96 bg-clay-sky/35" />
      <div aria-hidden className="clay-blob fixed bottom-0 left-1/3 size-80 bg-clay-mint/30" />

      <header className="sticky top-0 z-40 px-4 py-3 sm:px-8">
        <div className="clay mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full px-4 py-2.5">            <Link to="/" className="flex items-center gap-3 no-underline">
              <span className="clay-sm relative flex size-10 items-center justify-center overflow-hidden">
                <BrandArt className="size-[88%]" />
              </span>
              <span className="leading-none">
              <span className="font-display block text-lg font-extrabold">
                Hinataw<span className="text-primary">.exe</span>
              </span>
              <span className="text-[10px] font-bold tracking-[0.22em] text-muted-foreground uppercase">
                clay stream
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth?mode=admin" className="hidden sm:block">
              <Button
                variant="ghost"
                className="rounded-full text-sm font-bold text-muted-foreground hover:text-foreground"
              >
                Admin login
              </Button>
            </Link>
            <Link to="/auth">
              <Button className="clay-press rounded-full px-5 font-bold">
                Guest pass
                <ArrowRight className="ml-1 size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 pb-20 sm:px-8">
        {/* ------------------------------- hero ------------------------------- */}
        <section className="grid items-center gap-10 pt-8 pb-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pt-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Badge className="clay-sm mb-5 gap-1.5 border-none bg-transparent px-3 py-1.5 text-[11px] font-bold tracking-wide text-clay-mint uppercase">
              <Sparkles className="size-3.5" />
              anime · movies · zero buffering
            </Badge>
            <h1 className="font-display text-[2.6rem] leading-[1.03] font-extrabold sm:text-6xl">
              Your whole library,
              <br />
              <span className="bg-gradient-to-r from-clay-blush via-clay-lilac to-clay-sky bg-clip-text text-transparent">
                squeezed into clay.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Hinataw.exe streams anime and movies with adaptive HLS quality,
              seek previews, playback speed and resume-anywhere history — while
              admins publish new episodes from a studio built to survive flaky
              networks.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/auth" className="sm:w-auto">
                <Button
                  size="lg"
                  className="clay-press h-13 w-full rounded-full px-7 text-base font-bold sm:w-auto"
                >
                  <Play className="mr-2 size-4 fill-current" />
                  Continue as guest
                </Button>
              </Link>
              <Link to="/auth?mode=admin" className="sm:w-auto">
                <Button
                  size="lg"
                  variant="secondary"
                  className="clay-sm clay-press h-13 w-full rounded-full px-7 text-base font-bold sm:w-auto"
                >
                  <Lock className="mr-2 size-4" />
                  Admin studio
                </Button>
              </Link>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              {[
                { k: "3", v: "HLS renditions" },
                { k: "∞", v: "Background uploads" },
                { k: "1-click", v: "Episode downloads" },
              ].map((stat) => (
                <div key={stat.v} className="clay-sm px-4 py-3">
                  <dt className="font-display text-2xl font-extrabold text-primary">
                    {stat.k}
                  </dt>
                  <dd className="text-[11px] leading-tight font-semibold text-muted-foreground">
                    {stat.v}
                  </dd>
                </div>
              ))}
            </dl>
          </motion.div>

          {/* clay player mock */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="clay animate-clay-float absolute -top-5 -left-4 z-10 hidden rounded-3xl px-4 py-3 sm:block">
              <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Now playing
              </p>
              <p className="font-display text-sm font-bold">
                {featured[0]?.title ?? "Hinata Protocol"}
              </p>
            </div>

            <div className="clay relative overflow-hidden rounded-[2.4rem] p-3">
              <div className="clay-well relative aspect-video overflow-hidden rounded-[1.8rem]">
                {featured[0] ? (
                  <PosterArt series={featured[0]} rounded="rounded-[1.8rem]" />
                ) : (
                  <div
                    className="size-full"
                    style={{
                      backgroundImage: clayPosterBackground(
                        hueFromString("Hinata Protocol"),
                      ),
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute inset-x-4 bottom-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-10 items-center justify-center rounded-full bg-white/90 text-zinc-900">
                      <Play className="ml-0.5 size-4 fill-current" />
                    </span>
                    <div className="clay-well h-2 flex-1 rounded-full p-0">
                      <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-clay-blush to-clay-lilac" />
                    </div>
                    <span className="text-[11px] font-bold text-white/90 tabular-nums">
                      24:18
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {["Auto", "1080p", "720p", "1.5x"].map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full bg-white/18 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 px-2 pb-1">
                <div>
                  <p className="font-display text-sm font-bold">Continue watching</p>
                  <p className="text-[11px] text-muted-foreground">
                    Resumes at 24:18 · clay-soft remember
                  </p>
                </div>
                <span className="clay-sm flex size-9 items-center justify-center text-clay-mint">
                  <History className="size-4" />
                </span>
              </div>
            </div>

            <div className="clay animate-clay-float absolute -right-3 -bottom-6 z-10 hidden rounded-3xl px-4 py-3 sm:block">
              <p className="text-[10px] font-bold tracking-wider text-clay-mint uppercase">
                Upload
              </p>
              <p className="font-display text-sm font-bold">1.4 GB · 78%</p>
              <div className="clay-well mt-2 h-1.5 w-28 rounded-full">
                <div className="h-full w-[78%] rounded-full bg-clay-mint" />
              </div>
            </div>
          </motion.div>
        </section>

        {/* ----------------------------- library ----------------------------- */}
        {featured.length > 0 && (
          <section className="pb-16">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold tracking-[0.2em] text-clay-mint uppercase">
                  On the shelf tonight
                </p>
                <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
                  Trending in Hinataw.exe
                </h2>
              </div>
              <Link
                to="/auth"
                className="clay-sm clay-press hidden items-center gap-1 px-4 py-2 text-xs font-bold text-muted-foreground sm:flex"
              >
                Browse all
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {featured.map((series, index) => (
                <motion.div
                  key={series._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.06, duration: 0.5 }}
                >
                  <Link
                    to="/auth"
                    className="clay clay-press block overflow-hidden rounded-[1.8rem] p-2.5 no-underline"
                  >
                    <div className="clay-well aspect-2/3 overflow-hidden rounded-[1.4rem]">
                      <PosterArt series={series} />
                    </div>
                    <div className="px-1.5 pt-3">
                      <p className="font-display truncate text-sm font-bold">
                        {series.title}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <TypePill type={series.type} />
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {series.rating?.toFixed(1)}★
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ----------------------------- features ----------------------------- */}
        <section className="pb-16">
          <div className="mb-8 max-w-2xl">
            <p className="text-[11px] font-bold tracking-[0.2em] text-clay-butter uppercase">
              built for streaming, not buffering
            </p>
            <h2 className="font-display mt-1 text-2xl font-extrabold sm:text-4xl">
              Everything a streaming app needs, sculpted soft
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: index * 0.05, duration: 0.5 }}
                className="clay clay-press p-6"
              >
                <span
                  className={cn(
                    "clay-sm flex size-12 items-center justify-center bg-gradient-to-br text-zinc-900/80",
                    feature.tint,
                  )}
                >
                  <feature.icon className="size-6" />
                </span>
                <h3 className="font-display mt-4 text-lg font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {feature.body}
                </p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* ------------------------------- steps ------------------------------ */}
        <section className="clay mb-16 overflow-hidden p-7 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-[11px] font-bold tracking-[0.2em] text-clay-sky uppercase">
                three taps to play
              </p>
              <h2 className="font-display mt-1 text-2xl font-extrabold sm:text-3xl">
                From the shelf to full screen
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Guest sessions are anonymous and instant. Admins get the studio
                with uploads, link ingest, descriptions, publish toggles and
                content deletion.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {genres.slice(0, 8).map((genre) => (
                  <span
                    key={genre.name}
                    className="clay-sm px-3 py-1.5 text-[11px] font-bold text-muted-foreground"
                  >
                    {genre.name} · {genre.count}
                  </span>
                ))}
              </div>
            </div>
            <ol className="space-y-4">
              {STEPS.map((step, index) => (
                <li key={step.title} className="clay-sm flex gap-4 p-5">
                  <span className="font-display flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-extrabold text-primary-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-base font-bold">{step.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* -------------------------------- CTA ------------------------------- */}
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-clay-blush/25 via-clay-lilac/20 to-clay-sky/25 px-6 py-12 text-center sm:px-12">
          <div className="mx-auto max-w-2xl">
            <span className="clay-sm mx-auto flex size-14 items-center justify-center text-primary">
              <Film className="size-7" />
            </span>
            <h2 className="font-display mt-5 text-3xl font-extrabold sm:text-4xl">
              Pop the clay lid open
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              Stream or save — grab any episode in full quality, with token-friendly
              playback and resume-anywhere history across every device.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/auth">
                <Button
                  size="lg"
                  className="clay-press h-13 w-full rounded-full px-8 text-base font-bold sm:w-auto"
                >
                  Start watching free
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
              <Link to="/auth?mode=admin">
                <Button
                  size="lg"
                  variant="secondary"
                  className="clay-sm clay-press h-13 w-full rounded-full px-8 text-base font-bold sm:w-auto"
                >
                  Unlock admin studio
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-border/40 px-4 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-muted-foreground">
            Hinataw.exe · clay-soft streaming · built with Convex, React and HLS
          </p>
          <p className="text-xs text-muted-foreground">
            Admin studio access is private — guests stream, admins publish.
          </p>
        </div>
      </footer>
    </div>
  );
}
