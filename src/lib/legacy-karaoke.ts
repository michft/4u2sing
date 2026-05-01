import { getStreamConfig } from "@/lib/stream-config";
import type { SongSearchResult } from "@/lib/song-version";

export async function searchLegacySongs(
  stream: string,
  query: string,
): Promise<SongSearchResult[]> {
  const config = getStreamConfig(stream);

  if (!config) {
    throw new Error("Unknown target stream.");
  }

  const rawResults = await fetchSearchResults(config.baseUrl, config.searchPath, query);

  if (rawResults.length > 0) {
    return rawResults;
  }

  const tokens = tokenizeSearchQuery(query);

  if (tokens.length < 2) {
    return rawResults;
  }

  const fallbackQueries = buildFallbackQueries(tokens);
  const fallbackResults = await Promise.all(
    fallbackQueries.map((fallbackQuery) =>
      fetchSearchResults(config.baseUrl, config.searchPath, fallbackQuery),
    ),
  );

  return rankMergedResults(fallbackResults.flat(), tokens);
}

export async function submitLegacyRequest(input: {
  stream: string;
  songId: number;
  singer: string;
  query: string;
}): Promise<{ success: boolean; confirmationTitle: string | null; errorMessage: string | null }> {
  const config = getStreamConfig(input.stream);

  if (!config) {
    throw new Error("Unknown target stream.");
  }

  const submitPageUrl = new URL("submitreq.php", `${config.baseUrl}/`);
  submitPageUrl.searchParams.set("id", String(input.songId));

  const bootstrapResponse = await fetch(submitPageUrl, {
    method: "GET",
    headers: {
      accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
  });

  if (!bootstrapResponse.ok) {
    throw new Error(`Legacy submit bootstrap failed with ${bootstrapResponse.status}.`);
  }

  const sessionCookie = bootstrapResponse.headers.get("set-cookie");
  const bootstrapHtml = await bootstrapResponse.text();

  if (/submission failed/i.test(bootstrapHtml)) {
    return {
      success: false,
      confirmationTitle: extractHtmlTitle(bootstrapHtml),
      errorMessage: extractFailureMessage(bootstrapHtml) ?? "The karaoke site refused the request before submission.",
    };
  }

  const url = new URL(config.submitPath, `${config.baseUrl}/`);
  const body = new URLSearchParams({
    song_id: String(input.songId),
    singer: input.singer,
    q: input.query,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...(sessionCookie ? { cookie: sessionCookie.split(";")[0] } : {}),
      referer: submitPageUrl.toString(),
      origin: submitPageUrl.origin,
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Legacy submit failed with ${response.status}.`);
  }

  const html = await response.text();
  const confirmationTitle = extractHtmlTitle(html);
  const failed = /submission failed/i.test(confirmationTitle ?? "") || /submission failed/i.test(html);

  return {
    success: !failed && /thank|request|submitted|added/i.test(html),
    confirmationTitle,
    errorMessage: failed ? extractFailureMessage(html) ?? confirmationTitle : null,
  };
}

function extractHtmlTitle(html: string): string | null {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  return titleMatch?.[1]?.trim() ?? null;
}

function extractFailureMessage(html: string): string | null {
  const headingMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const paragraphMatch = html.match(/<p[^>]*>([^<]+)<\/p>/i);

  return headingMatch?.[1]?.trim() ?? paragraphMatch?.[1]?.trim() ?? null;
}

async function fetchSearchResults(
  baseUrl: string,
  searchPath: string,
  query: string,
): Promise<SongSearchResult[]> {
  const url = new URL(searchPath, `${baseUrl}/`);
  url.searchParams.set("q", query);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json,text/plain,*/*",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Legacy search failed with ${response.status}.`);
  }

  const payload = (await response.json()) as SongSearchResult[];

  return Array.isArray(payload) ? payload : [];
}

function tokenizeSearchQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function buildFallbackQueries(tokens: string[]): string[] {
  const queries = new Set<string>();

  for (const token of tokens) {
    queries.add(token);
  }

  for (let index = 0; index < tokens.length - 1; index += 1) {
    queries.add(`${tokens[index]} ${tokens[index + 1]}`);
  }

  return [...queries].slice(0, 6);
}

function rankMergedResults(
  results: SongSearchResult[],
  tokens: string[],
): SongSearchResult[] {
  const deduped = new Map<number, SongSearchResult>();

  for (const result of results) {
    deduped.set(result.song_id, result);
  }

  return [...deduped.values()].sort((left, right) => {
    const leftScore = scoreSearchResult(left, tokens);
    const rightScore = scoreSearchResult(right, tokens);

    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    return left.artist.localeCompare(right.artist) || left.title.localeCompare(right.title);
  });
}

function scoreSearchResult(result: SongSearchResult, tokens: string[]): number {
  const haystack = `${result.artist} ${result.title}`.toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += 2;
    }

    if (haystack.replaceAll(/\s+/g, "").includes(token.replaceAll(/\s+/g, ""))) {
      score += 1;
    }
  }

  return score;
}
