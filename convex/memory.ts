import { v } from "convex/values";
import { mutationGeneric, queryGeneric } from "convex/server";

export const getOverview = queryGeneric({
  args: {
    userId: v.string(),
    stream: v.string(),
    singer: v.optional(v.string()),
    externalSongId: v.optional(v.number()),
    versionKey: v.optional(v.string()),
    songKey: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    recentRequests: v.array(
      v.object({
        id: v.string(),
        stream: v.string(),
        externalSongId: v.number(),
        artist: v.string(),
        title: v.string(),
        canonicalTitle: v.string(),
        versionLabel: v.union(v.string(), v.null()),
        versionKey: v.string(),
        singer: v.string(),
        requestedAt: v.number(),
      }),
    ),
    ratings: v.array(
      v.object({
        id: v.string(),
        stream: v.string(),
        externalSongId: v.number(),
        artist: v.string(),
        title: v.string(),
        canonicalTitle: v.string(),
        versionLabel: v.union(v.string(), v.null()),
        versionKey: v.string(),
        score: v.number(),
        note: v.string(),
        createdAt: v.number(),
      }),
    ),
    preferredSongs: v.array(
      v.object({
        id: v.string(),
        stream: v.string(),
        preferenceKind: v.union(v.literal("song"), v.literal("version")),
        preferenceKey: v.string(),
        externalSongId: v.number(),
        artist: v.string(),
        title: v.string(),
        canonicalTitle: v.string(),
        versionLabel: v.union(v.string(), v.null()),
        versionKey: v.string(),
        addedAt: v.number(),
      }),
    ),
    nicknameHistory: v.array(
      v.object({
        id: v.string(),
        stream: v.string(),
        externalSongId: v.number(),
        artist: v.string(),
        title: v.string(),
        canonicalTitle: v.string(),
        versionLabel: v.union(v.string(), v.null()),
        versionKey: v.string(),
        singer: v.string(),
        requestedAt: v.number(),
      }),
    ),
    averageScore: v.union(v.number(), v.null()),
    requestCount: v.number(),
    isPreferredVersion: v.boolean(),
    isPreferredSong: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const requestCandidates = await ctx.db.query("requests").order("desc").take(200);
    const ratingCandidates = await ctx.db.query("ratings").order("desc").take(200);
    const preferredCandidates = await ctx.db.query("preferredSongs").order("desc").take(200);

    const recentRequests = requestCandidates
      .filter((request) => {
        if (request.userId !== args.userId || request.stream !== args.stream) {
          return false;
        }

        if (
          typeof args.externalSongId === "number" &&
          request.externalSongId !== args.externalSongId
        ) {
          return false;
        }

        if (args.versionKey && request.versionKey !== args.versionKey) {
          return false;
        }

        return true;
      })
      .slice(0, args.limit ?? 8)
      .map((request) => ({
        id: String(request._id),
        stream: request.stream,
        externalSongId: request.externalSongId,
        artist: request.artist,
        title: request.title,
        canonicalTitle: request.canonicalTitle,
        versionLabel: request.versionLabel,
        versionKey: request.versionKey,
        singer: request.singer,
        requestedAt: request.requestedAt,
      }));

    const nicknameHistory = requestCandidates
      .filter((request) => {
        if (request.userId !== args.userId || request.stream !== args.stream) {
          return false;
        }

        if (!args.singer) {
          return false;
        }

        return request.singer.toLowerCase() === args.singer.toLowerCase();
      })
      .slice(0, args.limit ?? 8)
      .map((request) => ({
        id: String(request._id),
        stream: request.stream,
        externalSongId: request.externalSongId,
        artist: request.artist,
        title: request.title,
        canonicalTitle: request.canonicalTitle,
        versionLabel: request.versionLabel,
        versionKey: request.versionKey,
        singer: request.singer,
        requestedAt: request.requestedAt,
      }));

    const ratings = ratingCandidates
      .filter((rating) => {
        if (rating.userId !== args.userId || rating.stream !== args.stream) {
          return false;
        }

        if (
          typeof args.externalSongId === "number" &&
          rating.externalSongId !== args.externalSongId
        ) {
          return false;
        }

        if (args.versionKey && rating.versionKey !== args.versionKey) {
          return false;
        }

        return true;
      })
      .slice(0, args.limit ?? 8)
      .map((rating) => ({
        id: String(rating._id),
        stream: rating.stream,
        externalSongId: rating.externalSongId,
        artist: rating.artist,
        title: rating.title,
        canonicalTitle: rating.canonicalTitle,
        versionLabel: rating.versionLabel,
        versionKey: rating.versionKey,
        score: rating.score,
        note: rating.note,
        createdAt: rating.createdAt,
      }));

    const allPreferredSongs = preferredCandidates.filter(
      (favorite) => favorite.userId === args.userId && favorite.stream === args.stream,
    );

    const preferredSongs = allPreferredSongs
      .slice(0, args.limit ?? 8)
      .map((favorite) => ({
        id: String(favorite._id),
        stream: favorite.stream,
        preferenceKind: favorite.preferenceKind,
        preferenceKey: favorite.preferenceKey,
        externalSongId: favorite.externalSongId,
        artist: favorite.artist,
        title: favorite.title,
        canonicalTitle: favorite.canonicalTitle,
        versionLabel: favorite.versionLabel,
        versionKey: favorite.versionKey,
        addedAt: favorite.addedAt,
      }));

    const averageScore =
      ratings.length === 0
        ? null
        : ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length;

    const isPreferredVersion = Boolean(
      args.versionKey &&
        allPreferredSongs.some(
          (favorite) =>
            favorite.preferenceKind === "version" &&
            favorite.preferenceKey === args.versionKey,
        ),
    );

    const isPreferredSong = Boolean(
      args.songKey &&
        allPreferredSongs.some(
          (favorite) =>
            favorite.preferenceKind === "song" &&
            favorite.preferenceKey === args.songKey,
        ),
    );

    return {
      recentRequests,
      ratings,
      preferredSongs,
      nicknameHistory,
      averageScore,
      requestCount: recentRequests.length,
      isPreferredVersion,
      isPreferredSong,
    };
  },
});

