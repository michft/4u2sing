import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getMemoryOverview } from "@/lib/memory-store";
import { getStreamConfig } from "@/lib/stream-config";

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const stream = (url.searchParams.get("stream") ?? "").trim();
  const singer = (url.searchParams.get("singer") ?? "").trim() || undefined;
  const externalSongIdParam = url.searchParams.get("songId");
  const versionKey = (url.searchParams.get("versionKey") ?? "").trim() || undefined;
  const songKey = (url.searchParams.get("songKey") ?? "").trim() || undefined;

  if (!getStreamConfig(stream)) {
    return NextResponse.json({ error: "Unknown target stream." }, { status: 404 });
  }

  const externalSongId = externalSongIdParam ? Number(externalSongIdParam) : undefined;

  if (externalSongIdParam && !Number.isFinite(externalSongId)) {
    return NextResponse.json({ error: "Invalid song id." }, { status: 400 });
  }

  const overview = await getMemoryOverview({
    userId,
    stream,
    singer,
    externalSongId,
    versionKey,
    songKey,
  });

  return NextResponse.json(overview);
}
