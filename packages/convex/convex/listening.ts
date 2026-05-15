import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery, query } from "./_generated/server";

const spotifyTokenUrl = "https://accounts.spotify.com/api/token";
const spotifyCurrentlyPlayingUrl = "https://api.spotify.com/v1/me/player/currently-playing";
const spotifyRecentlyPlayedUrl = "https://api.spotify.com/v1/me/player/recently-played?limit=1";

const BACKOFF_BASE_MS = 60_000;
const BACKOFF_MAX_MS = 30 * 60_000;

class SpotifyRateLimitError extends Error {
  retryAfterMs: number;
  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = "SpotifyRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

type SpotifyTrack = {
  external_urls?: {
    spotify?: unknown;
  };
  name?: unknown;
};

type CurrentlyPlayingResponse = {
  is_playing?: unknown;
  item?: unknown;
};

type RecentlyPlayedResponse = {
  items?: Array<{
    played_at?: unknown;
    track?: unknown;
  }>;
};

type SpotifyStatus = {
  trackName: string;
  spotifyUrl?: string;
  isPlaying: boolean;
  playedAt: number;
};

export const get = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      trackName: v.string(),
      spotifyUrl: v.optional(v.string()),
      isPlaying: v.boolean(),
      playedAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const status = await ctx.db
      .query("listeningStatus")
      .withIndex("by_source", (q) => q.eq("source", "spotify"))
      .unique();

    if (!status) {
      return null;
    }

    return {
      trackName: status.trackName,
      spotifyUrl: status.spotifyUrl,
      isPlaying: status.isPlaying,
      playedAt: status.playedAt,
      updatedAt: status.updatedAt,
    };
  },
});

export const upsertSpotifyStatus = internalMutation({
  args: {
    trackName: v.string(),
    spotifyUrl: v.optional(v.string()),
    isPlaying: v.boolean(),
    playedAt: v.number(),
  },
  handler: async (ctx, status) => {
    const existing = await ctx.db
      .query("listeningStatus")
      .withIndex("by_source", (q) => q.eq("source", "spotify"))
      .unique();
    const now = Date.now();

    const nextStatus = {
      source: "spotify" as const,
      trackName: status.trackName,
      spotifyUrl: status.spotifyUrl,
      isPlaying: status.isPlaying,
      playedAt: status.playedAt,
      updatedAt: now,
      lastPollError: undefined,
      lastPollErrorAt: undefined,
      nextPollAt: undefined,
      backoffLevel: undefined,
    };

    if (existing) {
      await ctx.db.patch(existing._id, nextStatus);
      return;
    }

    await ctx.db.insert("listeningStatus", nextStatus);
  },
});

export const getSpotifyPollSchedule = internalQuery({
  args: {},
  returns: v.object({
    nextPollAt: v.optional(v.number()),
  }),
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("listeningStatus")
      .withIndex("by_source", (q) => q.eq("source", "spotify"))
      .unique();
    return { nextPollAt: existing?.nextPollAt };
  },
});

export const markSpotifyPollError = internalMutation({
  args: {
    message: v.string(),
    rateLimited: v.optional(v.boolean()),
    retryAfterMs: v.optional(v.number()),
  },
  handler: async (ctx, { message, rateLimited, retryAfterMs }) => {
    const existing = await ctx.db
      .query("listeningStatus")
      .withIndex("by_source", (q) => q.eq("source", "spotify"))
      .unique();
    const now = Date.now();

    let nextPollAt: number | undefined;
    let backoffLevel: number | undefined;

    if (rateLimited) {
      const prevLevel = existing?.backoffLevel ?? 0;
      backoffLevel = Math.min(prevLevel + 1, 10);
      const exponentialMs = Math.min(BACKOFF_BASE_MS * 2 ** (backoffLevel - 1), BACKOFF_MAX_MS);
      const waitMs = Math.max(retryAfterMs ?? 0, exponentialMs);
      nextPollAt = now + waitMs;
    } else {
      backoffLevel = existing?.backoffLevel;
      nextPollAt = existing?.nextPollAt;
    }

    const patch = {
      lastPollError: message,
      lastPollErrorAt: now,
      nextPollAt,
      backoffLevel,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return;
    }

    await ctx.db.insert("listeningStatus", {
      source: "spotify",
      trackName: "",
      isPlaying: false,
      playedAt: 0,
      updatedAt: now,
      ...patch,
    });
  },
});

