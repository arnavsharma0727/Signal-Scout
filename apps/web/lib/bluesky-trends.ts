export type BlueskyTrend = {
  topic: string;
  category: string | null;
  postCount: number | null;
  startedAt: string | null;
  feedUrl: string | null;
};

type TrendsResponse = {
  trends?: unknown;
};

const ENDPOINT = "https://public.api.bsky.app/xrpc/app.bsky.unspecced.getTrends";
const MAX_TRENDS = 25;

/** Fetch Bluesky's current provider-ranked trend labels for discovery only. */
export async function fetchBlueskyTrends(fetcher: typeof fetch = fetch): Promise<BlueskyTrend[]> {
  const endpoint = new URL(ENDPOINT);
  endpoint.searchParams.set("limit", String(MAX_TRENDS));

  const response = await fetcher(endpoint, { headers: { accept: "application/json" } });
  if (response.status === 429) throw new Error("Bluesky is rate-limiting trend requests. Try again later.");
  if (!response.ok) throw new Error("Bluesky trends are temporarily unavailable.");

  const body = await response.json() as TrendsResponse;
  if (!Array.isArray(body.trends)) return [];

  return body.trends.flatMap((value): BlueskyTrend[] => {
    if (!value || typeof value !== "object") return [];
    const trend = value as Record<string, unknown>;
    const topic = typeof trend.displayName === "string" ? trend.displayName.trim() : "";
    if (!topic || topic.length > 240) return [];

    let feedUrl: string | null = null;
    if (typeof trend.link === "string" && trend.link.startsWith("/profile/")) {
      const candidate = new URL(trend.link, "https://bsky.app");
      if (candidate.origin === "https://bsky.app") feedUrl = candidate.toString();
    }
    const started = typeof trend.startedAt === "string" ? Date.parse(trend.startedAt) : NaN;

    return [{
      topic,
      category: typeof trend.category === "string" && trend.category.trim() ? trend.category.trim() : null,
      postCount: typeof trend.postCount === "number" && Number.isFinite(trend.postCount) && trend.postCount >= 0
        ? trend.postCount
        : null,
      startedAt: Number.isFinite(started) ? new Date(started).toISOString() : null,
      feedUrl,
    }];
  }).slice(0, MAX_TRENDS);
}
