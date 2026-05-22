import { z } from "zod";

export const searchQuerySchema = z.object({
  query: z.string().trim().min(2).max(120),
});

export const requestPayloadSchema = z.object({
  songId: z.coerce.number().int().positive(),
  singer: z.string().trim().min(1).max(60),
  artist: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(200),
  canonicalTitle: z.string().trim().min(1).max(200),
  versionLabel: z.string().trim().max(120).nullable(),
  versionKey: z.string().trim().min(1).max(200),
  query: z.string().trim().max(120).default(""),
});

export const ratingPayloadSchema = z.object({
  stream: z.string().trim().min(1).max(40),
  externalSongId: z.coerce.number().int().positive(),
  artist: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(200),
  canonicalTitle: z.string().trim().min(1).max(200),
  versionLabel: z.string().trim().max(120).nullable(),
  versionKey: z.string().trim().min(1).max(200),
  score: z.number().int().min(1).max(5),
  note: z.string().trim().max(240).default(""),
});

export const preferredSongPayloadSchema = z.object({
  stream: z.string().trim().min(1).max(40),
  externalSongId: z.coerce.number().int().positive(),
  artist: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(200),
  canonicalTitle: z.string().trim().min(1).max(200),
  versionLabel: z.string().trim().max(120).nullable(),
  versionKey: z.string().trim().min(1).max(200),
  preferenceKind: z.enum(["song", "version"]),
  preferenceKey: z.string().trim().min(1).max(200),
  preferred: z.boolean(),
});
