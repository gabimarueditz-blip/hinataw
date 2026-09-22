import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

/**
 * Admin console access for Hinataw.exe.
 *
 * Guests sign in anonymously first (that is the "Guest Login" button), then an
 * admin unlocks the studio with the admin ID + password, verified server-side
 * against the `ADMIN_ID` / `ADMIN_PASSWORD` Convex env vars. There are no
 * built-in credentials: until those vars are set in the Keys tab, admin login
 * stays disabled. On success the user's role is promoted to `admin`, and every
 * admin mutation re-checks that role.
 */

/** length-safe, timing-resistant comparison of two short strings */
function matches(input: string, expected: string) {
  const a = input.trim();
  if (a.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/** Throws unless the caller is a signed-in admin. Use in every admin mutation. */
export async function requireAdmin(ctx: MutationCtx | QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("You must be signed in to use the studio.");
  }
  const user = await ctx.db.get(userId);
  if (!user || user.role !== "admin") {
    throw new Error("Admin access required. Unlock the studio from the profile page.");
  }
  return user;
}

export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return false;
    const user = await ctx.db.get(userId);
    return user?.role === "admin";
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name ?? user.displayName ?? null,
      email: user.email ?? null,
      isGuest: Boolean(user.isAnonymous),
      isAdmin: user.role === "admin",
      unlockedAdminAt: user.unlockedAdminAt ?? null,
    };
  },
});

export const adminLogin = mutation({
  args: { adminId: v.string(), password: v.string() },
  handler: async (ctx, { adminId, password }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Start a guest session first, then unlock the studio.");
    }

    const expectedId = process.env.ADMIN_ID?.trim();
    const expectedPassword = process.env.ADMIN_PASSWORD;

    if (!expectedId || !expectedPassword) {
      throw new Error(
        "Admin login is not configured yet. Set ADMIN_ID and ADMIN_PASSWORD in the Keys tab.",
      );
    }

    if (!matches(adminId, expectedId) || !matches(password, expectedPassword)) {
      await ctx.db.insert("activity", {
        userId,
        actor: "unknown",
        action: "admin login rejected",
        createdAt: Date.now(),
      });
      throw new Error("Invalid admin ID or password.");
    }

    const now = Date.now();
    await ctx.db.patch(userId, { role: "admin", unlockedAdminAt: now });
    await ctx.db.insert("activity", {
      userId,
      actor: "admin",
      action: "admin unlocked studio",
      createdAt: now,
    });

    return { ok: true };
  },
});

/** Drop back to guest privileges on this device. */
export const lockAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return { ok: false };
    await ctx.db.patch(userId, { role: "user", unlockedAdminAt: undefined });
    await ctx.db.insert("activity", {
      userId,
      actor: "admin",
      action: "admin locked studio",
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const recentActivity = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") return [];
    return await ctx.db.query("activity").withIndex("by_created").order("desc").take(12);
  },
});
