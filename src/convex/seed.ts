import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Demo library so a fresh deployment is never an empty shell.
 * Runs once (no-op as soon as any series exists) and is safe to call on load.
 */

const HLS_MAIN = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
const HLS_ALT = "https://test-streams.mux.dev/pts_shift/master.m3u8";
const mp4 = (name: string) =>
  `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/${name}`;

type Seed = {
  title: string;
  type: "anime" | "movie";
  genres: string[];
  description: string;
  accent: number;
  year: number;
  rating: number;
  trending?: boolean;
  episodeTitles: string[];
  sources: { url: string; hls?: boolean; duration: number }[];
};

const CATALOG: Seed[] = [
  {
    title: "Hinata Protocol",
    type: "anime",
    genres: ["Action", "Sci-Fi"],
    description:
      "A courier with a shattered memory discovers her bloodline boots a machine that rewrites the city every night. Twelve episodes of neon-soaked momentum.",
    accent: 342,
    year: 2026,
    rating: 9.1,
    trending: true,
    episodeTitles: ["Boot Sequence", "Ghost in the Rail", "Midnight Recompile"],
    sources: [
      { url: HLS_MAIN, hls: true, duration: 596 },
      { url: HLS_MAIN, hls: true, duration: 588 },
      { url: HLS_ALT, hls: true, duration: 602 },
    ],
  },
  {
    title: "Clay Garden Days",
    type: "anime",
    genres: ["Slice of Life", "Comedy"],
    description:
      "Four ceramicists share a studio, one kiln, and far too many feelings. A soft, warm series about making things with your hands.",
    accent: 172,
    year: 2025,
    rating: 8.4,
    episodeTitles: ["First Glaze", "Kiln Night", "The Second Firing"],
    sources: [
      { url: mp4("ElephantsDream.mp4"), duration: 653 },
      { url: mp4("ForBiggerJoyrides.mp4"), duration: 15 },
      { url: mp4("ForBiggerMeltdowns.mp4"), duration: 15 },
    ],
  },
  {
    title: "Steel Hour",
    type: "movie",
    genres: ["Action", "Thriller"],
    description:
      "A retired stunt driver has one hour of city left before the blackout, and a passenger who cannot be delivered. Shot in a single continuous run.",
    accent: 236,
    year: 2026,
    rating: 8.8,
    trending: true,
    episodeTitles: ["Feature Film"],
    sources: [{ url: mp4("TearsOfSteel.mp4"), duration: 734 }],
  },
  {
    title: "Lantern Sea",
    type: "anime",
    genres: ["Fantasy", "Adventure"],
    description:
      "Every hundred years the lantern sea rises and takes one village's memory with it. This time, a lighthouse keeper swims after it.",
    accent: 300,
    year: 2025,
    rating: 8.9,
    trending: true,
    episodeTitles: ["Low Tide", "The Drowned Bell", "A Hundred Years of Light"],
    sources: [
      { url: HLS_MAIN, hls: true, duration: 612 },
      { url: mp4("BigBuckBunny.mp4"), duration: 596 },
      { url: mp4("Sintel.mp4"), duration: 888 },
    ],
  },
  {
    title: "Midnight Ramen Club",
    type: "anime",
    genres: ["Slice of Life", "Drama"],
    description:
      "An underground noodle bar opens at 1 a.m. for people who cannot sleep. Their orders tell you everything about their lives.",
    accent: 62,
    year: 2026,
    rating: 8.2,
    episodeTitles: ["Extra Chashu", "Cold Night, Hot Broth", "Last Table"],
    sources: [
      { url: mp4("ForBiggerBlazes.mp4"), duration: 15 },
      { url: mp4("ForBiggerEscapes.mp4"), duration: 15 },
      { url: mp4("ForBiggerFun.mp4"), duration: 15 },
    ],
  },
  {
    title: "Signal Lost",
    type: "movie",
    genres: ["Sci-Fi", "Mystery"],
    description:
      "A deep-space relay technician hears her own voice arrive four days early. Then she hears it again, angrier.",
    accent: 268,
    year: 2024,
    rating: 8.6,
    episodeTitles: ["Feature Film"],
    sources: [{ url: HLS_ALT, hls: true, duration: 641 }],
  },
  {
    title: "Pocket Kaiju",
    type: "anime",
    genres: ["Comedy", "Fantasy"],
    description:
      "A monster the size of a teacup moves into a Tokyo apartment and refuses to be a metaphor. Household chaos, giant feelings.",
    accent: 200,
    year: 2026,
    rating: 8.1,
    episodeTitles: ["Move-In Day", "Tiny Tantrum", "Kaiju Diet"],
    sources: [
      { url: mp4("ForBiggerJoyrides.mp4"), duration: 15 },
      { url: mp4("ForBiggerMeltdowns.mp4"), duration: 15 },
      { url: mp4("SubaruOutbackOnStreetAndDirt.mp4"), duration: 594 },
    ],
  },
  {
    title: "Rooftop Physics",
    type: "anime",
    genres: ["Romance", "Drama"],
    description:
      "Two runaways test homemade gliders above Osaka. Gravity keeps interrupting the confession they both rehearsed.",
    accent: 350,
    year: 2025,
    rating: 8.7,
    episodeTitles: ["Lift", "Stall", "Glide"],
    sources: [
      { url: mp4("Sintel.mp4"), duration: 888 },
      { url: HLS_MAIN, hls: true, duration: 604 },
      { url: mp4("ElephantsDream.mp4"), duration: 653 },
    ],
  },
  {
    title: "The Porcelain Detective",
    type: "movie",
    genres: ["Mystery", "Drama"],
    description:
      "A lacquer artist is hired to restore a shattered dinner set and finds a murder hidden in the repairs.",
    accent: 24,
    year: 2024,
    rating: 8.3,
    episodeTitles: ["Feature Film"],
    sources: [{ url: mp4("ElephantsDream.mp4"), duration: 653 }],
  },
  {
    title: "Zero Buffering",
    type: "movie",
    genres: ["Documentary", "Tech"],
    description:
      "Inside the engineer team that keeps millions of streams alive during a season finale. A documentary about the invisible work.",
    accent: 158,
    year: 2026,
    rating: 7.9,
    episodeTitles: ["Feature Film"],
    sources: [{ url: HLS_MAIN, hls: true, duration: 599 }],
  },
];

