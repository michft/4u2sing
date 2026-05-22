import Link from "next/link";

import { getStreamConfigs } from "@/lib/stream-config";

export default function HomePage() {
  const streams = getStreamConfigs();

  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-3xl rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--card)] p-6 shadow-[0_24px_80px_rgba(75,39,17,0.12)] sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-[color:var(--accent-strong)]">
          4U2Sing Companion
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          Pick the live request stream
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--muted)] sm:text-base">
          This app does not replace the karaoke site. It submits into the existing queue
          and adds memory for past requests and version feedback.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {streams.map((stream) => (
            <Link
              key={stream.slug}
              href={`/${stream.slug}`}
              className="rounded-[1.5rem] border border-[color:var(--border)] bg-white px-5 py-5 transition hover:border-[color:var(--accent)] hover:bg-[color:var(--card-strong)]"
            >
              <p className="text-lg font-semibold">{stream.label}</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">/{stream.slug}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