export const recordRequest = mutationGeneric({
  args: {
    userId: v.string(),
    stream: v.string(),
    externalSongId: v.number(),
    artist: v.string(),
    title: v.string(),
    canonicalTitle: v.string(),
    versionLabel: v.union(v.string(), v.null()),
    versionKey: v.string(),
    singer: v.string(),
    requestedAt: v.number(),
  },
  returns: v.object({ id: v.string() }),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("requests", args);

    return { id: String(id) };
  },
});

export const recordRating = mutationGeneric({
  args: {
    userId: v.string(),
    stream: v.string(),
    externalSongId: v.number(),
    artist: v.string(),
    title: v.string(),
    canonicalTitle: v.string(),
    versionLabel: v.union(v.string(), v.null()),
    versionKey: v.string(),
    score: v.number(),
    note: v.string(),
    createdAt: v.number(),
  },
  returns: v.object({ id: v.string() }),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("ratings", args);

    return { id: String(id) };
  },
});

export const getUserProfile = queryGeneric({
  args: {
    userId: v.string(),
  },
  returns: v.object({
    preferredSingerName: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const profiles = await ctx.db.query("userProfiles").collect();
    const profile = profiles.find((item) => item.userId === args.userId) ?? null;

    return {
      preferredSingerName: profile?.preferredSingerName ?? null,
    };
  },
});

export const upsertUserProfile = mutationGeneric({
  args: {
    userId: v.string(),
    preferredSingerName: v.string(),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const profiles = await ctx.db.query("userProfiles").collect();
    const existing = profiles.find((item) => item.userId === args.userId) ?? null;

    if (existing) {
      await ctx.db.patch(existing._id, {
        preferredSingerName: args.preferredSingerName,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("userProfiles", {
        userId: args.userId,
        preferredSingerName: args.preferredSingerName,
        updatedAt: Date.now(),
      });
    }

    return { ok: true };
  },
});

export const setPreferredSong = mutationGeneric({
  args: {
    userId: v.string(),
    stream: v.string(),
    externalSongId: v.number(),
    artist: v.string(),
    title: v.string(),
    canonicalTitle: v.string(),
    versionLabel: v.union(v.string(), v.null()),
    versionKey: v.string(),
    preferenceKind: v.union(v.literal("song"), v.literal("version")),
    preferenceKey: v.string(),
    preferred: v.boolean(),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const existing = (await ctx.db.query("preferredSongs").collect()).find(
      (item) =>
        item.userId === args.userId &&
        item.stream === args.stream &&
        item.preferenceKey === args.preferenceKey,
    );

    if (args.preferred) {
      if (!existing) {
        await ctx.db.insert("preferredSongs", {
          userId: args.userId,
          stream: args.stream,
          externalSongId: args.externalSongId,
          artist: args.artist,
          title: args.title,
          canonicalTitle: args.canonicalTitle,
          versionLabel: args.versionLabel,
          versionKey: args.versionKey,
          preferenceKind: args.preferenceKind,
          preferenceKey: args.preferenceKey,
          addedAt: Date.now(),
        });
      }
    } else if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { ok: true };
  },
});
