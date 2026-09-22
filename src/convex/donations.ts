import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Razorpay donations for Hinataw.exe.
 *
 * Flow: the frontend calls `createDonationOrder` (keys live in the Convex env,
 * never in the bundle) → Razorpay Checkout opens in the browser →
 * `verifyDonation` checks the checkout signature server-side before the
 * donation counts. A `razorpaySignatureVerified` flag keeps unverified rows
 * out of totals.
 */

/** Razorpay expects amounts in paise (integer). */
const MIN_AMOUNT_RUPEES = 1;
const MAX_AMOUNT_RUPEES = 100_000;

/* ------------------------------- config ---------------------------------- */

function razorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error(
      "Donations are not configured yet. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the Keys tab.",
    );
  }
  return { keyId, keySecret };
}

/** Base64 without Node's Buffer (the Convex V8 runtime has no Buffer). */
const B64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function base64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = bytes[i + 1];
    const b3 = bytes[i + 2];
    out += B64_ALPHABET[b1 >> 2];
    out += B64_ALPHABET[((b1 & 3) << 4) | ((b2 ?? 0) >> 4)];
    out += b2 === undefined ? "=" : B64_ALPHABET[((b2 & 15) << 2) | ((b3 ?? 0) >> 6)];
    out += b3 === undefined ? "=" : B64_ALPHABET[b3 & 63];
  }
  return out;
}

/** HMAC-SHA256 hex digest via Web Crypto (available in Convex mutations). */
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Call the Razorpay Orders API with basic auth. */
async function razorpayFetch(path: string, init?: RequestInit) {
  const { keyId, keySecret } = razorpayConfig();
  const auth = base64(`${keyId}:${keySecret}`);
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Razorpay request failed (${response.status}). ${detail.slice(0, 160)}`,
    );
  }
  return (await response.json()) as Record<string, unknown>;
}

/* ------------------------------- actions --------------------------------- */

export const createDonationOrder = action({
  args: { amountInRupees: v.number() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Sign in first, then donate.");
    const user = await ctx.runQuery(api.users.currentUser);

    const amount = Math.round(args.amountInRupees);
    if (!Number.isFinite(amount) || amount < MIN_AMOUNT_RUPEES) {
      throw new Error("Minimum donation is ₹1.");
    }
    if (amount > MAX_AMOUNT_RUPEES) {
      throw new Error("For very large amounts, please contact the studio directly.");
    }

    const { keyId } = razorpayConfig();
    const receipt = `hinataw_${Date.now()}_${userId.slice(-6)}`;

    const order = (await razorpayFetch("/orders", {
      method: "POST",
      body: JSON.stringify({
        amount: amount * 100, // paise
        currency: "INR",
        receipt,
        notes: { app: "Hinataw.exe", donor: user?.email ?? "guest" },
      }),
    })) as { id: string; amount: number; currency: string };

    await ctx.runMutation(internal.donations.recordOrder, {
      userId,
      orderId: order.id,
      amountInRupees: amount,
      currency: order.currency,
    });

    return {
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    };
  },
});

/* ------------------------- internal bookkeeping --------------------------- */

export const recordOrder = internalMutation({
  args: {
    userId: v.id("users"),
    orderId: v.string(),
    amountInRupees: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("donations", {
      userId: args.userId,
      orderId: args.orderId,
      amountInRupees: args.amountInRupees,
      currency: args.currency,
      status: "created",
      createdAt: Date.now(),
    });
  },
});

/* ------------------------------- mutations -------------------------------- */

export const verifyDonation = mutation({
  args: {
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.string(),
    razorpaySignature: v.string(),
    donorName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Sign in first.");

    const { keySecret } = razorpayConfig();
    const expected = await hmacSha256Hex(
      keySecret,
      `${args.razorpayOrderId}|${args.razorpayPaymentId}`,
    );

    if (expected !== args.razorpaySignature) {
      throw new Error("Payment signature mismatch — donation not recorded.");
    }

    const donation = await ctx.db
      .query("donations")
      .withIndex("by_order", (q) => q.eq("orderId", args.razorpayOrderId))
      .unique();
    if (!donation) throw new Error("Unknown donation order.");
    if (donation.userId !== userId) throw new Error("Donation belongs to another session.");

    await ctx.db.patch(donation._id, {
      status: "paid",
      paymentId: args.razorpayPaymentId,
      razorpaySignatureVerified: true,
      donorName: args.donorName ?? donation.donorName,
      paidAt: Date.now(),
    });
    return { ok: true };
  },
});

/** Best-effort bookkeeping when the user closes the checkout without paying. */
export const cancelDonation = mutation({
  args: { razorpayOrderId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;
    const donation = await ctx.db
      .query("donations")
      .withIndex("by_order", (q) => q.eq("orderId", args.razorpayOrderId))
      .unique();
    if (donation && donation.userId === userId && donation.status === "created") {
      await ctx.db.patch(donation._id, { status: "cancelled" });
    }
  },
});

/* -------------------------------- queries -------------------------------- */

/** Totals + recent donors for the thank-you strip (only verified donations). */
export const donationStats = query({
  args: {},
  handler: async (ctx) => {
    const donations = await ctx.db
      .query("donations")
      .filter((q) => q.eq(q.field("razorpaySignatureVerified"), true))
      .order("desc")
      .take(50);

    const total = donations.reduce((sum, d) => sum + d.amountInRupees, 0);
    return {
      totalInRupees: total,
      count: donations.length,
      recent: donations.slice(0, 8).map((d) => ({
        donorName: d.donorName ?? "Anonymous",
        amountInRupees: d.amountInRupees,
        paidAt: d.paidAt ?? d.createdAt,
      })),
    };
  },
});
