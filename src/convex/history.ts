import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";

/**
 * Watch history powers "Continue Watching" and resume-from-last-position.
 * Guests are anonymous Convex Auth users, so their history is stored per user id.
 */

const NEARLY_DONE = 0.94;

async function loadHistory(ctx: QueryCtx, userId: Id<"users">) {
  const rows = await ctx.db
    .query("watchHistory")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .order("desc")
    .collect();

  const enriched = await Promise.all(
    rows.map(async (row) => {
      const series = await ctx.db.get(row.seriesId);
      const episode = await ctx.db.get(row.episodeId);
      if (!series || !episode) return null;
      const duration =
        row.durationSeconds || episode.durationSeconds || 0;
      const progress = duration > 0 ? Math.min(row.positionSeconds / duration, 1) : 0;
      return {
        _id: row._id,
        series,
        episode,
        positionSeconds: row.positionSeconds,
        durationSeconds: duration,
        progress,
        updatedAt: row.updatedAt,
      };
    }),
  );

  return enriched.filter((row): row is NonNullable<typeof row> => row !== null);
}

export const continueWatching = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await loadHistory(ctx, userId);

    const seenSeries = new Set<string>();
    const result: Awaited<ReturnType<typeof loadHistory>> = [];
    for (const row of rows) {
      // one card per series — the most recently watched episode wins
      if (seenSeries.has(row.series._id)) continue;
      if (row.progress >= NEARLY_DONE) continue;
      seenSeries.add(row.series._id);
      result.push(row);
      if (result.length >= (args.limit ?? 10)) break;
    }
    return result;
  },
});

export const recentlyWatched = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await loadHistory(ctx, userId);
    return rows.slice(0, args.limit ?? 24);
  },
});

/** Resume position for a single episode (used by the player). */
export const resumePoint = query({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db
      .query("watchHistory")
      .withIndex("by_user_episode", (q) =>
        q.eq("userId", userId).eq("episodeId", args.episodeId),
      )
      .unique();
    if (!row) return null;
    if (row.positionSeconds < 10) return null;
    return {
      positionSeconds: row.positionSeconds,
      durationSeconds: row.durationSeconds ?? 0,
      updatedAt: row.updatedAt,
    };
  },
});

export const recordProgress = mutation({
  args: {
    episodeId: v.id("episodes"),
    seriesId: v.id("series"),
    positionSeconds: v.number(),
    durationSeconds: v.optional(v.number()),
    episodeNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const now = Date.now();
    const existing = await ctx.db
      .query("watchHistory")
      .withIndex("by_user_episode", (q) =>
        q.eq("userId", userId).eq("episodeId", args.episodeId),
      )
      .unique();

    const duration = args.durationSeconds ?? 0;
    const completed = duration > 0 && args.positionSeconds / duration >= NEARLY_DONE;

    const patch = {
      userId,
      seriesId: args.seriesId,
      episodeId: args.episodeId,
      episodeNumber: args.episodeNumber,
      positionSeconds: Math.max(0, Math.round(args.positionSeconds)),
      durationSeconds: duration || undefined,
      completed,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("watchHistory", patch);
  },
});

export const removeEntry = mutation({
  args: { historyId: v.id("watchHistory") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { ok: false };
    const row = await ctx.db.get(args.historyId);
    if (!row || row.userId !== userId) return { ok: false };
    await ctx.db.delete(args.historyId);
    return { ok: true };
  },
});

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { ok: false };
    const rows = await ctx.db
      .query("watchHistory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
    return { ok: true, removed: rows.length };
  },
});
