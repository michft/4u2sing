import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { searchLegacySongs } from "@/lib/legacy-karaoke";
import { getStreamConfig } from "@/lib/stream-config";
import { searchQuerySchema } from "@/lib/validators";

type Params = Promise<{ stream: string }>;

export async function GET(
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

  const parsed = searchQuerySchema.safeParse({
    query: new URL(request.url).searchParams.get("q") ?? "",
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Search query is too short." }, { status: 400 });
  }

  try {
    const songs = await searchLegacySongs(stream, parsed.data.query);
    return NextResponse.json({ songs });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not reach the karaoke site.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