export const ensureDemoContent = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("series").take(1);
    if (existing.length > 0) return { seeded: false, series: 0 };

    const now = Date.now();
    let index = 0;
    for (const item of CATALOG) {
      const createdAt = now - index * 3_600_000;
      const seriesId: Id<"series"> = await ctx.db.insert("series", {
        title: item.title,
        type: item.type,
        genres: item.genres,
        description: item.description,
        accent: item.accent,
        year: item.year,
        rating: item.rating,
        trending: item.trending ?? false,
        publishStatus: "published",
        createdAt,
        updatedAt: createdAt,
      });

      for (let i = 0; i < item.sources.length; i += 1) {
        const source = item.sources[i];
        await ctx.db.insert("episodes", {
          seriesId,
          episodeNumber: i + 1,
          title: item.episodeTitles[i] ?? `Episode ${i + 1}`,
          description:
            item.type === "movie"
              ? item.description
              : `Episode ${i + 1} — ${item.episodeTitles[i] ?? ""}`,
          videoUrl: source.url,
          hlsUrl: source.hls ? source.url : undefined,
          qualities: [{ label: "Auto", url: source.url }],
          sourceKind: source.hls ? "hls" : "link",
          durationSeconds: source.duration,
          publishStatus: "published",
          createdAt,
          updatedAt: createdAt,
        });
      }
      index += 1;
    }

    return { seeded: true, series: CATALOG.length };
  },
});
