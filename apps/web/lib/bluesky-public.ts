/** Transient search against Bluesky's public AppView; snippets are for browser-only review, never citations. */
export type BlueskyPostCitation = {
  uri: string;
  url: string;
  title: string;
  authorHandle: string;
  publishedAt: string;
  language: string;
  transientPreview: string;
};

type SearchResponse = {
  posts?: Array<{
    uri?: string;
    record?: { text?: string; createdAt?: string; langs?: string[] };
    author?: { handle?: string };
    indexedAt?: string;
  }>;
};

const MAX_RESULTS = 25;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export async function searchBlueskyPosts(
  query: string,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
): Promise<BlueskyPostCitation[]> {
  const term = query.trim();
  if (term.length < 2 || term.length > 100) throw new Error("Enter a search phrase with 2–100 characters.");
  // Search itself is currently served unauthenticated from api.bsky.app;
  // public.api.bsky.app returns 403 for this method.
  const endpoint = new URL("https://api.bsky.app/xrpc/app.bsky.feed.searchPosts");
  endpoint.search = new URLSearchParams({ q: term, limit: String(MAX_RESULTS), sort: "latest" }).toString();
  const response = await fetcher(endpoint, { headers: { accept: "application/json" } });
  if (response.status === 429) throw new Error("Bluesky is rate-limiting public search. Try again later.");
  if (!response.ok) throw new Error("Bluesky public search is temporarily unavailable.");
  const body = await response.json() as SearchResponse;
  if (!Array.isArray(body.posts)) return [];
  const minTime = now - MAX_AGE_MS;
  return body.posts.flatMap((post) => {
    const uri = post.uri;
    const handle = post.author?.handle?.trim();
    const publishedAt = post.record?.createdAt ?? post.indexedAt;
    const time = publishedAt ? Date.parse(publishedAt) : NaN;
    const text = post.record?.text?.replace(/\s+/g, " ").trim();
    if (!uri || !handle || !text || !Number.isFinite(time) || time < minTime || time > now) return [];
    const match = uri.match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/]+)$/);
    if (!match) return [];
    const url = `https://bsky.app/profile/${encodeURIComponent(handle)}/post/${encodeURIComponent(match[2])}`;
    return [{
      uri,
      url,
      // Content is never returned to callers or retained in the brief.
      title: `Public Bluesky post by @${handle}`,
      authorHandle: handle,
      publishedAt: new Date(time).toISOString(),
      language: post.record?.langs?.[0] ?? "not provided",
      // Displayed only in live browser results; callers strip this before selecting a citation.
      transientPreview: Array.from(text).slice(0, 300).join(""),
    }];
  });
}
