import { v } from "convex/values";
import { api } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";
import { requireAdmin } from "./admin";

/**
 * Upload + link handling for the Hinataw.exe studio.
 *
 * Files go straight to Convex file storage (a signed upload URL + PUT from the
 * browser, so progress/retry/resume live entirely on the client). Larger
 * production libraries should point `API_VIDEO_API_KEY` at api.video, which
 * transcodes into 480p/720p/1080p HLS automatically (see ./videos.ts).
 */

export const VIDEO_EXTENSIONS = [
  ".mp4",
  ".m4v",
  ".mov",
  ".webm",
  ".mkv",
  ".m3u8",
] as const;

export const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"] as const;

export function isVideoFile(name: string, mimeType?: string) {
  const lower = name.toLowerCase();
  if (mimeType?.startsWith("video/")) return true;
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function isImageFile(name: string, mimeType?: string) {
  const lower = name.toLowerCase();
  if (mimeType?.startsWith("image/")) return true;
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** Admin-only: signed Convex storage upload target. */
export const createUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Resolve a stored file id back into a servable URL (admin previews). */
export const fileUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId as never);
  },
});

const DRIVE_FILE = /drive\.google\.com\/file\/d\/([^/]+)/;
const DRIVE_OPEN = /drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([^&]+)/;

export type LinkInspection = {
  ok: boolean;
  kind: "hls" | "file";
  directUrl: string;
  host: string;
  notes: string[];
};

/**
 * Validate + normalise an admin-pasted stream link (Google Drive links are
 * rewritten to their direct-download form). Rejects anything non-http(s).
 */
export const inspectLink = action({
  args: { url: v.string() },
  handler: async (ctx, args): Promise<LinkInspection> => {
    const me = await ctx.runQuery(api.admin.me, {});
    if (!me?.isAdmin) {
      throw new Error("Admin access required. Unlock the studio from the profile page.");
    }
    const raw = args.url.trim();
    const notes: string[] = [];

    if (!raw) {
      return { ok: false, kind: "file", directUrl: "", host: "", notes: ["Paste a link first."] };
    }

    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      return {
        ok: false,
        kind: "file",
        directUrl: raw,
        host: "",
        notes: ["That is not a valid URL — include https://"],
      };
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return {
        ok: false,
        kind: "file",
        directUrl: raw,
        host: parsed.hostname,
        notes: ["Only http(s) links are accepted."],
      };
    }

    const driveId = raw.match(DRIVE_FILE)?.[1] ?? raw.match(DRIVE_OPEN)?.[1];
    if (driveId) {
      notes.push("Google Drive link converted to a direct stream URL.");
      notes.push(
        "Drive throttles large files — for 1 GB+ uploads use a file upload or api.video instead.",
      );
      return {
        ok: true,
        kind: "file",
        directUrl: `https://drive.google.com/uc?export=download&id=${driveId}`,
        host: parsed.hostname,
        notes,
      };
    }

    if (parsed.pathname.toLowerCase().endsWith(".m3u8")) {
      notes.push("HLS manifest detected — adaptive quality will be read from the playlist.");
      return { ok: true, kind: "hls", directUrl: raw, host: parsed.hostname, notes };
    }

    if (parsed.hostname === "drive.google.com") {
      notes.push("Share the file as “Anyone with the link” or playback will fail.");
    } else {
      notes.push("Direct video link — the player will stream it natively.");
    }

    return { ok: true, kind: "file", directUrl: raw, host: parsed.hostname, notes };
  },
});
