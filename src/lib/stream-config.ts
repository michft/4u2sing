export type StreamConfig = {
  slug: string;
  label: string;
  baseUrl: string;
  searchPath: string;
  submitPath: string;
};

const DEFAULT_STREAMS: StreamConfig[] = [
  {
    slug: "arran",
    label: "Arran",
    baseUrl: "https://4u2sing.com.au/arran",
    searchPath: "livesearch.php",
    submitPath: "submitreq-run.php",
  },
  {
    slug: "phil",
    label: "Phil",
    baseUrl: "https://4u2sing.com.au/phil",
    searchPath: "livesearch.php",
    submitPath: "submitreq-run.php",
  },
];

export function getStreamConfigs(): StreamConfig[] {
  return DEFAULT_STREAMS;
}

export function getStreamConfig(slug: string): StreamConfig | null {
  return DEFAULT_STREAMS.find((stream) => stream.slug === slug) ?? null;
}
