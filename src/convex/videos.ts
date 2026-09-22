import { v } from "convex/values";
import { action } from "./_generated/server";

/**
 * Stream processing helpers.
 *
 * `analyzeStream` inspects an admin-pasted link and extracts the real adaptive
 * quality ladder from an HLS master playlist (480p / 720p / 1080p ...), so the
 * player's quality menu reflects the actual renditions.
 *
 * `ingestWithApiVideo` / `apiVideoStatus` turn on automatic transcoding for
 * 1 GB+ uploads when `API_VIDEO_API_KEY` is present in the Convex environment.
 */

const API_VIDEO_BASE = "https://ws.api.video";

type Quality = { label: string; url: string };

function labelFor(height: number | undefined, bandwidth: number | undefined) {
  if (height) {
    if (height >= 2000) return "2160p";
    if (height >= 1000) return "1080p";
    if (height >= 680) return "720p";
    if (height >= 440) return "480p";
    return `${height}p`;
  }
  if (bandwidth) return `${Math.round(bandwidth / 1000)}kbps`;
  return "Auto";
}

export const analyzeStream = action({
  args: { url: v.string() },
  handler: async (_ctx, args) => {
    const url = args.url.trim();
    if (!/^https?:\/\//i.test(url)) {
      throw new Error("Stream links must start with http(s)://");
    }

    let response: Response;
    try {
      response = await fetch(url, { headers: { Accept: "*/*" } });
    } catch {
      throw new Error(
        "Could not reach that link. Check the URL, or use a direct file upload instead.",
      );
    }

    if (!response.ok) {
      throw new Error(`The host replied with ${response.status} for that link.`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    const looksHls =
      url.toLowerCase().includes(".m3u8") ||
      contentType.includes("mpegurl") ||
      contentType.includes("x-mpegURL");

    if (!looksHls) {
      return {
        kind: "file" as const,
        hlsUrl: undefined,
        qualities: [] as Quality[],
        message: "Direct video file detected — streaming natively with resume support.",
      };
    }

    const text = (await response.text()).slice(0, 200_000);
    if (!text.includes("#EXTM3U")) {
      throw new Error("That link is not a valid HLS playlist.");
    }

    if (!text.includes("#EXT-X-STREAM-INF")) {
      return {
        kind: "hls" as const,
        hlsUrl: url,
        qualities: [{ label: "Auto", url }],
        message: "Single-rendition HLS playlist — adaptive quality unavailable, using Auto.",
      };
    }

    const lines = text.split(/\r?\n/);
    const qualities: Quality[] = [{ label: "Auto", url }];
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line.startsWith("#EXT-X-STREAM-INF")) continue;
      const uri = lines[i + 1]?.trim();
      if (!uri || uri.startsWith("#")) continue;
      const height = Number(line.match(/RESOLUTION=\d+x(\d+)/)?.[1]) || undefined;
      const bandwidth = Number(line.match(/BANDWIDTH=(\d+)/)?.[1]) || undefined;
      const resolved = new URL(uri, url).toString();
      const label = labelFor(height, bandwidth);
      if (!qualities.some((q) => q.label === label)) {
        qualities.push({ label, url: resolved });
      }
    }

    qualities.splice(
      1,
      qualities.length - 1,
      ...qualities.slice(1).sort((a, b) => parseInt(b.label) - parseInt(a.label)),
    );

    return {
      kind: "hls" as const,
      hlsUrl: url,
      qualities,
      message: `Adaptive HLS ready with ${qualities.length - 1} renditions.`,
    };
  },
});

function apiVideoKey() {
  const key = process.env.API_VIDEO_API_KEY;
  if (!key) {
    throw new Error(
      "Automatic transcoding is off. Add API_VIDEO_API_KEY in the project's Keys tab, or upload a file / use an existing HLS link.",
    );
  }
  return key;
}

type ApiVideoPayload = {
  videoId: string;
  title?: string;
  status?: string;
  hlsUrl: string;
  playerUrl: string;
};

/** Hand a link to api.video; it downloads, transcodes to HLS, then serves via CDN. */
export const ingestWithApiVideo = action({
  args: { title: v.string(), url: v.string() },
  handler: async (_ctx, args): Promise<ApiVideoPayload> => {
    const key = apiVideoKey();
    const response = await fetch(`${API_VIDEO_BASE}/videos`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: args.title, source: args.url }),
    });
    if (!response.ok) {
      throw new Error(`api.video rejected the link (${response.status}).`);
    }
    const video = (await response.json()) as { videoId: string; title?: string; status?: string };
    return {
      videoId: video.videoId,
      title: video.title,
      status: video.status,
      hlsUrl: `https://vod.api.video/vod/${video.videoId}/hls/manifest.m3u8`,
      playerUrl: `https://embed.api.video/vod/${video.videoId}`,
    };
  },
});

/** Poll transcode progress for an api.video asset. */
export const apiVideoStatus = action({
  args: { videoId: v.string() },
  handler: async (_ctx, args): Promise<ApiVideoPayload & { encoding: boolean }> => {
    const key = apiVideoKey();
    const response = await fetch(`${API_VIDEO_BASE}/videos/${args.videoId}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!response.ok) {
      throw new Error(`api.video status check failed (${response.status}).`);
    }
    const video = (await response.json()) as {
      videoId: string;
      title?: string;
      status?: string;
    };
    return {
      videoId: video.videoId,
      title: video.title,
      status: video.status,
      hlsUrl: `https://vod.api.video/vod/${video.videoId}/hls/manifest.m3u8`,
      playerUrl: `https://embed.api.video/vod/${video.videoId}`,
      encoding: video.status === "processing" || video.status === "uploading",
    };
  },
});
