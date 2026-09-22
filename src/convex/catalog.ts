import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireAdmin } from "./admin";
import {
  contentTypeValidator,
  publishStatusValidator,
  qualityValidator,
} from "./schema";

const sortValidator = v.union(
  v.literal("latest"),
  v.literal("trending"),
  v.literal("top"),
  v.literal("az"),
);

type Sort = "latest" | "trending" | "top" | "az";

type SeriesRow = Doc<"series">;

function sortSeries(rows: SeriesRow[], sort: Sort) {
  const list = [...rows];
  switch (sort) {
    case "trending":
      return list.sort(
        (a, b) =>
          Number(Boolean(b.trending)) - Number(Boolean(a.trending)) ||
          (b.rating ?? 0) - (a.rating ?? 0),
      );
    case "top":
      return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case "az":
      return list.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return list.sort((a, b) => b.createdAt - a.createdAt);
  }
}

/* ------------------------------------------------------------------ */
/* Public catalog                                                      */
/* ------------------------------------------------------------------ */

/** Everything a guest can browse: published content only, unless admin. */
export const browse = query({
  args: {
    q: v.optional(v.string()),
    type: v.optional(contentTypeValidator),
    genre: v.optional(v.string()),
    sort: v.optional(sortValidator),
    limit: v.optional(v.number()),
    includeDrafts: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const sort = (args.sort ?? "latest") as Sort;
    const limit = args.limit ?? 60;
    const term = args.q?.trim();

    let rows: SeriesRow[];
    if (term) {
      rows = await ctx.db
        .query("series")
        .withSearchIndex("search_title", (q) => {
          const s = q.search("title", term);
          return args.type ? s.eq("type", args.type) : s;
        })
        .take(limit);
      if (!args.includeDrafts) {
        rows = rows.filter((row) => row.publishStatus === "published");
      }
    } else {
      rows = await ctx.db.query("series").collect();
      if (!args.includeDrafts) {
        rows = rows.filter((row) => row.publishStatus === "published");
      }
      if (args.type) rows = rows.filter((row) => row.type === args.type);
    }

    if (args.genre) {
      const genre = args.genre.toLowerCase();
      rows = rows.filter((row: SeriesRow) =>
        row.genres.some((item) => item.toLowerCase() === genre),
      );
    }

    return sortSeries(rows, sort).slice(0, limit);
  },
});

/** Episode-title search (blueprint: search anime / movie / episode names). */
export const searchEpisodes = query({
  args: { q: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const term = args.q.trim();
    if (!term) return [];
    const episodes = await ctx.db
      .query("episodes")
      .withSearchIndex("search_episode_title", (q) =>
        q.search("title", term).eq("publishStatus", "published"),
      )
      .take(args.limit ?? 12);

    return await Promise.all(
      episodes.map(async (episode) => {
        const series = await ctx.db.get(episode.seriesId);
        return {
          _id: episode._id,
          title: episode.title,
          episodeNumber: episode.episodeNumber,
          durationSeconds: episode.durationSeconds,
          publishStatus: episode.publishStatus,
          seriesId: episode.seriesId,
          seriesTitle: series?.title ?? "Unknown series",
        };
      }),
    );
  },
});

export const featured = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("series")
      .withIndex("by_status", (q) => q.eq("publishStatus", "published"))
      .collect();
    return sortSeries(rows, "trending").slice(0, 5);
  },
});

export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("series")
      .withIndex("by_status", (q) => q.eq("publishStatus", "published"))
      .collect();
    return sortSeries(rows, "latest").slice(0, args.limit ?? 12);
  },
});

