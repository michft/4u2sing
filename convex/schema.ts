import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  userProfiles: defineTable({
    userId: v.string(),
    preferredSingerName: v.string(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
  requests: defineTable({
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
  })
    .index("by_user", ["userId"])
    .index("by_user_stream", ["userId", "stream"])
    .index("by_user_stream_song", ["userId", "stream", "externalSongId"])
    .index("by_user_stream_version", ["userId", "stream", "versionKey"]),
  ratings: defineTable({
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
  })
    .index("by_user", ["userId"])
    .index("by_user_stream", ["userId", "stream"])
    .index("by_user_stream_song", ["userId", "stream", "externalSongId"])
    .index("by_user_stream_version", ["userId", "stream", "versionKey"]),
  preferredSongs: defineTable({
    userId: v.string(),
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
  })
    .index("by_user", ["userId"])
    .index("by_user_stream", ["userId", "stream"])
    .index("by_user_stream_preference", ["userId", "stream", "preferenceKey"]),
});
