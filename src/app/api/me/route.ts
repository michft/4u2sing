import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getUserProfile, upsertUserProfile } from "@/lib/memory-store";
import { getPreferredAccountName } from "@/lib/user-name";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const user = await currentUser();
  const profile = await getUserProfile({ userId });

  return NextResponse.json({
    preferredSingerName: profile.preferredSingerName,
    accountDisplayName: getPreferredAccountName(user),
  });
}

export async function PATCH(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json()) as { preferredSingerName?: unknown };
  const preferredSingerName =
    typeof payload.preferredSingerName === "string"
      ? payload.preferredSingerName.trim()
      : "";

  if (!preferredSingerName) {
    return NextResponse.json(
      { error: "Preferred singer name is required." },
      { status: 400 },
    );
  }

  await upsertUserProfile({
    userId,
    preferredSingerName,
  });

  return NextResponse.json({ ok: true });
}
