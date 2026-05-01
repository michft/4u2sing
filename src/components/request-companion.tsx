"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { parseSongVersion, type SongSearchResult } from "@/lib/song-version";

type StreamPageProps = {
  stream: {
    slug: string;
    label: string;
  };
  streams: Array<{
    slug: string;
    label: string;
  }>;
  initialSingerName: string;
  accountDisplayName: string;
};

type MemoryOverview = {
  recentRequests: Array<{
    id: string;
    singer: string;
    title: string;
    versionLabel: string | null;
    requestedAt: number;
  }>;
  ratings: Array<{
    id: string;
    score: number;
    note: string;
    createdAt: number;
  }>;
  preferredSongs: Array<{
    id: string;
    preferenceKind: "song" | "version";
    preferenceKey: string;
    externalSongId: number;
    artist: string;
    canonicalTitle: string;
    versionLabel: string | null;
    versionKey: string;
    addedAt: number;
  }>;
  nicknameHistory: Array<{
    id: string;
    externalSongId: number;
    artist: string;
    canonicalTitle: string;
    versionLabel: string | null;
    requestedAt: number;
  }>;
  averageScore: number | null;
  requestCount: number;
  isPreferredVersion: boolean;
  isPreferredSong: boolean;
};

const INITIAL_OVERVIEW: MemoryOverview = {
  recentRequests: [],
  ratings: [],
  preferredSongs: [],
  nicknameHistory: [],
  averageScore: null,
  requestCount: 0,
  isPreferredVersion: false,
  isPreferredSong: false,
};

