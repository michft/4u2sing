import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { RequestCompanion } from "@/components/request-companion";
import { getUserProfile } from "@/lib/memory-store";
import { getStreamConfig, getStreamConfigs } from "@/lib/stream-config";
import { getPreferredAccountName } from "@/lib/user-name";

type Params = Promise<{ stream: string }>;

export default async function StreamPage({
  params,
}: {
  params: Params;
}) {
  const { userId } = await auth.protect();

  const user = await currentUser();
  const { stream } = await params;
  const config = getStreamConfig(stream);
  const streams = getStreamConfigs();
  const profile = await getUserProfile({ userId });

  if (!config) {
    notFound();
  }

  return (
    <RequestCompanion
      stream={{
        slug: config.slug,
        label: config.label,
      }}
      streams={streams.map((item) => ({
        slug: item.slug,
        label: item.label,
      }))}
      initialSingerName={
        profile.preferredSingerName ?? process.env.NEXT_PUBLIC_DEFAULT_REQUEST_NICKNAME ?? ""
      }
      accountDisplayName={getPreferredAccountName(user)}
    />
  );
}
