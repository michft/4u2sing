import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

type RequestMemory = {
  id: string;
  stream: string;
  externalSongId: number;
  artist: string;
  title: string;
  canonicalTitle: string;
  versionLabel: string | null;
  versionKey: string;
  singer: string;
  requestedAt: number;
};

type RatingMemory = {
  id: string;
  stream: string;
  externalSongId: number;
  artist: string;
  title: string;
  canonicalTitle: string;
  versionLabel: string | null;
  versionKey: string;
  score: number;
  note: string;
  createdAt: number;
};

type PreferredSongMemory = {
  id: string;
  stream: string;
  preferenceKind: "song" | "version";
  preferenceKey: string;
  externalSongId: number;
  artist: string;
  title: string;
  canonicalTitle: string;
  versionLabel: string | null;
  versionKey: string;
  addedAt: number;
};

type OverviewResult = {
  recentRequests: RequestMemory[];
  ratings: RatingMemory[];
  preferredSongs: PreferredSongMemory[];
  nicknameHistory: RequestMemory[];
  averageScore: number | null;
  requestCount: number;
  isPreferredVersion: boolean;
  isPreferredSong: boolean;
};

type RequestMemoryInput = Omit<RequestMemory, "id"> & {
  userId: string;
};

type RatingMemoryInput = Omit<RatingMemory, "id"> & {
  userId: string;
};

type UserProfileResult = {
  preferredSingerName: string | null;
};

const requestOverviewRef = makeFunctionReference<
  "query",
  {
    userId: string;
    stream: string;
    singer?: string;
    externalSongId?: number;
    versionKey?: string;
    songKey?: string;
    limit?: number;
  },
  OverviewResult
>("memory:getOverview");

const recordRequestRef = makeFunctionReference<
  "mutation",
  {
    userId: string;
    stream: string;
    externalSongId: number;
    artist: string;
    title: string;
    canonicalTitle: string;
    versionLabel: string | null;
    versionKey: string;
    singer: string;
    requestedAt: number;
  },
  { id: string }
>("memory:recordRequest");

const recordRatingRef = makeFunctionReference<
  "mutation",
  {
    userId: string;
    stream: string;
    externalSongId: number;
    artist: string;
    title: string;
    canonicalTitle: string;
    versionLabel: string | null;
    versionKey: string;
    score: number;
    note: string;
    createdAt: number;
  },
  { id: string }
>("memory:recordRating");
const getUserProfileRef = makeFunctionReference<
  "query",
  { userId: string },
  UserProfileResult
>("memory:getUserProfile");

const upsertUserProfileRef = makeFunctionReference<
  "mutation",
  { userId: string; preferredSingerName: string },
  { ok: boolean }
>("memory:upsertUserProfile");

const setPreferredSongRef = makeFunctionReference<
  "mutation",
  {
    userId: string;
    stream: string;
    externalSongId: number;
    artist: string;
    title: string;
    canonicalTitle: string;
    versionLabel: string | null;
    versionKey: string;
    preferenceKind: "song" | "version";
    preferenceKey: string;
    preferred: boolean;
  },
  { ok: boolean }
>("memory:setPreferredSong");

function getConvexClient(): ConvexHttpClient | null {
  const deploymentUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!deploymentUrl) {
    return null;
  }

  return new ConvexHttpClient(deploymentUrl);
}

export async function getMemoryOverview(input: {
  userId: string;
  stream: string;
  singer?: string;
  externalSongId?: number;
  versionKey?: string;
  songKey?: string;
  limit?: number;
}): Promise<OverviewResult> {
  const convex = getConvexClient();

  if (!convex) {
    return {
      recentRequests: [],
      ratings: [],
      preferredSongs: [],
      nicknameHistory: [],
      averageScore: null,
      requestCount: 0,
      isPreferredVersion: false,
      isPreferredSong: false,
    };
  }

  return convex.query(requestOverviewRef, input);
}

export async function recordRequestMemory(
  input: RequestMemoryInput,
): Promise<void> {
  const convex = getConvexClient();

  if (!convex) {
    return;
  }

  await convex.mutation(recordRequestRef, input);
}

export async function recordRatingMemory(
  input: RatingMemoryInput,
): Promise<void> {
  const convex = getConvexClient();

  if (!convex) {
    return;
  }

  await convex.mutation(recordRatingRef, input);
}

export async function getUserProfile(input: {
  userId: string;
}): Promise<UserProfileResult> {
  const convex = getConvexClient();

  if (!convex) {
    return { preferredSingerName: null };
  }

  return convex.query(getUserProfileRef, input);
}

export async function upsertUserProfile(input: {
  userId: string;
  preferredSingerName: string;
}): Promise<void> {
  const convex = getConvexClient();

  if (!convex) {
    return;
  }

  await convex.mutation(upsertUserProfileRef, input);
}

export async function setPreferredSong(input: {
  userId: string;
  stream: string;
  externalSongId: number;
  artist: string;
  title: string;
  canonicalTitle: string;
  versionLabel: string | null;
  versionKey: string;
  preferenceKind: "song" | "version";
  preferenceKey: string;
  preferred: boolean;
}): Promise<void> {
  const convex = getConvexClient();

  if (!convex) {
    return;
  }

  await convex.mutation(setPreferredSongRef, input);
}