export function RequestCompanion({
  stream,
  streams,
  initialSingerName,
  accountDisplayName,
}: StreamPageProps) {
  const [query, setQuery] = useState("");
  const [singer, setSinger] = useState(initialSingerName);
  const [results, setResults] = useState<SongSearchResult[]>([]);
  const [selectedSong, setSelectedSong] = useState<SongSearchResult | null>(null);
  const [overview, setOverview] = useState<MemoryOverview>(INITIAL_OVERVIEW);
  const [ratingNote, setRatingNote] = useState("");
  const [ratingScore, setRatingScore] = useState(4);
  const [profileState, setProfileState] = useState<"idle" | "saving" | "done" | "error">(
    "idle",
  );
  const [preferredState, setPreferredState] = useState<"idle" | "saving" | "done" | "error">(
    "idle",
  );
  const [showRatingEditor, setShowRatingEditor] = useState(false);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "error">("idle");
  const [requestState, setRequestState] = useState<"idle" | "saving" | "done" | "error">(
    "idle",
  );
  const [ratingState, setRatingState] = useState<"idle" | "saving" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        setSearchState("idle");
        return;
      }

      setSearchState("loading");

      try {
        const response = await fetch(
          `/api/streams/${stream.slug}/search?q=${encodeURIComponent(query.trim())}`,
        );
        const payload = (await response.json()) as { songs?: SongSearchResult[]; error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Search failed.");
        }

        setResults(payload.songs ?? []);
        setSearchState("idle");
      } catch (error) {
        setResults([]);
        setSearchState("error");
        setMessage(error instanceof Error ? error.message : "Search failed.");
      }
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [query, stream.slug]);

  useEffect(() => {
    void (async () => {
      const params = new URLSearchParams({ stream: stream.slug });
      const trimmedSinger = singer.trim();

      if (trimmedSinger) {
        params.set("singer", trimmedSinger);
      }

      const response = await fetch(`/api/memory/overview?${params.toString()}`);
      const payload = (await response.json()) as MemoryOverview;
      setOverview(payload);
    })();
  }, [singer, stream.slug]);

  const selectedVersion = useMemo(() => {
    if (!selectedSong) {
      return null;
    }

    return parseSongVersion(selectedSong.title);
  }, [selectedSong]);

  async function loadOverview(song?: SongSearchResult) {
    const activeSong = song ?? selectedSong;
    const params = new URLSearchParams({ stream: stream.slug });
    const trimmedSinger = singer.trim();

    if (trimmedSinger) {
      params.set("singer", trimmedSinger);
    }

    if (activeSong) {
      const parsed = parseSongVersion(activeSong.title);
      params.set("songId", String(activeSong.song_id));
      params.set("versionKey", parsed.versionKey);
      params.set("songKey", parsed.songKey);
    }

    const response = await fetch(`/api/memory/overview?${params.toString()}`);
    const payload = (await response.json()) as MemoryOverview;
    setOverview(payload);
  }

  async function submitRequest(song: SongSearchResult) {
    const parsed = parseSongVersion(song.title);
    const trimmedSinger = singer.trim();

    if (!trimmedSinger) {
      setMessage("Enter a singer name before sending the request.");
      setRequestState("error");
      return;
    }

    setSelectedSong(song);
    setRequestState("saving");
    setShowRatingEditor(false);
    setMessage(null);

    const response = await fetch(`/api/streams/${stream.slug}/request`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        songId: song.song_id,
        singer: trimmedSinger,
        artist: song.artist,
        title: song.title,
        canonicalTitle: parsed.canonicalTitle,
        versionLabel: parsed.versionLabel,
        versionKey: parsed.versionKey,
        query: query.trim(),
      }),
    });

    const payload = (await response.json()) as {
      ok?: boolean;
      remoteConfirmed?: boolean;
      confirmationTitle?: string | null;
      warning?: string | null;
      error?: string;
    };

    if (!response.ok) {
      setRequestState("error");
      setMessage(payload.error ?? "Request failed.");
      return;
    }

    await fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        preferredSingerName: trimmedSinger,
      }),
    });

    setRequestState("done");
    setMessage(
      payload.remoteConfirmed === false
        ? "Request recorded here and submitted to the karaoke site. The remote confirmation text looked unreliable."
        : payload.confirmationTitle ?? "Request sent to the karaoke queue.",
    );
    await loadOverview(song);
  }

  async function submitRating() {
    if (!selectedSong || !selectedVersion) {
      return;
    }

    setRatingState("saving");

    const response = await fetch("/api/memory/rating", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        stream: stream.slug,
        externalSongId: selectedSong.song_id,
        artist: selectedSong.artist,
        title: selectedSong.title,
        canonicalTitle: selectedVersion.canonicalTitle,
        versionLabel: selectedVersion.versionLabel,
        versionKey: selectedVersion.versionKey,
        score: ratingScore,
        note: ratingNote.trim(),
      }),
    });

    if (!response.ok) {
      setRatingState("error");
      setMessage("Could not save that version rating.");
      return;
    }

    setRatingNote("");
    setRatingState("done");
    await loadOverview(selectedSong);
  }

  async function saveNickname() {
    const trimmedSinger = singer.trim();

    if (!trimmedSinger) {
      setProfileState("error");
      setMessage("Enter a request nickname to save it to your account.");
      return;
    }

    setProfileState("saving");

    const response = await fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        preferredSingerName: trimmedSinger,
      }),
    });

    if (!response.ok) {
      setProfileState("error");
      setMessage("Could not save your request nickname.");
      return;
    }

    setProfileState("done");
    setMessage("Request nickname saved to your account.");
  }

  async function togglePreferredSong(preferred: boolean, preferenceKind: "song" | "version") {
    if (!selectedSong || !selectedVersion) {
      return;
    }

    setPreferredState("saving");

    const response = await fetch("/api/memory/preferred", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        stream: stream.slug,
        externalSongId: selectedSong.song_id,
        artist: selectedSong.artist,
        title: selectedSong.title,
        canonicalTitle: selectedVersion.canonicalTitle,
        versionLabel: selectedVersion.versionLabel,
        versionKey: selectedVersion.versionKey,
        preferenceKind,
        preferenceKey:
          preferenceKind === "song" ? selectedVersion.songKey : selectedVersion.versionKey,
        preferred,
      }),
    });

    if (!response.ok) {
      setPreferredState("error");
      setMessage("Could not update your preferred song list.");
      return;
    }

    setPreferredState("done");
    setMessage(
      preferred
        ? preferenceKind === "song"
          ? "Added the song to your preferred songs."
          : "Added this version to your preferred songs."
        : preferenceKind === "song"
          ? "Removed the song from your preferred songs."
        : "Removed from your preferred songs.",
    );
    await loadOverview(selectedSong);
  }

  return (
    <div className="app-shell">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--card)] shadow-[0_24px_80px_rgba(75,39,17,0.12)] backdrop-blur">
          <div className="border-b border-[color:var(--border)] px-5 py-6 sm:px-8">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-[color:var(--accent-strong)]">
              4U2Sing Companion
            </p>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                  <Link
                    href="/"
                    className="rounded-full border border-[color:var(--border)] bg-white px-3 py-1.5 font-medium text-[color:var(--accent-strong)]"
                  >
                    Back to streams
                  </Link>
                  {streams.map((item) => (
                    <Link
                      key={item.slug}
                      href={`/${item.slug}`}
                      className={`rounded-full px-3 py-1.5 font-medium ${
                        item.slug === stream.slug
                          ? "bg-[color:var(--accent)] text-white"
                          : "border border-[color:var(--border)] bg-white text-[color:var(--accent-strong)]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Send requests to {stream.label}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--muted)] sm:text-base">
                  Search the live karaoke catalogue, submit the request into the existing
                  queue, and keep lightweight memory for what worked before.
                </p>
              </div>
              <div className="rounded-full border border-[color:var(--border)] bg-white/70 px-4 py-2 text-sm text-[color:var(--muted)]">
                Target stream: <span className="font-semibold text-[color:var(--foreground)]">{stream.slug}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[color:var(--muted)]">
                  Request nickname
                </span>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={singer}
                    onChange={(event) => setSinger(event.target.value)}
                    className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
                    placeholder={accountDisplayName ? `Separate from login: ${accountDisplayName}` : "Stage name or nickname"}
                  />
                  <button
                    type="button"
                    onClick={() => void saveNickname()}
                    disabled={profileState === "saving"}
                    className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Save nickname
                  </button>
                </div>
                <p className="mt-2 text-xs leading-5 text-[color:var(--muted)]">
                  This is stored separately from your login and is the name sent with song requests.
                </p>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[color:var(--muted)]">
                  Search songs
                </span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--card-strong)] px-5 py-4 text-base outline-none transition focus:border-[color:var(--accent)]"
                  placeholder="Artist, song title, or both"
                  autoComplete="off"
                />
              </label>

              <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/75 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    Search results
                  </h2>
                  <span className="text-xs text-[color:var(--muted)]">
                    {results.length} matches
                  </span>
                </div>

                <div className="space-y-3">
                  {results.map((song) => {
                    const parsed = parseSongVersion(song.title);
                    const isSelected = selectedSong?.song_id === song.song_id;

                    return (
                      <article
                        key={song.song_id}
                        className={`rounded-[1.4rem] border p-4 transition ${
                          isSelected
                            ? "border-[color:var(--accent)] bg-[color:var(--card-strong)]"
                            : "border-[color:var(--border)] bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold">{parsed.canonicalTitle}</h3>
                            <p className="text-sm text-[color:var(--muted)]">{song.artist}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSong(song);
                              setRatingNote("");
                              setRatingScore(4);
                              setShowRatingEditor(false);
                              void loadOverview(song);
                            }}
                            className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]"
                          >
                            Inspect
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[color:var(--card-strong)] px-3 py-1 text-xs font-medium text-[color:var(--accent-strong)]">
                            {parsed.versionLabel ?? "Standard version"}
                          </span>
                          <button
                            type="button"
                            onClick={() => void submitRequest(song)}
                            className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)]"
                          >
                            Request to playlist
                          </button>
                        </div>
                      </article>
                    );
                  })}

                  {searchState === "loading" ? (
                    <p className="rounded-xl bg-white px-4 py-6 text-sm text-[color:var(--muted)]">
                      Searching the live karaoke catalogue…
                    </p>
                  ) : null}

                  {searchState === "idle" && results.length === 0 && query.trim().length < 2 ? (
                    <p className="rounded-xl bg-white px-4 py-6 text-sm text-[color:var(--muted)]">
                      Start typing to search the live request list.
                    </p>
                  ) : null}

                  {searchState === "idle" && results.length === 0 && query.trim().length >= 2 ? (
                    <p className="rounded-xl bg-white px-4 py-6 text-sm text-[color:var(--muted)]">
                      No songs matched that search.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <section className="rounded-[1.6rem] border border-[color:var(--border)] bg-white/85 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Song memory</h2>
                  {overview.averageScore ? (
                    <span className="rounded-full bg-[color:var(--card-strong)] px-3 py-1 text-sm font-semibold text-[color:var(--accent-strong)]">
                      {overview.averageScore.toFixed(1)}/5
                    </span>
                  ) : null}
                </div>

                {selectedSong && selectedVersion ? (
                  <div className="mt-3">
                    <p className="font-medium">{selectedVersion.canonicalTitle}</p>
                    <p className="text-sm text-[color:var(--muted)]">{selectedSong.artist}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
                      {selectedVersion.versionLabel ?? "Standard version"}
                    </p>
                    <button
                      type="button"
                      onClick={() => void togglePreferredSong(!overview.isPreferredSong, "song")}
                      disabled={preferredState === "saving"}
                      className="mt-3 rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {overview.isPreferredSong ? "Remove song from preferred" : "Add song to preferred"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void togglePreferredSong(!overview.isPreferredVersion, "version")
                      }
                      disabled={preferredState === "saving"}
                      className="mt-3 ml-2 rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {overview.isPreferredVersion
                        ? "Remove version from preferred"
                        : "Add version to preferred"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRatingEditor((current) => !current)}
                      className="mt-3 ml-2 rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--accent-strong)]"
                    >
                      {showRatingEditor ? "Hide version rating" : "Rate version later"}
                    </button>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[color:var(--muted)]">
                    Pick a song to see remembered requests and version ratings.
                  </p>
                )}

                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl bg-[color:var(--card-strong)] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
                      Previous songs for this nickname
                    </p>
                    <div className="mt-3 space-y-2">
                      {overview.nicknameHistory.map((song) => (
                        <div key={song.id} className="rounded-xl bg-white px-3 py-3">
                          <p className="text-sm font-semibold">{song.canonicalTitle}</p>
                          <p className="text-xs text-[color:var(--muted)]">
                            {song.artist} · {song.versionLabel ?? "Standard"} · {formatDate(song.requestedAt)}
                          </p>
                        </div>
                      ))}

                      {overview.nicknameHistory.length === 0 ? (
                        <p className="text-sm text-[color:var(--muted)]">
                          Previous songs for this nickname show up here after requests. This does not affect the normal search results.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[color:var(--card-strong)] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
                      Preferred songs
                    </p>
                    <div className="mt-3 space-y-2">
                      {overview.preferredSongs.map((song) => (
                        <button
                          key={song.id}
                          type="button"
                          onClick={() => {
                            const match = results.find(
                              (result) =>
                                result.song_id === song.externalSongId &&
                                (song.preferenceKind === "song"
                                  ? parseSongVersion(result.title).songKey === song.preferenceKey
                                  : parseSongVersion(result.title).versionKey === song.preferenceKey),
                            );

                            if (match) {
                              setSelectedSong(match);
                              void loadOverview(match);
                              return;
                            }

                            setSelectedSong({
                              song_id: song.externalSongId,
                              artist: song.artist,
                              title: song.versionLabel
                                ? `${song.canonicalTitle} (${song.versionLabel})`
                                : song.canonicalTitle,
                            });
                            void loadOverview({
                              song_id: song.externalSongId,
                              artist: song.artist,
                              title: song.versionLabel
                                ? `${song.canonicalTitle} (${song.versionLabel})`
                                : song.canonicalTitle,
                            });
                          }}
                          className="block w-full rounded-xl bg-white px-3 py-3 text-left"
                        >
                          <p className="text-sm font-semibold">{song.canonicalTitle}</p>
                          <p className="text-xs text-[color:var(--muted)]">
                            {song.artist} · {song.preferenceKind === "song" ? "Any version" : song.versionLabel ?? "Standard"}
                          </p>
                        </button>
                      ))}

                      {overview.preferredSongs.length === 0 ? (
                        <p className="text-sm text-[color:var(--muted)]">
                          Save songs here after you request or inspect them. This gives you a reusable shortlist without guessing from history alone.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[color:var(--card-strong)] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
                      Recent requests
                    </p>
                    <div className="mt-3 space-y-2">
                      {overview.recentRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium">{request.singer}</p>
                            <p className="text-xs text-[color:var(--muted)]">
                              {formatDate(request.requestedAt)}
                            </p>
                          </div>
                          <span className="text-xs text-[color:var(--muted)]">
                            {request.versionLabel ?? "Standard"}
                          </span>
                        </div>
                      ))}

                      {overview.recentRequests.length === 0 ? (
                        <p className="text-sm text-[color:var(--muted)]">
                          No remembered requests yet.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {showRatingEditor ? (
                    <div className="rounded-2xl bg-[color:var(--card-strong)] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
                        Rate this listed version
                      </p>
                      <div className="mt-3 flex gap-2">
                        {[1, 2, 3, 4, 5].map((score) => (
                          <button
                            key={score}
                            type="button"
                            onClick={() => setRatingScore(score)}
                            className={`flex-1 rounded-xl px-0 py-2 text-sm font-semibold ${
                              ratingScore === score
                                ? "bg-[color:var(--accent)] text-white"
                                : "bg-white text-[color:var(--accent-strong)]"
                            }`}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={ratingNote}
                        onChange={(event) => setRatingNote(event.target.value)}
                        className="mt-3 min-h-24 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
                        placeholder="Was this version too high, too slow, bad backing, or surprisingly good?"
                      />
                      <button
                        type="button"
                        disabled={!selectedSong || ratingState === "saving"}
                        onClick={() => void submitRating()}
                        className="mt-3 w-full rounded-2xl bg-[color:var(--foreground)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Save version rating
                      </button>
                    </div>
                  ) : null}

                  <div className="rounded-2xl bg-[color:var(--card-strong)] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
                      Saved version ratings
                    </p>
                    <div className="mt-4 space-y-2">
                      {overview.ratings.map((rating) => (
                        <div key={rating.id} className="rounded-xl bg-white px-3 py-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">{rating.score}/5</span>
                            <span className="text-xs text-[color:var(--muted)]">
                              {formatDate(rating.createdAt)}
                            </span>
                          </div>
                          {rating.note ? (
                            <p className="mt-2 text-sm text-[color:var(--muted)]">{rating.note}</p>
                          ) : null}
                        </div>
                      ))}

                      {overview.ratings.length === 0 ? (
                        <p className="text-sm text-[color:var(--muted)]">
                          Rate versions later when you know whether the backing track worked.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                {message ? (
                  <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-[color:var(--accent-strong)]">
                    {message}
                  </p>
                ) : null}

                {requestState === "saving" ? (
                  <p className="mt-3 text-sm text-[color:var(--muted)]">
                    Sending the request to the live karaoke queue…
                  </p>
                ) : null}
              </section>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}