export const pollSpotify = internalAction({
  args: {},
  handler: async (ctx) => {
    const { nextPollAt } = await ctx.runQuery(internal.listening.getSpotifyPollSchedule, {});
    if (nextPollAt && Date.now() < nextPollAt) {
      return;
    }

    try {
      const accessToken = await refreshSpotifyAccessToken();
      const status = await getSpotifyStatus(accessToken);

      if (!status) {
        await ctx.runMutation(internal.listening.markSpotifyPollError, {
          message: "Spotify returned no current or recently played track.",
        });
        return;
      }

      await ctx.runMutation(internal.listening.upsertSpotifyStatus, status);
    } catch (error) {
      console.error(error);
      const isRateLimit = error instanceof SpotifyRateLimitError;
      await ctx.runMutation(internal.listening.markSpotifyPollError, {
        message: error instanceof Error ? error.message : "Unknown Spotify polling error.",
        rateLimited: isRateLimit,
        retryAfterMs: isRateLimit ? error.retryAfterMs : undefined,
      });
    }
  },
});

async function refreshSpotifyAccessToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Spotify Convex environment variables.");
  }

  const response = await fetch(spotifyTokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw await spotifyError(response, "Spotify token refresh failed");
  }

  const data: unknown = await response.json();

  if (!isRecord(data) || typeof data.access_token !== "string") {
    throw new Error("Spotify token refresh returned an invalid response.");
  }

  return data.access_token;
}

async function getSpotifyStatus(accessToken: string): Promise<SpotifyStatus | null> {
  const currentResponse = await fetch(spotifyCurrentlyPlayingUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (currentResponse.status !== 204) {
    if (!currentResponse.ok) {
      throw await spotifyError(currentResponse, "Spotify currently-playing failed");
    }

    const currentData: unknown = await currentResponse.json();
    const currentStatus = parseCurrentlyPlaying(currentData);

    if (currentStatus) {
      return currentStatus;
    }
  }

  const recentResponse = await fetch(spotifyRecentlyPlayedUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!recentResponse.ok) {
    throw await spotifyError(recentResponse, "Spotify recently-played failed");
  }

  const recentData: unknown = await recentResponse.json();
  return parseRecentlyPlayed(recentData);
}

function parseCurrentlyPlaying(data: unknown): SpotifyStatus | null {
  if (!isRecord(data)) {
    return null;
  }

  const current = data as CurrentlyPlayingResponse;

  if (current.is_playing !== true || !isRecord(current.item)) {
    return null;
  }

  const track = parseTrack(current.item);

  if (!track) {
    return null;
  }

  return {
    ...track,
    isPlaying: true,
    playedAt: Date.now(),
  };
}

function parseRecentlyPlayed(data: unknown): SpotifyStatus | null {
  if (!isRecord(data)) {
    return null;
  }

  const recent = data as RecentlyPlayedResponse;
  const item = recent.items?.[0];

  if (!item || typeof item.played_at !== "string") {
    return null;
  }

  const track = parseTrack(item.track);
  const playedAt = Date.parse(item.played_at);

  if (!track || Number.isNaN(playedAt)) {
    return null;
  }

  return {
    ...track,
    isPlaying: false,
    playedAt,
  };
}

function parseTrack(track: unknown) {
  if (!isRecord(track)) {
    return null;
  }

  const spotifyTrack = track as SpotifyTrack;

  if (typeof spotifyTrack.name !== "string" || spotifyTrack.name.trim() === "") {
    return null;
  }

  const spotifyUrl =
    isRecord(spotifyTrack.external_urls) && typeof spotifyTrack.external_urls.spotify === "string"
      ? spotifyTrack.external_urls.spotify
      : undefined;

  return {
    trackName: spotifyTrack.name,
    spotifyUrl,
  };
}

async function spotifyError(response: Response, fallback: string): Promise<Error> {
  const retryAfter = response.headers.get("retry-after");
  const detail = await response.text();
  const retryText = retryAfter ? ` Retry after ${retryAfter}s.` : "";
  const message = `${fallback}: ${response.status} ${response.statusText}.${retryText}${detail ? ` ${detail}` : ""}`;

  if (response.status === 429) {
    const retryAfterMs = parseRetryAfterMs(retryAfter);
    return new SpotifyRateLimitError(message, retryAfterMs);
  }

  return new Error(message);
}

function parseRetryAfterMs(retryAfter: string | null): number {
  if (!retryAfter) {
    return 0;
  }
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds)) {
    return Math.max(0, Math.ceil(seconds * 1000));
  }
  const dateMs = Date.parse(retryAfter);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }
  return 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
