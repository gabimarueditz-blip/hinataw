import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

/* ------------------------------------------------------------------ */
/* Hinataw.exe domain validators                                       */
/* ------------------------------------------------------------------ */

export const contentTypeValidator = v.union(
  v.literal("anime"),
  v.literal("movie"),
);

export const publishStatusValidator = v.union(
  v.literal("published"),
  v.literal("draft"),
);

export const qualityValidator = v.object({
  label: v.string(), // "480p" | "720p" | "1080p" | "Auto"
  url: v.string(),
});

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
      displayName: v.optional(v.string()),
      unlockedAdminAt: v.optional(v.number()),
    }).index("email", ["email"]), // index for the email. do not remove or modify

    /* -------------------------------------------------------------- */
    /* Content                                                         */
    /* -------------------------------------------------------------- */

    series: defineTable({
      title: v.string(),
      type: contentTypeValidator,
      genres: v.array(v.string()),
      description: v.string(),
      posterUrl: v.optional(v.string()),
      backdropUrl: v.optional(v.string()),
      accent: v.optional(v.number()), // hue (0-360) used for clay poster art
      year: v.optional(v.number()),
      rating: v.optional(v.number()),
      trending: v.optional(v.boolean()),
      publishStatus: publishStatusValidator,
      createdBy: v.optional(v.id("users")),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_status", ["publishStatus"])
      .index("by_status_type", ["publishStatus", "type"])
      .searchIndex("search_title", {
        searchField: "title",
        filterFields: ["publishStatus", "type"],
      }),

    episodes: defineTable({
      seriesId: v.id("series"),
      episodeNumber: v.number(),
      title: v.string(),
      description: v.optional(v.string()),
      /** playable source: storage URL, HLS manifest, or direct mp4 link */
      videoUrl: v.string(),
      /** HLS manifest when the source was transcoded */
      hlsUrl: v.optional(v.string()),
      /** per-quality variants exposed in the player quality menu */
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
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_series", ["seriesId", "episodeNumber"])
      .searchIndex("search_episode_title", {
        searchField: "title",
        filterFields: ["publishStatus"],
      }),

    /* -------------------------------------------------------------- */
    /* Watch history (Continue Watching)                               */
    /* -------------------------------------------------------------- */

    watchHistory: defineTable({
      userId: v.id("users"),
      seriesId: v.id("series"),
      episodeId: v.id("episodes"),
      episodeNumber: v.optional(v.number()),
      positionSeconds: v.number(),
      durationSeconds: v.optional(v.number()),
      completed: v.optional(v.boolean()),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId", "updatedAt"])
      .index("by_user_episode", ["userId", "episodeId"]),

    /** lightweight audit trail for admin sign-ins / content changes */
    activity: defineTable({
      userId: v.optional(v.id("users")),
      actor: v.string(),
      action: v.string(),
      target: v.optional(v.string()),
      createdAt: v.number(),
    }).index("by_created", ["createdAt"]),

    /* -------------------------------------------------------------- */
    /* Donations (Razorpay)                                            */
    /* -------------------------------------------------------------- */

    donations: defineTable({
      userId: v.id("users"),
      orderId: v.string(),
      paymentId: v.optional(v.string()),
      amountInRupees: v.number(),
      currency: v.string(),
      status: v.union(
        v.literal("created"),
        v.literal("paid"),
        v.literal("cancelled"),
      ),
      note: v.optional(v.string()),
      donorName: v.optional(v.string()),
      razorpaySignatureVerified: v.optional(v.boolean()),
      createdAt: v.number(),
      paidAt: v.optional(v.number()),
    }).index("by_order", ["orderId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
