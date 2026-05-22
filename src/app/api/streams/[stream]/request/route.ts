import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { submitLegacyRequest } from "@/lib/legacy-karaoke";
import { recordRequestMemory } from "@/lib/memory-store";
import { getStreamConfig } from "@/lib/stream-config";
import { requestPayloadSchema } from "@/lib/validators";

type Params = Promise<{ stream: string }>;

export async function POST(
  request: Request,
  context: { params: Params },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { stream } = await context.params;

  if (!getStreamConfig(stream)) {
    return NextResponse.json({ error: "Unknown target stream." }, { status: 404 });
  }

  const payload = requestPayloadSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  try {
    const result = await submitLegacyRequest({
      stream,
      songId: payload.data.songId,
      singer: payload.data.singer,
      query: payload.data.query,
    });

    await recordRequestMemory({
      userId,
      stream,
      externalSongId: payload.data.songId,
      artist: payload.data.artist,
      title: payload.data.title,
      canonicalTitle: payload.data.canonicalTitle,
      versionLabel: payload.data.versionLabel,
      versionKey: payload.data.versionKey,
      singer: payload.data.singer,
      requestedAt: Date.now(),
    });

    return NextResponse.json({
      ok: true,
      remoteConfirmed: result.success,
      confirmationTitle: result.confirmationTitle,
      warning: result.success ? null : result.errorMessage,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not submit the request.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
