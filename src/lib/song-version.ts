export type SongSearchResult = {
  song_id: number;
  artist: string;
  title: string;
};

export type ParsedSongVersion = {
  canonicalTitle: string;
  versionLabel: string | null;
  versionKey: string;
  songKey: string;
};

export function parseSongVersion(title: string): ParsedSongVersion {
  const matches = [...title.matchAll(/\(([^)]+)\)/g)];

  if (matches.length === 0) {
    const normalized = normalizeVersionKey(`${title} standard`);

    return {
      canonicalTitle: title.trim(),
      versionLabel: null,
      versionKey: normalized,
      songKey: normalizeVersionKey(title),
    };
  }

  const versionLabel = matches.map((match) => match[1].trim()).join(" / ");
  const canonicalTitle = title.replace(/\s*\([^)]+\)/g, "").trim();

  return {
    canonicalTitle,
    versionLabel,
    versionKey: normalizeVersionKey(`${canonicalTitle} ${versionLabel}`),
    songKey: normalizeVersionKey(canonicalTitle),
  };
}

function normalizeVersionKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