export const genres = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("series")
      .withIndex("by_status", (q) => q.eq("publishStatus", "published"))
      .collect();
    const counts = new Map<string, number>();
    for (const row of rows) {
      for (const genre of row.genres) {
        counts.set(genre, (counts.get(genre) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  },
});

/** Series detail (poster, description, episode list). */
export const getSeries = query({
  args: { seriesId: v.id("series") },
  handler: async (ctx, args) => {
    const series = await ctx.db.get(args.seriesId);
    if (!series) return null;

    const allEpisodes = await ctx.db
      .query("episodes")
      .withIndex("by_series", (q) => q.eq("seriesId", args.seriesId))
      .collect();
    const episodes = allEpisodes
      .filter((episode) => episode.publishStatus === "published")
      .sort((a, b) => a.episodeNumber - b.episodeNumber);

    if (series.publishStatus !== "published" && episodes.length === 0) {
      return { series, episodes: [] };
    }

    return { series, episodes };
  },
});

/** Series + full episode list, drafts included — for the admin studio. */
export const adminSeries = query({
  args: { seriesId: v.id("series") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const series = await ctx.db.get(args.seriesId);
    if (!series) return null;
    const episodes = await ctx.db
      .query("episodes")
      .withIndex("by_series", (q) => q.eq("seriesId", args.seriesId))
      .collect();
    return {
      series,
      episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber),
    };
  },
});

export const getEpisode = query({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, args) => {
    const episode = await ctx.db.get(args.episodeId);
    if (!episode) return null;
    const series = await ctx.db.get(episode.seriesId);
    const siblings = await ctx.db
      .query("episodes")
      .withIndex("by_series", (q) => q.eq("seriesId", episode.seriesId))
      .collect();
    return {
      episode,
      series,
      siblings: siblings
        .filter((item) => item.publishStatus === "published")
        .sort((a, b) => a.episodeNumber - b.episodeNumber),
    };
  },
});

export const studioOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const series = await ctx.db.query("series").collect();
    const episodes = await ctx.db.query("episodes").collect();
    const history = await ctx.db.query("watchHistory").collect();
    return {
      series: series.sort((a, b) => b.updatedAt - a.updatedAt),
      episodeCounts: episodes.reduce<Record<string, number>>((acc, episode) => {
        acc[episode.seriesId] = (acc[episode.seriesId] ?? 0) + 1;
        return acc;
      }, {}),
      totals: {
        series: series.length,
        published: series.filter((s) => s.publishStatus === "published").length,
        drafts: series.filter((s) => s.publishStatus === "draft").length,
        episodes: episodes.length,
        minutesStreamed: Math.round(
          history.reduce((sum, row) => sum + row.positionSeconds, 0) / 60,
        ),
      },
    };
  },
});

/* ------------------------------------------------------------------ */
/* Admin mutations                                                     */
/* ------------------------------------------------------------------ */

/**
 * Resolve an upload into a servable URL, rejecting files whose stored type
 * does not match the slot (blueprint: video/image file validation).
 */
async function resolveMediaUrl(
  ctx: MutationCtx,
  storageId: string | undefined,
  fallback: string | undefined,
  kind: "video" | "poster",
) {
  if (storageId) {
    const meta = await ctx.storage.getMetadata(storageId as Id<"_storage">);
    if (!meta) {
      throw new Error("That uploaded file could not be found — please upload it again.");
    }
    const contentType = meta.contentType ?? "";
    if (kind === "poster" && !contentType.startsWith("image/")) {
      throw new Error("Posters must be image files (jpg, png, webp).");
    }
    if (
      kind === "video" &&
      !contentType.startsWith("video/") &&
      contentType !== "application/octet-stream"
    ) {
      throw new Error("Episodes must be video files (mp4, webm, mov, m3u8).");
    }
    const url = await ctx.storage.getUrl(storageId as Id<"_storage">);
    if (url) return url;
  }
  return fallback;
}

export const saveSeries = mutation({
  args: {
    seriesId: v.optional(v.id("series")),
    title: v.string(),
    type: contentTypeValidator,
    genres: v.array(v.string()),
    description: v.string(),
    posterUrl: v.optional(v.string()),
    posterStorageId: v.optional(v.string()),
    accent: v.optional(v.number()),
    year: v.optional(v.number()),
    rating: v.optional(v.number()),
    trending: v.optional(v.boolean()),
    publishStatus: publishStatusValidator,
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const title = args.title.trim();
    if (title.length < 2) throw new Error("Give the series a title (2+ characters).");

    const posterUrl = await resolveMediaUrl(
      ctx,
      args.posterStorageId,
      args.posterUrl,
      "poster",
    );
    const genres = args.genres.map((g) => g.trim()).filter(Boolean);
    const now = Date.now();

    const patch = {
      title,
      type: args.type,
      genres,
      description: args.description.trim(),
      posterUrl,
      accent: args.accent ?? Math.round(Math.random() * 360),
      year: args.year,
      rating: args.rating,
      trending: args.trending ?? false,
      publishStatus: args.publishStatus,
      updatedAt: now,
    };

    if (args.seriesId) {
      await ctx.db.patch(args.seriesId, patch);
      return args.seriesId;
    }

    const seriesId = await ctx.db.insert("series", {
      ...patch,
      createdBy: admin._id,
      createdAt: now,
    });
    return seriesId;
  },
});

