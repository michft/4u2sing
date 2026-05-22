import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { setPreferredSong } from "@/lib/memory-store";
import { getStreamConfig } from "@/lib/stream-config";
import { preferredSongPayloadSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = preferredSongPayloadSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid preferred-song payload." }, { status: 400 });
  }

  if (!getStreamConfig(payload.data.stream)) {
    return NextResponse.json({ error: "Unknown target stream." }, { status: 404 });
  }

  await setPreferredSong({
    userId,
    stream: payload.data.stream,
    externalSongId: payload.data.externalSongId,
    artist: payload.data.artist,
    title: payload.data.title,
    canonicalTitle: payload.data.canonicalTitle,
    versionLabel: payload.data.versionLabel,
    versionKey: payload.data.versionKey,
    preferenceKind: payload.data.preferenceKind,
    preferenceKey: payload.data.preferenceKey,
    preferred: payload.data.preferred,
  });

  return NextResponse.json({ ok: true });
}