export const setSeriesStatus = mutation({
  args: {
    seriesId: v.id("series"),
    publishStatus: publishStatusValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.seriesId, {
      publishStatus: args.publishStatus,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

export const deleteSeries = mutation({
  args: { seriesId: v.id("series") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const episodes = await ctx.db
      .query("episodes")
      .withIndex("by_series", (q) => q.eq("seriesId", args.seriesId))
      .collect();
    for (const episode of episodes) {
      await ctx.db.delete(episode._id);
    }
    const history = await ctx.db.query("watchHistory").collect();
    for (const row of history.filter((item) => item.seriesId === args.seriesId)) {
      await ctx.db.delete(row._id);
    }
    await ctx.db.delete(args.seriesId);
    return { ok: true, removedEpisodes: episodes.length };
  },
});

export const saveEpisode = mutation({
  args: {
    episodeId: v.optional(v.id("episodes")),
    seriesId: v.id("series"),
    episodeNumber: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    videoStorageId: v.optional(v.string()),
    hlsUrl: v.optional(v.string()),
    qualities: v.optional(v.array(qualityValidator)),
    sourceKind: v.optional(
      v.union(
        v.literal("file"),
        v.literal("link"),
        v.literal("hls"),
        v.literal("api.video"),
      ),
    ),
    durationSeconds: v.optional(v.number()),
    thumbnailUrl: v.optional(v.string()),
    publishStatus: publishStatusValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const series = await ctx.db.get(args.seriesId);
    if (!series) throw new Error("That series no longer exists.");

    const videoUrl = await resolveMediaUrl(
      ctx,
      args.videoStorageId,
      args.videoUrl,
      "video",
    );
    if (!videoUrl) {
      throw new Error("Attach a video file or paste a stream link first.");
    }
    if (!/^https?:\/\//i.test(videoUrl) && !videoUrl.startsWith("/")) {
      throw new Error("That video link is not a valid http(s) URL.");
    }

    const now = Date.now();
    const patch = {
      seriesId: args.seriesId,
      episodeNumber: args.episodeNumber,
      title: args.title.trim() || `Episode ${args.episodeNumber}`,
      description: args.description?.trim(),
      videoUrl,
      hlsUrl: args.hlsUrl,
      qualities: args.qualities,
      sourceKind: args.sourceKind ?? (args.videoStorageId ? "file" : "link"),
      durationSeconds: args.durationSeconds,
      thumbnailUrl: args.thumbnailUrl,
      publishStatus: args.publishStatus,
      updatedAt: now,
    };

    if (args.episodeId) {
      await ctx.db.patch(args.episodeId, patch);
      await ctx.db.patch(args.seriesId, { updatedAt: now });
      return args.episodeId;
    }

    const episodeId = await ctx.db.insert("episodes", {
      ...patch,
      createdAt: now,
    });
    await ctx.db.patch(args.seriesId, { updatedAt: now });
    return episodeId;
  },
});

export const setEpisodeStatus = mutation({
  args: {
    episodeId: v.id("episodes"),
    publishStatus: publishStatusValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.episodeId, {
      publishStatus: args.publishStatus,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

export const deleteEpisode = mutation({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const history = await ctx.db.query("watchHistory").collect();
    for (const row of history.filter((item) => item.episodeId === args.episodeId)) {
      await ctx.db.delete(row._id);
    }
    await ctx.db.delete(args.episodeId);
    return { ok: true };
  },
});
